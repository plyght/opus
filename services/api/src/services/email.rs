use anyhow::Result;
use chrono::{DateTime, Utc};
use reqwest::Client;
use serde_json::json;
use sqlx::PgPool;
use tracing::{error, info};
use uuid::Uuid;

pub async fn send_overdue_notifications(db: &PgPool) -> Result<()> {
    let overdue_checkouts =
        sqlx::query_as::<_, (Uuid, DateTime<Utc>, bool, String, String, String, String)>(
            r#"
        SELECT 
            c.id as checkout_id,
            c.due_date,
            c.overdue_email_sent,
            u.name as user_name,
            u.email as user_email,
            b.title as book_title,
            b.author as book_author
        FROM checkouts c
        JOIN users u ON c.user_id = u.id
        JOIN books b ON c.book_id = b.id
        WHERE c.status = 'ACTIVE' 
        AND c.due_date < NOW()
        AND c.overdue_email_sent = false
        "#,
        )
        .fetch_all(db)
        .await?;

    let client = Client::new();
    let resend_api_key =
        std::env::var("RESEND_API_KEY").unwrap_or_else(|_| "your-resend-api-key".to_string());

    for (
        checkout_id,
        due_date,
        _overdue_email_sent,
        user_name,
        user_email,
        book_title,
        book_author,
    ) in overdue_checkouts
    {
        let email_body = json!({
            "from": "Library System <noreply@library.com>",
            "to": [user_email.clone()],
            "subject": format!("Overdue Book: {}", book_title),
            "html": format!(
                r#"
                <h2>Overdue Book Notification</h2>
                <p>Dear {},</p>
                <p>You have an overdue book:</p>
                <ul>
                    <li><strong>Title:</strong> {}</li>
                    <li><strong>Author:</strong> {}</li>
                    <li><strong>Due Date:</strong> {}</li>
                </ul>
                <p>Please return this book as soon as possible to avoid any late fees.</p>
                <p>Thank you,<br>Library Management System</p>
                "#,
                user_name,
                book_title,
                book_author,
                due_date.format("%Y-%m-%d")
            )
        });

        let response = client
            .post("https://api.resend.com/emails")
            .header("Authorization", format!("Bearer {}", resend_api_key))
            .header("Content-Type", "application/json")
            .json(&email_body)
            .send()
            .await;

        match response {
            Ok(resp) if resp.status().is_success() => {
                sqlx::query("UPDATE checkouts SET overdue_email_sent = true WHERE id = $1")
                    .bind(checkout_id)
                    .execute(db)
                    .await?;

                info!("Sent overdue notification to {}", user_email);
            }
            Ok(resp) => {
                error!("Failed to send email to {}: {}", user_email, resp.status());

                sqlx::query(
                    r#"
                    INSERT INTO overdue_email_failures (checkout_id, error_message, created_at)
                    VALUES ($1, $2, NOW())
                    "#,
                )
                .bind(checkout_id)
                .bind(format!("HTTP {}", resp.status()))
                .execute(db)
                .await?;
            }
            Err(e) => {
                error!("Network error sending email to {}: {}", user_email, e);

                sqlx::query(
                    r#"
                    INSERT INTO overdue_email_failures (checkout_id, error_message, created_at)
                    VALUES ($1, $2, NOW())
                    "#,
                )
                .bind(checkout_id)
                .bind(e.to_string())
                .execute(db)
                .await?;
            }
        }
    }

    Ok(())
}
