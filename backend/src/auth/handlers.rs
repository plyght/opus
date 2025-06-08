use axum::{
    Json,
    extract::{Extension, State},
    http::StatusCode,
};
use axum_extra::extract::cookie::{Cookie, CookieJar};
use bcrypt::{DEFAULT_COST, hash, verify};
use chrono::Utc;
use sea_orm::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    AppState,
    auth::jwt::{Claims, create_token},
    models::user::{ActiveModel as UserActiveModel, Entity as User, Model as UserModel, UserRole},
};

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub username: String,
    pub password: String,
    pub first_name: String,
    pub last_name: String,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserInfo,
}

#[derive(Serialize)]
pub struct UserInfo {
    pub id: Uuid,
    pub email: String,
    pub username: String,
    pub first_name: String,
    pub last_name: String,
    pub role: UserRole,
}

impl From<UserModel> for UserInfo {
    fn from(user: UserModel) -> Self {
        Self {
            id: user.id,
            email: user.email,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
        }
    }
}

pub async fn register(
    State(db): State<AppState>,
    Json(req): Json<RegisterRequest>,
) -> Result<(StatusCode, Json<AuthResponse>), StatusCode> {
    // Check if user already exists
    let existing_user = User::find()
        .filter(crate::models::user::Column::Email.eq(&req.email))
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if existing_user.is_some() {
        return Err(StatusCode::CONFLICT);
    }

    // Hash password
    let password_hash =
        hash(&req.password, DEFAULT_COST).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Create user
    let now = Utc::now().into();
    let user_id = Uuid::new_v4();

    let new_user = UserActiveModel {
        id: Set(user_id),
        email: Set(req.email.clone()),
        username: Set(req.username),
        password_hash: Set(password_hash),
        first_name: Set(req.first_name),
        last_name: Set(req.last_name),
        role: Set(UserRole::User),
        is_active: Set(true),
        created_at: Set(now),
        updated_at: Set(now),
    };

    let user = new_user
        .insert(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Create JWT
    let claims = Claims::new(user.id, user.email.clone(), user.role.clone());
    let token = create_token(&claims).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok((
        StatusCode::CREATED,
        Json(AuthResponse {
            token,
            user: user.into(),
        }),
    ))
}

pub async fn login(
    State(db): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> Result<(CookieJar, Json<AuthResponse>), StatusCode> {
    // Find user
    let user = User::find()
        .filter(crate::models::user::Column::Email.eq(&req.email))
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::UNAUTHORIZED)?;

    // Verify password
    if !verify(&req.password, &user.password_hash).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)? {
        return Err(StatusCode::UNAUTHORIZED);
    }

    // Check if user is active
    if !user.is_active {
        return Err(StatusCode::UNAUTHORIZED);
    }

    // Create JWT
    let claims = Claims::new(user.id, user.email.clone(), user.role.clone());
    let token = create_token(&claims).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Set cookie
    let cookie = Cookie::build(("token", token.clone()))
        .path("/")
        .max_age(time::Duration::hours(24))
        .http_only(true)
        .build();

    let jar = CookieJar::new().add(cookie);

    Ok((
        jar,
        Json(AuthResponse {
            token,
            user: user.into(),
        }),
    ))
}

pub async fn me(
    State(db): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<UserInfo>, StatusCode> {
    let user_id = Uuid::parse_str(&claims.sub).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let user = User::find_by_id(user_id)
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(user.into()))
}

pub async fn refresh_token(
    State(db): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<AuthResponse>, StatusCode> {
    let user_id = Uuid::parse_str(&claims.sub).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let user = User::find_by_id(user_id)
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    let new_claims = Claims::new(user.id, user.email.clone(), user.role.clone());
    let token = create_token(&new_claims).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(AuthResponse {
        token,
        user: user.into(),
    }))
}
