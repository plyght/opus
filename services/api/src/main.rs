use axum::{
    http::{header::CONTENT_TYPE, Method, StatusCode},
    response::Json,
    routing::get,
    Router,
};
use serde_json::{json, Value};
use sqlx::PgPool;
use tokio_cron_scheduler::{Job, JobScheduler};
use tower_http::cors::{Any, CorsLayer};
use tracing::{info, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod handlers;
mod middleware;
mod models;
mod services;

use handlers::{books, checkouts, users};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
}

async fn health_check() -> Result<Json<Value>, StatusCode> {
    Ok(Json(json!({ "status": "ok" })))
}

async fn setup_scheduler(db: PgPool) -> Result<(), Box<dyn std::error::Error>> {
    let sched = JobScheduler::new().await?;

    let job = Job::new_async("0 0 0 * * *", move |_uuid, _l| {
        let db = db.clone();
        Box::pin(async move {
            info!("Running overdue check job");
            if let Err(e) = services::email::send_overdue_notifications(&db).await {
                warn!("Failed to send overdue notifications: {}", e);
            }
        })
    })?;

    sched.add(job).await?;
    sched.start().await?;

    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "library_api=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let api_port = std::env::var("API_PORT").unwrap_or_else(|_| "8081".to_string());

    let pool = sqlx::PgPool::connect(&database_url).await?;

    sqlx::migrate!("./migrations").run(&pool).await?;

    setup_scheduler(pool.clone()).await?;

    let app_state = AppState { db: pool };

    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers([CONTENT_TYPE])
        .allow_origin(Any);

    let app = Router::new()
        .route("/health", get(health_check))
        .nest("/api/books", books::router())
        .nest("/api/users", users::router())
        .nest("/api/checkouts", checkouts::router())
        .layer(cors)
        .with_state(app_state);

    let bind_addr = format!("0.0.0.0:{}", api_port);
    let listener = tokio::net::TcpListener::bind(&bind_addr).await?;
    info!("Server running on http://{}", bind_addr);

    axum::serve(listener, app).await?;

    Ok(())
}
