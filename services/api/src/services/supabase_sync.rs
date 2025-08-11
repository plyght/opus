use reqwest::Client;
use serde_json::{json, Value};
use std::env;
use tracing::{error, info, warn};
use uuid::Uuid;

#[derive(Clone)]
pub struct SupabaseSync {
    client: Client,
    base_url: String,
    service_key: String,
}

impl SupabaseSync {
    pub fn new() -> Option<Self> {
        let base_url = env::var("SUPABASE_URL").ok()?;
        let service_key = env::var("SUPABASE_SERVICE_ROLE_KEY").ok()?;

        if base_url.is_empty() || service_key.is_empty() {
            warn!("Supabase credentials not configured, skipping sync");
            return None;
        }

        Some(Self {
            client: Client::new(),
            base_url: format!("{base_url}/rest/v1"),
            service_key,
        })
    }

    async fn make_request(
        &self,
        method: &str,
        endpoint: &str,
        body: Option<Value>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let url = format!("{}/{}", self.base_url, endpoint);

        let mut request = match method {
            "POST" => self.client.post(&url),
            "PATCH" => self.client.patch(&url),
            "DELETE" => self.client.delete(&url),
            _ => return Err("Unsupported HTTP method".into()),
        };

        request = request
            .header("Authorization", format!("Bearer {service_key}", service_key=self.service_key))
            .header("apikey", &self.service_key)
            .header("Content-Type", "application/json")
            .header("Prefer", "return=minimal");

        if let Some(body) = body {
            request = request.json(&body);
        }

        let response = request.send().await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            error!("Supabase sync failed: {} - {}", status, text);
            return Err(format!("Supabase sync failed: {status}").into());
        }

        Ok(())
    }

    pub async fn sync_book_update(&self, book_id: Uuid, available_copies: i32, total_copies: i32) {
        if let Err(e) = self
            .make_request(
                "PATCH",
                &format!("books?id=eq.{book_id}"),
                Some(json!({
                    "available_copies": available_copies,
                    "total_copies": total_copies,
                    "updated_at": chrono::Utc::now().to_rfc3339()
                })),
            )
            .await
        {
            error!("Failed to sync book update to Supabase: {}", e);
        } else {
            info!("Successfully synced book update to Supabase: {}", book_id);
        }
    }

    pub async fn sync_book_creation(&self, book: &crate::models::Book) {
        if let Err(e) = self
            .make_request(
                "POST",
                "books",
                Some(json!({
                    "id": book.id,
                    "isbn": book.isbn,
                    "title": book.title,
                    "author": book.author,
                    "publisher": book.publisher,
                    "published_year": book.published_year,
                    "genre": book.genre,
                    "description": book.description,
                    "cover_url": book.cover_url,
                    "total_copies": book.total_copies,
                    "available_copies": book.available_copies,
                    "created_at": book.created_at.to_rfc3339(),
                    "updated_at": book.updated_at.to_rfc3339()
                })),
            )
            .await
        {
            error!("Failed to sync book creation to Supabase: {}", e);
        } else {
            info!("Successfully synced book creation to Supabase: {}", book.id);
        }
    }

    pub async fn sync_checkout_creation(&self, checkout: &crate::models::Checkout) {
        if let Err(e) = self
            .make_request(
                "POST",
                "checkouts",
                Some(json!({
                    "id": checkout.id,
                    "user_id": checkout.user_id,
                    "book_id": checkout.book_id,
                    "status": format!("{:?}", checkout.status).to_uppercase(),
                    "checked_out_at": checkout.checked_out_at.to_rfc3339(),
                    "due_date": checkout.due_date.to_rfc3339(),
                    "returned_at": checkout.returned_at.map(|dt| dt.to_rfc3339()),
                    "renewal_count": checkout.renewal_count,
                    "max_renewals": checkout.max_renewals,
                    "overdue_email_sent": checkout.overdue_email_sent,
                    "created_at": checkout.created_at.to_rfc3339(),
                    "updated_at": checkout.updated_at.to_rfc3339()
                })),
            )
            .await
        {
            error!("Failed to sync checkout creation to Supabase: {}", e);
        } else {
            info!(
                "Successfully synced checkout creation to Supabase: {}",
                checkout.id
            );
        }
    }

    pub async fn sync_checkout_update(&self, checkout: &crate::models::Checkout) {
        if let Err(e) = self
            .make_request(
                "PATCH",
                &format!("checkouts?id=eq.{id}", id=checkout.id),
                Some(json!({
                    "status": format!("{:?}", checkout.status).to_uppercase(),
                    "due_date": checkout.due_date.to_rfc3339(),
                    "returned_at": checkout.returned_at.map(|dt| dt.to_rfc3339()),
                    "renewal_count": checkout.renewal_count,
                    "updated_at": checkout.updated_at.to_rfc3339()
                })),
            )
            .await
        {
            error!("Failed to sync checkout update to Supabase: {}", e);
        } else {
            info!(
                "Successfully synced checkout update to Supabase: {}",
                checkout.id
            );
        }
    }

    pub async fn sync_user_creation(&self, user: &crate::models::User) {
        if let Err(e) = self
            .make_request(
                "POST",
                "users",
                Some(json!({
                    "id": user.id,
                    "email": user.email,
                    "name": user.name,
                    "role": format!("{:?}", user.role).to_uppercase(),
                    "is_active": user.is_active,
                    "max_checkouts": user.max_checkouts,
                    "created_at": user.created_at.to_rfc3339(),
                    "updated_at": user.updated_at.to_rfc3339()
                })),
            )
            .await
        {
            error!("Failed to sync user creation to Supabase: {}", e);
        } else {
            info!("Successfully synced user creation to Supabase: {}", user.id);
        }
    }
}

pub fn get_supabase_sync() -> Option<SupabaseSync> {
    SupabaseSync::new()
}
