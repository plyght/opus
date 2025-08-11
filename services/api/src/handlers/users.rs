use axum::{
    extract::{Path, Query, State},
    http::{header::AUTHORIZATION, HeaderMap, StatusCode},
    response::Json,
    routing::get,
    Router,
};
use serde_json::{json, Value};
use sqlx::Row;
use uuid::Uuid;

use crate::{
    models::{CreateUserRequest, UpdateUserRequest, User, UserRole, UserSearchQuery},
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_users).post(create_user))
        .route("/:id", get(get_user).put(update_user).delete(delete_user))
        .route("/email/:email", get(get_user_by_email))
        .route("/me", get(get_current_user))
}

async fn list_users(
    State(state): State<AppState>,
    Query(query): Query<UserSearchQuery>,
) -> Result<Json<Value>, StatusCode> {
    let limit = query.limit.unwrap_or(20).min(100);
    let offset = query.offset.unwrap_or(0);

    let mut where_conditions = Vec::<String>::new();
    let mut search_params = Vec::new();

    if let Some(ref q) = query.query {
        where_conditions.push("(name ILIKE $1 OR email ILIKE $1)".to_string());
        search_params.push(format!("%{q}%"));
    }
    if let Some(ref role) = query.role {
        let param_num = search_params.len() + 1;
        where_conditions.push(format!("role = ${param_num}"));
        search_params.push(format!("{role:?}").to_uppercase());
    }
    if let Some(is_active) = query.is_active {
        let param_num = search_params.len() + 1;
        where_conditions.push(format!("is_active = ${param_num}"));
        search_params.push(is_active.to_string());
    }

    let where_clause = if where_conditions.is_empty() {
        String::new()
    } else {
        format!(" WHERE {}", where_conditions.join(" AND "))
    };

    let count_sql = format!("SELECT COUNT(*) FROM users{where_clause}");
    let mut count_query = sqlx::query(&count_sql);

    for param in &search_params {
        count_query = count_query.bind(param);
    }

    let total_count: i64 = count_query
        .fetch_one(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .get(0);

    let users_sql = format!("SELECT * FROM users{where_clause} ORDER BY created_at DESC LIMIT {limit} OFFSET {offset}");

    let mut users_query = sqlx::query_as::<_, User>(&users_sql);

    for param in &search_params {
        users_query = users_query.bind(param);
    }

    let users = users_query
        .fetch_all(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let has_more = (offset + limit) < total_count;

    Ok(Json(json!({
        "items": users,
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "hasMore": has_more
    })))
}

async fn get_user(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<User>, StatusCode> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
        .bind(id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| match e {
            sqlx::Error::RowNotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })?;

    Ok(Json(user))
}

async fn get_user_by_email(
    State(state): State<AppState>,
    Path(email): Path<String>,
) -> Result<Json<User>, StatusCode> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = $1")
        .bind(email)
        .fetch_one(&state.db)
        .await
        .map_err(|e| match e {
            sqlx::Error::RowNotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })?;

    Ok(Json(user))
}

async fn get_current_user(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<User>, StatusCode> {
    let auth_header = headers
        .get(AUTHORIZATION)
        .and_then(|header| header.to_str().ok());

    let token = match auth_header {
        Some(auth_value) if auth_value.starts_with("Bearer ") => &auth_value[7..],
        _ => return Err(StatusCode::UNAUTHORIZED),
    };

    // Validate token with auth service
    let auth_service_url = "http://localhost:3001";

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{auth_service_url}/verify-token"))
        .json(&serde_json::json!({ "token": token }))
        .send()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if !response.status().is_success() {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let verification_result: Value = response
        .json()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if verification_result.get("valid").and_then(|v| v.as_bool()) != Some(true) {
        return Err(StatusCode::UNAUTHORIZED);
    }

    // Extract user ID from verification result
    let user_id_str = verification_result
        .get("user")
        .and_then(|u| u.get("id"))
        .and_then(|v| v.as_str())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let user_id = uuid::Uuid::parse_str(user_id_str).map_err(|_| StatusCode::BAD_REQUEST)?;

    // Get user from database
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
        .bind(user_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match user {
        Some(user) => Ok(Json(user)),
        None => {
            // User doesn't exist in our database yet, create from verification data
            let email = verification_result
                .get("user")
                .and_then(|u| u.get("email"))
                .and_then(|v| v.as_str())
                .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;

            let name = verification_result
                .get("user")
                .and_then(|u| u.get("name"))
                .and_then(|v| v.as_str())
                .unwrap_or(email);

            let new_user = sqlx::query_as::<_, User>(
                r#"
                INSERT INTO users (id, email, name, role, max_checkouts)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
                "#,
            )
            .bind(user_id)
            .bind(email)
            .bind(name)
            .bind(UserRole::User) // Default to User role
            .bind(5) // Default checkout limit
            .fetch_one(&state.db)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

            Ok(Json(new_user))
        }
    }
}

async fn create_user(
    State(state): State<AppState>,
    Json(req): Json<CreateUserRequest>,
) -> Result<Json<User>, StatusCode> {
    let role = req.role.unwrap_or(UserRole::User);
    let max_checkouts = req.max_checkouts.unwrap_or(5);

    let user = sqlx::query_as::<_, User>(
        r#"
        INSERT INTO users (id, email, name, role, max_checkouts)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(req.email)
    .bind(req.name)
    .bind(role)
    .bind(max_checkouts)
    .fetch_one(&state.db)
    .await
    .map_err(|e| match e {
        sqlx::Error::Database(db_err) if db_err.constraint().is_some() => StatusCode::CONFLICT,
        _ => StatusCode::INTERNAL_SERVER_ERROR,
    })?;

    Ok(Json(user))
}

async fn update_user(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateUserRequest>,
) -> Result<Json<User>, StatusCode> {
    let _existing_user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
        .bind(id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| match e {
            sqlx::Error::RowNotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })?;

    let user = sqlx::query_as::<_, User>(
        r#"
        UPDATE users 
        SET name = COALESCE($2, name),
            role = COALESCE($3, role),
            is_active = COALESCE($4, is_active),
            max_checkouts = COALESCE($5, max_checkouts),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(req.name)
    .bind(req.role)
    .bind(req.is_active)
    .bind(req.max_checkouts)
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(user))
}

async fn delete_user(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, StatusCode> {
    let result = sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if result.rows_affected() == 0 {
        return Err(StatusCode::NOT_FOUND);
    }

    Ok(Json(json!({ "message": "User deleted successfully" })))
}
