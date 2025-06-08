use axum::{
    Json,
    extract::{Extension, Path, State},
    http::StatusCode,
};
use chrono::Utc;
use sea_orm::*;
use uuid::Uuid;

use crate::{
    AppState,
    auth::jwt::Claims,
    models::checkout::{CheckoutStatus, Entity as Checkout, Model as CheckoutModel},
};

pub async fn list_checkouts(
    State(db): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<Vec<CheckoutModel>>, StatusCode> {
    let checkouts = match claims.role {
        crate::models::user::UserRole::Admin | crate::models::user::UserRole::Developer => {
            // Admins and developers can see all checkouts
            Checkout::find()
                .all(&db)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        }
        crate::models::user::UserRole::User => {
            // Regular users can only see their own checkouts
            let user_id =
                Uuid::parse_str(&claims.sub).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

            Checkout::find()
                .filter(crate::models::checkout::Column::UserId.eq(user_id))
                .all(&db)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        }
    };

    Ok(Json(checkouts))
}

pub async fn get_checkout(
    State(db): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<CheckoutModel>, StatusCode> {
    let checkout = Checkout::find_by_id(id)
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    // Check permissions
    let requesting_user_id =
        Uuid::parse_str(&claims.sub).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match claims.role {
        crate::models::user::UserRole::Admin | crate::models::user::UserRole::Developer => {}
        crate::models::user::UserRole::User => {
            if checkout.user_id != requesting_user_id {
                return Err(StatusCode::FORBIDDEN);
            }
        }
    }

    Ok(Json(checkout))
}

pub async fn update_checkout(
    State(_db): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(_id): Path<Uuid>,
) -> Result<StatusCode, StatusCode> {
    // TODO: Implement checkout update functionality (e.g., renew, add notes)
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn get_overdue_checkouts(
    State(db): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<Vec<CheckoutModel>>, StatusCode> {
    // Only admins and developers can view overdue checkouts
    match claims.role {
        crate::models::user::UserRole::Admin | crate::models::user::UserRole::Developer => {}
        _ => return Err(StatusCode::FORBIDDEN),
    }

    let now = Utc::now();

    let overdue_checkouts = Checkout::find()
        .filter(crate::models::checkout::Column::Status.eq(CheckoutStatus::Active))
        .filter(crate::models::checkout::Column::DueDate.lt(now))
        .all(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(overdue_checkouts))
}
