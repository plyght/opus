use crate::{
    AppState,
    auth::jwt::{Claims, verify_token},
    models::user::{Entity as User, UserRole},
};
use axum::{
    extract::{Request, State},
    http::{StatusCode, header::AUTHORIZATION},
    middleware::Next,
    response::Response,
};
use axum_extra::extract::cookie::{Cookie, CookieJar};
use http::HeaderMap;
use sea_orm::*;

pub async fn auth_middleware(
    State(db): State<AppState>,
    jar: CookieJar,
    mut req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let token = extract_token(&req, &jar)?;
    let claims = verify_token(&token)
        .map_err(|_| StatusCode::UNAUTHORIZED)?
        .claims;

    // Verify user still exists and is active
    let user =
        User::find_by_id(uuid::Uuid::parse_str(&claims.sub).map_err(|_| StatusCode::UNAUTHORIZED)?)
            .one(&db)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
            .ok_or(StatusCode::UNAUTHORIZED)?;

    if !user.is_active {
        return Err(StatusCode::UNAUTHORIZED);
    }

    req.extensions_mut().insert(claims);
    Ok(next.run(req).await)
}

pub async fn admin_middleware(req: Request, next: Next) -> Result<Response, StatusCode> {
    let claims = req
        .extensions()
        .get::<Claims>()
        .ok_or(StatusCode::UNAUTHORIZED)?;

    match claims.role {
        UserRole::Admin | UserRole::Developer => Ok(next.run(req).await),
        _ => Err(StatusCode::FORBIDDEN),
    }
}

pub async fn developer_middleware(req: Request, next: Next) -> Result<Response, StatusCode> {
    let claims = req
        .extensions()
        .get::<Claims>()
        .ok_or(StatusCode::UNAUTHORIZED)?;

    match claims.role {
        UserRole::Developer => Ok(next.run(req).await),
        _ => Err(StatusCode::FORBIDDEN),
    }
}

fn extract_token(req: &Request, jar: &CookieJar) -> Result<String, StatusCode> {
    // Try Authorization header first
    if let Some(auth_header) = req.headers().get(AUTHORIZATION) {
        let auth_str = auth_header.to_str().map_err(|_| StatusCode::UNAUTHORIZED)?;
        if auth_str.starts_with("Bearer ") {
            return Ok(auth_str[7..].to_string());
        }
    }

    // Try cookie as fallback
    if let Some(cookie) = jar.get("token") {
        return Ok(cookie.value().to_string());
    }

    Err(StatusCode::UNAUTHORIZED)
}
