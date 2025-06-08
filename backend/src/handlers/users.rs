use axum::{
    Json,
    extract::{Extension, Path, State},
    http::StatusCode,
};
use sea_orm::*;
use uuid::Uuid;

use crate::{
    AppState,
    auth::jwt::Claims,
    models::{
        checkout::{Entity as Checkout, Model as CheckoutModel},
        user::{Entity as User, Model as UserModel},
    },
};

pub async fn list_users(
    State(db): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<Vec<UserModel>>, StatusCode> {
    // Only admins and developers can list users
    match claims.role {
        crate::models::user::UserRole::Admin | crate::models::user::UserRole::Developer => {}
        _ => return Err(StatusCode::FORBIDDEN),
    }

    let users = User::find()
        .all(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(users))
}

pub async fn get_user(
    State(db): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<UserModel>, StatusCode> {
    let requesting_user_id =
        Uuid::parse_str(&claims.sub).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Users can only view their own profile, admins/developers can view any
    match claims.role {
        crate::models::user::UserRole::Admin | crate::models::user::UserRole::Developer => {}
        crate::models::user::UserRole::User => {
            if requesting_user_id != id {
                return Err(StatusCode::FORBIDDEN);
            }
        }
    }

    let user = User::find_by_id(id)
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(user))
}

pub async fn update_user(
    State(_db): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(_id): Path<Uuid>,
) -> Result<StatusCode, StatusCode> {
    // TODO: Implement user update functionality
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn get_user_checkouts(
    State(db): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(user_id): Path<Uuid>,
) -> Result<Json<Vec<CheckoutModel>>, StatusCode> {
    let requesting_user_id =
        Uuid::parse_str(&claims.sub).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Users can only view their own checkouts, admins/developers can view any
    match claims.role {
        crate::models::user::UserRole::Admin | crate::models::user::UserRole::Developer => {}
        crate::models::user::UserRole::User => {
            if requesting_user_id != user_id {
                return Err(StatusCode::FORBIDDEN);
            }
        }
    }

    let checkouts = Checkout::find()
        .filter(crate::models::checkout::Column::UserId.eq(user_id))
        .all(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(checkouts))
}
