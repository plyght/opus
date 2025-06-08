pub mod books;
pub mod checkouts;
pub mod users;

use crate::AppState;
use axum::{
    Router,
    routing::{delete, get, post, put},
};

pub fn book_routes() -> Router<AppState> {
    Router::new()
        .route("/", get(books::list_books).post(books::create_book))
        .route(
            "/:id",
            get(books::get_book)
                .put(books::update_book)
                .delete(books::delete_book),
        )
        .route("/search", get(books::search_books))
        .route("/isbn/:isbn", get(books::get_book_by_isbn))
        .route("/:id/checkout", post(books::checkout_book))
        .route("/:id/return", post(books::return_book))
}

pub fn user_routes() -> Router<AppState> {
    Router::new()
        .route("/", get(users::list_users))
        .route("/:id", get(users::get_user).put(users::update_user))
        .route("/:id/checkouts", get(users::get_user_checkouts))
}

pub fn checkout_routes() -> Router<AppState> {
    Router::new()
        .route("/", get(checkouts::list_checkouts))
        .route(
            "/:id",
            get(checkouts::get_checkout).put(checkouts::update_checkout),
        )
        .route("/overdue", get(checkouts::get_overdue_checkouts))
}
