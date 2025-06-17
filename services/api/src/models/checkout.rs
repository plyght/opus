use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default, Type)]
#[sqlx(type_name = "checkout_status", rename_all = "UPPERCASE")]
#[serde(rename_all = "UPPERCASE")]
pub enum CheckoutStatus {
    #[default]
    Active,
    Returned,
    Overdue,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Checkout {
    pub id: Uuid,
    pub user_id: Uuid,
    pub book_id: Uuid,
    pub status: CheckoutStatus,
    pub checked_out_at: DateTime<Utc>,
    pub due_date: DateTime<Utc>,
    pub returned_at: Option<DateTime<Utc>>,
    pub renewal_count: i32,
    pub max_renewals: i32,
    pub overdue_email_sent: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckoutWithDetails {
    #[serde(flatten)]
    pub checkout: Checkout,
    pub user: CheckoutUser,
    pub book: CheckoutBook,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckoutUser {
    pub id: Uuid,
    pub name: String,
    pub email: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckoutBook {
    pub id: Uuid,
    pub title: String,
    pub author: String,
    pub isbn: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateCheckoutRequest {
    pub user_id: Uuid,
    pub book_id: Uuid,
    pub due_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CheckoutBookRequest {
    pub isbn: String,
    pub user_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct ReturnBookRequest {
    pub checkout_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct RenewCheckoutRequest {
    pub checkout_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct CheckoutSearchQuery {
    pub user_id: Option<Uuid>,
    pub book_id: Option<Uuid>,
    pub status: Option<CheckoutStatus>,
    pub overdue: Option<bool>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}
