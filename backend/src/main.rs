use axum::{
    Json, Router,
    routing::{get, post},
};
use sea_orm::{Database, DatabaseConnection};
use std::env;
use tower_http::cors::CorsLayer;
use tracing_subscriber;

mod auth;
mod handlers;
mod models;
mod services;

pub type AppState = DatabaseConnection;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::init();
    dotenvy::dotenv().ok();

    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:password@localhost:5432/opus_db".to_string());

    let db = Database::connect(&database_url).await?;

    let app = Router::new()
        .route("/", get(|| async { "Opus Library Management API" }))
        .nest("/api/auth", auth::routes())
        .nest("/api/books", handlers::book_routes())
        .nest("/api/users", handlers::user_routes())
        .nest("/api/checkouts", handlers::checkout_routes())
        .layer(CorsLayer::permissive())
        .with_state(db);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:8080").await?;
    tracing::info!("Library Backend running on http://127.0.0.1:8080");

    axum::serve(listener, app).await?;
    Ok(())
}
