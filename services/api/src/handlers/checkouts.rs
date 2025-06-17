use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use chrono::{Duration, Utc};
use serde_json::{json, Value};
use sqlx::Row;
use uuid::Uuid;

use crate::{
    models::{
        Checkout, CheckoutBook, CheckoutBookRequest, CheckoutSearchQuery, CheckoutStatus,
        CheckoutUser, CheckoutWithDetails, CreateCheckoutRequest, RenewCheckoutRequest,
        ReturnBookRequest,
    },
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_checkouts).post(create_checkout))
        .route("/:id", get(get_checkout))
        .route("/checkout", post(checkout_book))
        .route("/return", post(return_book))
        .route("/renew", post(renew_checkout))
        .route("/overdue", get(get_overdue_checkouts))
        .route("/user/:user_id", get(get_user_checkouts))
}

async fn list_checkouts(
    State(state): State<AppState>,
    Query(query): Query<CheckoutSearchQuery>,
) -> Result<Json<Value>, StatusCode> {
    let limit = query.limit.unwrap_or(20).min(100);
    let offset = query.offset.unwrap_or(0);

    let mut conditions = Vec::new();
    let mut where_clause = String::new();

    if let Some(user_id) = query.user_id {
        conditions.push(format!("c.user_id = '{}'", user_id));
    }
    if let Some(book_id) = query.book_id {
        conditions.push(format!("c.book_id = '{}'", book_id));
    }
    if let Some(ref status) = query.status {
        conditions.push(format!("c.status = '{:?}'", status).to_uppercase());
    }
    if let Some(true) = query.overdue {
        conditions.push("c.due_date < NOW() AND c.status = 'ACTIVE'".to_string());
    }

    if !conditions.is_empty() {
        where_clause = format!(" WHERE {}", conditions.join(" AND "));
    }

    let count_sql = format!("SELECT COUNT(*) FROM checkouts c{}", where_clause);

    let total_count: i64 = sqlx::query(&count_sql)
        .fetch_one(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .get(0);

    let checkouts_sql = format!(
        r#"
        SELECT 
            c.*,
            u.id as user_id, u.name as user_name, u.email as user_email,
            b.id as book_id, b.title as book_title, b.author as book_author, b.isbn as book_isbn
        FROM checkouts c
        JOIN users u ON c.user_id = u.id
        JOIN books b ON c.book_id = b.id
        {}
        ORDER BY c.created_at DESC
        LIMIT {} OFFSET {}
        "#,
        where_clause, limit, offset
    );

    let rows = sqlx::query(&checkouts_sql)
        .fetch_all(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut checkouts = Vec::new();
    for row in rows {
        let checkout = Checkout {
            id: row.get("id"),
            user_id: row.get("user_id"),
            book_id: row.get("book_id"),
            status: row.get("status"),
            checked_out_at: row.get("checked_out_at"),
            due_date: row.get("due_date"),
            returned_at: row.get("returned_at"),
            renewal_count: row.get("renewal_count"),
            max_renewals: row.get("max_renewals"),
            overdue_email_sent: row.get("overdue_email_sent"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        };

        let user = CheckoutUser {
            id: row.get("user_id"),
            name: row.get("user_name"),
            email: row.get("user_email"),
        };

        let book = CheckoutBook {
            id: row.get("book_id"),
            title: row.get("book_title"),
            author: row.get("book_author"),
            isbn: row.get("book_isbn"),
        };

        checkouts.push(CheckoutWithDetails {
            checkout,
            user,
            book,
        });
    }

    let has_more = (offset + limit) < total_count;

    Ok(Json(json!({
        "items": checkouts,
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "hasMore": has_more
    })))
}

async fn get_checkout(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<CheckoutWithDetails>, StatusCode> {
    let row = sqlx::query(
        r#"
        SELECT 
            c.*,
            u.id as user_id, u.name as user_name, u.email as user_email,
            b.id as book_id, b.title as book_title, b.author as book_author, b.isbn as book_isbn
        FROM checkouts c
        JOIN users u ON c.user_id = u.id
        JOIN books b ON c.book_id = b.id
        WHERE c.id = $1
        "#,
    )
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => StatusCode::NOT_FOUND,
        _ => StatusCode::INTERNAL_SERVER_ERROR,
    })?;

    let checkout = Checkout {
        id: row.get("id"),
        user_id: row.get("user_id"),
        book_id: row.get("book_id"),
        status: row.get("status"),
        checked_out_at: row.get("checked_out_at"),
        due_date: row.get("due_date"),
        returned_at: row.get("returned_at"),
        renewal_count: row.get("renewal_count"),
        max_renewals: row.get("max_renewals"),
        overdue_email_sent: row.get("overdue_email_sent"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    };

    let user = CheckoutUser {
        id: row.get("user_id"),
        name: row.get("user_name"),
        email: row.get("user_email"),
    };

    let book = CheckoutBook {
        id: row.get("book_id"),
        title: row.get("book_title"),
        author: row.get("book_author"),
        isbn: row.get("book_isbn"),
    };

    Ok(Json(CheckoutWithDetails {
        checkout,
        user,
        book,
    }))
}

async fn get_user_checkouts(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Query(query): Query<CheckoutSearchQuery>,
) -> Result<Json<Vec<CheckoutWithDetails>>, StatusCode> {
    let limit = query.limit.unwrap_or(20).min(100);
    let offset = query.offset.unwrap_or(0);

    let mut conditions = vec![format!("c.user_id = '{}'", user_id)];

    if let Some(ref status) = query.status {
        conditions.push(format!("c.status = '{:?}'", status).to_uppercase());
    }
    if let Some(true) = query.overdue {
        conditions.push("c.due_date < NOW() AND c.status = 'ACTIVE'".to_string());
    }

    let where_clause = format!(" WHERE {}", conditions.join(" AND "));

    let checkouts_sql = format!(
        r#"
        SELECT 
            c.*,
            u.id as user_id, u.name as user_name, u.email as user_email,
            b.id as book_id, b.title as book_title, b.author as book_author, b.isbn as book_isbn
        FROM checkouts c
        JOIN users u ON c.user_id = u.id
        JOIN books b ON c.book_id = b.id
        {}
        ORDER BY c.created_at DESC
        LIMIT {} OFFSET {}
        "#,
        where_clause, limit, offset
    );

    let rows = sqlx::query(&checkouts_sql)
        .fetch_all(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut checkouts = Vec::new();
    for row in rows {
        let checkout = Checkout {
            id: row.get("id"),
            user_id: row.get("user_id"),
            book_id: row.get("book_id"),
            status: row.get("status"),
            checked_out_at: row.get("checked_out_at"),
            due_date: row.get("due_date"),
            returned_at: row.get("returned_at"),
            renewal_count: row.get("renewal_count"),
            max_renewals: row.get("max_renewals"),
            overdue_email_sent: row.get("overdue_email_sent"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        };

        let user = CheckoutUser {
            id: row.get("user_id"),
            name: row.get("user_name"),
            email: row.get("user_email"),
        };

        let book = CheckoutBook {
            id: row.get("book_id"),
            title: row.get("book_title"),
            author: row.get("book_author"),
            isbn: row.get("book_isbn"),
        };

        checkouts.push(CheckoutWithDetails {
            checkout,
            user,
            book,
        });
    }

    Ok(Json(checkouts))
}

async fn create_checkout(
    State(state): State<AppState>,
    Json(req): Json<CreateCheckoutRequest>,
) -> Result<Json<CheckoutWithDetails>, StatusCode> {
    let mut tx = state
        .db
        .begin()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let user = sqlx::query_as::<_, crate::models::User>(
        "SELECT * FROM users WHERE id = $1 AND is_active = true",
    )
    .bind(req.user_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => StatusCode::NOT_FOUND,
        _ => StatusCode::INTERNAL_SERVER_ERROR,
    })?;

    let book = sqlx::query_as::<_, crate::models::Book>("SELECT * FROM books WHERE id = $1")
        .bind(req.book_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| match e {
            sqlx::Error::RowNotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })?;

    if book.available_copies <= 0 {
        return Err(StatusCode::CONFLICT);
    }

    let active_checkouts: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM checkouts WHERE user_id = $1 AND status = 'ACTIVE'",
    )
    .bind(req.user_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if active_checkouts >= user.max_checkouts as i64 {
        return Err(StatusCode::CONFLICT);
    }

    let due_date = req
        .due_date
        .unwrap_or_else(|| Utc::now() + Duration::days(14));

    let checkout_id = Uuid::new_v4();
    let checkout = sqlx::query_as::<_, Checkout>(
        r#"
        INSERT INTO checkouts (id, user_id, book_id, due_date)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        "#,
    )
    .bind(checkout_id)
    .bind(req.user_id)
    .bind(req.book_id)
    .bind(due_date)
    .fetch_one(&mut *tx)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    sqlx::query("UPDATE books SET available_copies = available_copies - 1 WHERE id = $1")
        .bind(req.book_id)
        .execute(&mut *tx)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    tx.commit()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let checkout_user = CheckoutUser {
        id: user.id,
        name: user.name,
        email: user.email,
    };

    let checkout_book = CheckoutBook {
        id: book.id,
        title: book.title,
        author: book.author,
        isbn: book.isbn,
    };

    Ok(Json(CheckoutWithDetails {
        checkout,
        user: checkout_user,
        book: checkout_book,
    }))
}

async fn checkout_book(
    State(state): State<AppState>,
    Json(req): Json<CheckoutBookRequest>,
) -> Result<Json<CheckoutWithDetails>, StatusCode> {
    let mut tx = state
        .db
        .begin()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let book = sqlx::query_as::<_, crate::models::Book>("SELECT * FROM books WHERE isbn = $1")
        .bind(&req.isbn)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| match e {
            sqlx::Error::RowNotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })?;

    if book.available_copies <= 0 {
        return Err(StatusCode::CONFLICT);
    }

    let user = sqlx::query_as::<_, crate::models::User>(
        "SELECT * FROM users WHERE id = $1 AND is_active = true",
    )
    .bind(req.user_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => StatusCode::NOT_FOUND,
        _ => StatusCode::INTERNAL_SERVER_ERROR,
    })?;

    let active_checkouts: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM checkouts WHERE user_id = $1 AND status = 'ACTIVE'",
    )
    .bind(req.user_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if active_checkouts >= user.max_checkouts as i64 {
        return Err(StatusCode::CONFLICT);
    }

    let due_date = Utc::now() + Duration::days(14);

    let checkout_id = Uuid::new_v4();
    let checkout = sqlx::query_as::<_, Checkout>(
        r#"
        INSERT INTO checkouts (id, user_id, book_id, due_date)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        "#,
    )
    .bind(checkout_id)
    .bind(req.user_id)
    .bind(book.id)
    .bind(due_date)
    .fetch_one(&mut *tx)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    sqlx::query("UPDATE books SET available_copies = available_copies - 1 WHERE id = $1")
        .bind(book.id)
        .execute(&mut *tx)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    tx.commit()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Sync with Supabase for real-time updates
    if let Some(ref supabase_sync) = state.supabase_sync {
        tokio::spawn({
            let sync = supabase_sync.clone();
            let checkout = checkout.clone();
            let book_id = book.id;
            let available_copies = book.available_copies - 1;
            let total_copies = book.total_copies;
            async move {
                sync.sync_checkout_creation(&checkout).await;
                sync.sync_book_update(book_id, available_copies, total_copies).await;
            }
        });
    }

    let checkout_user = CheckoutUser {
        id: user.id,
        name: user.name,
        email: user.email,
    };

    let checkout_book = CheckoutBook {
        id: book.id,
        title: book.title,
        author: book.author,
        isbn: book.isbn,
    };

    Ok(Json(CheckoutWithDetails {
        checkout,
        user: checkout_user,
        book: checkout_book,
    }))
}

async fn return_book(
    State(state): State<AppState>,
    Json(req): Json<ReturnBookRequest>,
) -> Result<Json<CheckoutWithDetails>, StatusCode> {
    let mut tx = state
        .db
        .begin()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let row = sqlx::query(
        r#"
        SELECT 
            c.*,
            u.id as user_id, u.name as user_name, u.email as user_email,
            b.id as book_id, b.title as book_title, b.author as book_author, b.isbn as book_isbn
        FROM checkouts c
        JOIN users u ON c.user_id = u.id
        JOIN books b ON c.book_id = b.id
        WHERE c.id = $1 AND c.status = 'ACTIVE'
        "#,
    )
    .bind(req.checkout_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => StatusCode::NOT_FOUND,
        _ => StatusCode::INTERNAL_SERVER_ERROR,
    })?;

    let book_id: Uuid = row.get("book_id");

    let checkout = sqlx::query_as::<_, Checkout>(
        "UPDATE checkouts SET status = 'RETURNED', returned_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *"
    )
    .bind(req.checkout_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    sqlx::query("UPDATE books SET available_copies = available_copies + 1 WHERE id = $1")
        .bind(book_id)
        .execute(&mut *tx)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    tx.commit()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Sync with Supabase for real-time updates
    if let Some(ref supabase_sync) = state.supabase_sync {
        tokio::spawn({
            let sync = supabase_sync.clone();
            let checkout = checkout.clone();
            async move {
                sync.sync_checkout_update(&checkout).await;
            }
        });
    }

    let user = CheckoutUser {
        id: row.get("user_id"),
        name: row.get("user_name"),
        email: row.get("user_email"),
    };

    let book = CheckoutBook {
        id: row.get("book_id"),
        title: row.get("book_title"),
        author: row.get("book_author"),
        isbn: row.get("book_isbn"),
    };

    Ok(Json(CheckoutWithDetails {
        checkout,
        user,
        book,
    }))
}

async fn renew_checkout(
    State(state): State<AppState>,
    Json(req): Json<RenewCheckoutRequest>,
) -> Result<Json<CheckoutWithDetails>, StatusCode> {
    let mut tx = state
        .db
        .begin()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let row = sqlx::query(
        r#"
        SELECT 
            c.*,
            u.id as user_id, u.name as user_name, u.email as user_email,
            b.id as book_id, b.title as book_title, b.author as book_author, b.isbn as book_isbn
        FROM checkouts c
        JOIN users u ON c.user_id = u.id
        JOIN books b ON c.book_id = b.id
        WHERE c.id = $1 AND c.status = 'ACTIVE'
        "#,
    )
    .bind(req.checkout_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => StatusCode::NOT_FOUND,
        _ => StatusCode::INTERNAL_SERVER_ERROR,
    })?;

    let renewal_count: i32 = row.get("renewal_count");
    let max_renewals: i32 = row.get("max_renewals");

    if renewal_count >= max_renewals {
        return Err(StatusCode::CONFLICT);
    }

    let current_due_date: chrono::DateTime<Utc> = row.get("due_date");
    let new_due_date = current_due_date + Duration::days(14);

    let checkout = sqlx::query_as::<_, Checkout>(
        r#"
        UPDATE checkouts 
        SET due_date = $2, renewal_count = renewal_count + 1, updated_at = NOW() 
        WHERE id = $1 
        RETURNING *
        "#,
    )
    .bind(req.checkout_id)
    .bind(new_due_date)
    .fetch_one(&mut *tx)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    tx.commit()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let user = CheckoutUser {
        id: row.get("user_id"),
        name: row.get("user_name"),
        email: row.get("user_email"),
    };

    let book = CheckoutBook {
        id: row.get("book_id"),
        title: row.get("book_title"),
        author: row.get("book_author"),
        isbn: row.get("book_isbn"),
    };

    Ok(Json(CheckoutWithDetails {
        checkout,
        user,
        book,
    }))
}

async fn get_overdue_checkouts(
    State(state): State<AppState>,
) -> Result<Json<Vec<CheckoutWithDetails>>, StatusCode> {
    let rows = sqlx::query(
        r#"
        SELECT 
            c.*,
            u.id as user_id, u.name as user_name, u.email as user_email,
            b.id as book_id, b.title as book_title, b.author as book_author, b.isbn as book_isbn
        FROM checkouts c
        JOIN users u ON c.user_id = u.id
        JOIN books b ON c.book_id = b.id
        WHERE c.due_date < NOW() AND c.status = 'ACTIVE'
        ORDER BY c.due_date ASC
        "#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut checkouts = Vec::new();
    for row in rows {
        let checkout = Checkout {
            id: row.get("id"),
            user_id: row.get("user_id"),
            book_id: row.get("book_id"),
            status: CheckoutStatus::Overdue,
            checked_out_at: row.get("checked_out_at"),
            due_date: row.get("due_date"),
            returned_at: row.get("returned_at"),
            renewal_count: row.get("renewal_count"),
            max_renewals: row.get("max_renewals"),
            overdue_email_sent: row.get("overdue_email_sent"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        };

        let user = CheckoutUser {
            id: row.get("user_id"),
            name: row.get("user_name"),
            email: row.get("user_email"),
        };

        let book = CheckoutBook {
            id: row.get("book_id"),
            title: row.get("book_title"),
            author: row.get("book_author"),
            isbn: row.get("book_isbn"),
        };

        checkouts.push(CheckoutWithDetails {
            checkout,
            user,
            book,
        });
    }

    Ok(Json(checkouts))
}
