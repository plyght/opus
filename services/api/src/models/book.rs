use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Book {
    pub id: Uuid,
    pub isbn: String,
    pub title: String,
    pub author: String,
    pub publisher: Option<String>,
    pub published_year: Option<i32>,
    pub genre: Option<String>,
    pub description: Option<String>,
    pub cover_url: Option<String>,
    pub total_copies: i32,
    pub available_copies: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateBookRequest {
    pub isbn: String,
    pub title: String,
    pub author: String,
    pub publisher: Option<String>,
    pub published_year: Option<i32>,
    pub genre: Option<String>,
    pub description: Option<String>,
    pub cover_url: Option<String>,
    pub total_copies: Option<i32>,
    pub available_copies: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateBookRequest {
    pub title: Option<String>,
    pub author: Option<String>,
    pub publisher: Option<String>,
    pub published_year: Option<i32>,
    pub genre: Option<String>,
    pub description: Option<String>,
    pub cover_url: Option<String>,
    pub total_copies: Option<i32>,
    pub available_copies: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct BookSearchQuery {
    pub query: Option<String>,
    pub isbn: Option<String>,
    pub author: Option<String>,
    pub genre: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}
