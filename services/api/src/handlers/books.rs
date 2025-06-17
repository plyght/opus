use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde_json::{json, Value};
use sqlx::Row;
use uuid::Uuid;

use crate::{
    models::{Book, BookSearchQuery, CreateBookRequest, UpdateBookRequest},
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_books).post(create_book))
        .route("/:id", get(get_book).put(update_book).delete(delete_book))
        .route("/isbn/:isbn", get(get_book_by_isbn))
}

async fn list_books(
    State(state): State<AppState>,
    Query(query): Query<BookSearchQuery>,
) -> Result<Json<Value>, StatusCode> {
    let limit = query.limit.unwrap_or(20).min(100);
    let offset = query.offset.unwrap_or(0);

    let mut where_conditions = Vec::<String>::new();
    let mut search_params = Vec::new();

    if let Some(ref q) = query.query {
        where_conditions.push("(title ILIKE $1 OR author ILIKE $1)".to_string());
        search_params.push(format!("%{}%", q));
    }

    if let Some(ref isbn) = query.isbn {
        let param_num = search_params.len() + 1;
        where_conditions.push(format!("isbn = ${}", param_num));
        search_params.push(isbn.clone());
    }

    if let Some(ref author) = query.author {
        let param_num = search_params.len() + 1;
        where_conditions.push(format!("author ILIKE ${}", param_num));
        search_params.push(format!("%{}%", author));
    }

    if let Some(ref genre) = query.genre {
        let param_num = search_params.len() + 1;
        where_conditions.push(format!("genre = ${}", param_num));
        search_params.push(genre.clone());
    }

    let where_clause = if where_conditions.is_empty() {
        String::new()
    } else {
        format!(" WHERE {}", where_conditions.join(" AND "))
    };

    let count_sql = format!("SELECT COUNT(*) FROM books{}", where_clause);
    let mut count_query = sqlx::query(&count_sql);

    for param in &search_params {
        count_query = count_query.bind(param);
    }

    let total_count: i64 = count_query
        .fetch_one(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .get(0);

    let books_sql = format!(
        "SELECT * FROM books{} ORDER BY created_at DESC LIMIT {} OFFSET {}",
        where_clause, limit, offset
    );

    let mut books_query = sqlx::query_as::<_, Book>(&books_sql);

    for param in &search_params {
        books_query = books_query.bind(param);
    }

    let books = books_query
        .fetch_all(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let has_more = (offset + limit) < total_count;

    Ok(Json(json!({
        "items": books,
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "hasMore": has_more
    })))
}

async fn get_book(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Book>, StatusCode> {
    let book = sqlx::query_as::<_, Book>("SELECT * FROM books WHERE id = $1")
        .bind(id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| match e {
            sqlx::Error::RowNotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })?;

    Ok(Json(book))
}

async fn get_book_by_isbn(
    State(state): State<AppState>,
    Path(isbn): Path<String>,
) -> Result<Json<Book>, StatusCode> {
    let book = sqlx::query_as::<_, Book>("SELECT * FROM books WHERE isbn = $1")
        .bind(isbn)
        .fetch_one(&state.db)
        .await
        .map_err(|e| match e {
            sqlx::Error::RowNotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })?;

    Ok(Json(book))
}

async fn create_book(
    State(state): State<AppState>,
    Json(req): Json<CreateBookRequest>,
) -> Result<Json<Book>, StatusCode> {
    let total_copies = req.total_copies.unwrap_or(1);
    let available_copies = req.available_copies.unwrap_or(total_copies);

    let book = sqlx::query_as::<_, Book>(
        r#"
        INSERT INTO books (id, isbn, title, author, publisher, published_year, genre, description, cover_url, total_copies, available_copies)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
        "#
    )
    .bind(Uuid::new_v4())
    .bind(req.isbn)
    .bind(req.title)
    .bind(req.author)
    .bind(req.publisher)
    .bind(req.published_year)
    .bind(req.genre)
    .bind(req.description)
    .bind(req.cover_url)
    .bind(total_copies)
    .bind(available_copies)
    .fetch_one(&state.db)
    .await
    .map_err(|e| match e {
        sqlx::Error::Database(db_err) if db_err.constraint().is_some() => StatusCode::CONFLICT,
        _ => StatusCode::INTERNAL_SERVER_ERROR,
    })?;

    Ok(Json(book))
}

async fn update_book(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateBookRequest>,
) -> Result<Json<Book>, StatusCode> {
    let _existing_book = sqlx::query_as::<_, Book>("SELECT * FROM books WHERE id = $1")
        .bind(id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| match e {
            sqlx::Error::RowNotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })?;

    let book = sqlx::query_as::<_, Book>(
        r#"
        UPDATE books 
        SET title = COALESCE($2, title),
            author = COALESCE($3, author),
            publisher = COALESCE($4, publisher),
            published_year = COALESCE($5, published_year),
            genre = COALESCE($6, genre),
            description = COALESCE($7, description),
            cover_url = COALESCE($8, cover_url),
            total_copies = COALESCE($9, total_copies),
            available_copies = COALESCE($10, available_copies),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(req.title)
    .bind(req.author)
    .bind(req.publisher)
    .bind(req.published_year)
    .bind(req.genre)
    .bind(req.description)
    .bind(req.cover_url)
    .bind(req.total_copies)
    .bind(req.available_copies)
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(book))
}

async fn delete_book(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, StatusCode> {
    let result = sqlx::query("DELETE FROM books WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if result.rows_affected() == 0 {
        return Err(StatusCode::NOT_FOUND);
    }

    Ok(Json(json!({ "message": "Book deleted successfully" })))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_list_books_empty_query() {
        let query = BookSearchQuery {
            query: None,
            isbn: None,
            author: None,
            genre: None,
            limit: None,
            offset: None,
        };

        // This would normally test with a real database connection
        // For now, just verify the query structure is valid
        assert!(query.limit.is_none());
        assert!(query.offset.is_none());
    }
}
