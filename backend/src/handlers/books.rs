use axum::{
    Json,
    extract::{Extension, Path, Query, State},
    http::StatusCode,
};
use chrono::Utc;
use sea_orm::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    AppState,
    auth::jwt::Claims,
    models::{
        book::{ActiveModel as BookActiveModel, BookStatus, Entity as Book, Model as BookModel},
        checkout::{ActiveModel as CheckoutActiveModel, CheckoutStatus, Entity as Checkout},
    },
    services::open_library::fetch_book_metadata,
};

#[derive(Deserialize)]
pub struct CreateBookRequest {
    pub isbn: Option<String>,
    pub title: String,
    pub author: String,
    pub publisher: Option<String>,
    pub description: Option<String>,
    pub genre: Option<String>,
    pub location: Option<String>,
    pub barcode: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateBookRequest {
    pub title: Option<String>,
    pub author: Option<String>,
    pub publisher: Option<String>,
    pub description: Option<String>,
    pub genre: Option<String>,
    pub status: Option<BookStatus>,
    pub location: Option<String>,
    pub barcode: Option<String>,
}

#[derive(Deserialize)]
pub struct SearchQuery {
    pub q: Option<String>,
    pub author: Option<String>,
    pub genre: Option<String>,
    pub status: Option<BookStatus>,
    pub page: Option<u64>,
    pub limit: Option<u64>,
}

#[derive(Serialize)]
pub struct BookListResponse {
    pub books: Vec<BookModel>,
    pub total: u64,
    pub page: u64,
    pub limit: u64,
}

pub async fn list_books(
    State(db): State<AppState>,
    Query(query): Query<SearchQuery>,
) -> Result<Json<BookListResponse>, StatusCode> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20).min(100);
    let offset = (page - 1) * limit;

    let mut select = Book::find();

    if let Some(q) = &query.q {
        select = select.filter(
            Condition::any()
                .add(crate::models::book::Column::Title.contains(q))
                .add(crate::models::book::Column::Author.contains(q))
                .add(crate::models::book::Column::Description.contains(q)),
        );
    }

    if let Some(author) = &query.author {
        select = select.filter(crate::models::book::Column::Author.contains(author));
    }

    if let Some(genre) = &query.genre {
        select = select.filter(crate::models::book::Column::Genre.contains(genre));
    }

    if let Some(status) = &query.status {
        select = select.filter(crate::models::book::Column::Status.eq(status));
    }

    let total = select
        .clone()
        .count(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let books = select
        .offset(offset)
        .limit(limit)
        .all(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(BookListResponse {
        books,
        total,
        page,
        limit,
    }))
}

pub async fn get_book(
    State(db): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<BookModel>, StatusCode> {
    let book = Book::find_by_id(id)
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(book))
}

pub async fn get_book_by_isbn(
    State(db): State<AppState>,
    Path(isbn): Path<String>,
) -> Result<Json<BookModel>, StatusCode> {
    let book = Book::find()
        .filter(crate::models::book::Column::Isbn.eq(&isbn))
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(book))
}

pub async fn create_book(
    State(db): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateBookRequest>,
) -> Result<(StatusCode, Json<BookModel>), StatusCode> {
    // Only admins and developers can create books
    match claims.role {
        crate::models::user::UserRole::Admin | crate::models::user::UserRole::Developer => {}
        _ => return Err(StatusCode::FORBIDDEN),
    }

    let now = Utc::now().into();
    let book_id = Uuid::new_v4();

    // Try to fetch metadata from Open Library if ISBN is provided
    let mut metadata = None;
    if let Some(isbn) = &req.isbn {
        metadata = fetch_book_metadata(isbn).await.ok();
    }

    let new_book = BookActiveModel {
        id: Set(book_id),
        isbn: Set(req.isbn.clone()),
        title: Set(metadata
            .as_ref()
            .map(|m| m.title.clone())
            .unwrap_or(req.title)),
        author: Set(metadata
            .as_ref()
            .map(|m| m.author.clone())
            .unwrap_or(req.author)),
        publisher: Set(metadata
            .as_ref()
            .and_then(|m| m.publisher.clone())
            .or(req.publisher)),
        publication_date: Set(metadata.as_ref().and_then(|m| m.publication_date)),
        description: Set(metadata
            .as_ref()
            .and_then(|m| m.description.clone())
            .or(req.description)),
        cover_url: Set(metadata.as_ref().and_then(|m| m.cover_url.clone())),
        genre: Set(req.genre),
        page_count: Set(metadata.as_ref().and_then(|m| m.page_count)),
        language: Set(metadata.as_ref().and_then(|m| m.language.clone())),
        status: Set(BookStatus::Available),
        location: Set(req.location),
        barcode: Set(req.barcode),
        open_library_id: Set(metadata.as_ref().and_then(|m| m.open_library_id.clone())),
        created_at: Set(now),
        updated_at: Set(now),
    };

    let book = new_book
        .insert(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok((StatusCode::CREATED, Json(book)))
}

pub async fn update_book(
    State(db): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateBookRequest>,
) -> Result<Json<BookModel>, StatusCode> {
    // Only admins and developers can update books
    match claims.role {
        crate::models::user::UserRole::Admin | crate::models::user::UserRole::Developer => {}
        _ => return Err(StatusCode::FORBIDDEN),
    }

    let book = Book::find_by_id(id)
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    let mut active_book: BookActiveModel = book.into();

    if let Some(title) = req.title {
        active_book.title = Set(title);
    }
    if let Some(author) = req.author {
        active_book.author = Set(author);
    }
    if let Some(publisher) = req.publisher {
        active_book.publisher = Set(Some(publisher));
    }
    if let Some(description) = req.description {
        active_book.description = Set(Some(description));
    }
    if let Some(genre) = req.genre {
        active_book.genre = Set(Some(genre));
    }
    if let Some(status) = req.status {
        active_book.status = Set(status);
    }
    if let Some(location) = req.location {
        active_book.location = Set(Some(location));
    }
    if let Some(barcode) = req.barcode {
        active_book.barcode = Set(Some(barcode));
    }

    active_book.updated_at = Set(Utc::now().into());

    let book = active_book
        .update(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(book))
}

pub async fn delete_book(
    State(db): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, StatusCode> {
    // Only developers can delete books
    match claims.role {
        crate::models::user::UserRole::Developer => {}
        _ => return Err(StatusCode::FORBIDDEN),
    }

    let book = Book::find_by_id(id)
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    book.delete(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn search_books(
    State(db): State<AppState>,
    Query(query): Query<SearchQuery>,
) -> Result<Json<BookListResponse>, StatusCode> {
    list_books(State(db), Query(query)).await
}

#[derive(Deserialize)]
pub struct CheckoutRequest {
    pub due_date: Option<chrono::DateTime<chrono::Utc>>,
}

pub async fn checkout_book(
    State(db): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(book_id): Path<Uuid>,
    Json(req): Json<CheckoutRequest>,
) -> Result<StatusCode, StatusCode> {
    let user_id = Uuid::parse_str(&claims.sub).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Check if book exists and is available
    let book = Book::find_by_id(book_id)
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    if book.status != BookStatus::Available {
        return Err(StatusCode::CONFLICT);
    }

    let now = Utc::now();
    let due_date = req
        .due_date
        .unwrap_or_else(|| now + chrono::Duration::weeks(2));

    // Create checkout record
    let checkout = CheckoutActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(user_id),
        book_id: Set(book_id),
        checked_out_at: Set(now.into()),
        due_date: Set(due_date.into()),
        returned_at: Set(None),
        status: Set(CheckoutStatus::Active),
        notes: Set(None),
        renewal_count: Set(0),
        created_at: Set(now.into()),
        updated_at: Set(now.into()),
    };

    checkout
        .insert(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Update book status
    let mut active_book: BookActiveModel = book.into();
    active_book.status = Set(BookStatus::CheckedOut);
    active_book.updated_at = Set(now.into());

    active_book
        .update(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::CREATED)
}

pub async fn return_book(
    State(db): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(book_id): Path<Uuid>,
) -> Result<StatusCode, StatusCode> {
    let user_id = Uuid::parse_str(&claims.sub).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Find active checkout
    let checkout = Checkout::find()
        .filter(crate::models::checkout::Column::BookId.eq(book_id))
        .filter(crate::models::checkout::Column::UserId.eq(user_id))
        .filter(crate::models::checkout::Column::Status.eq(CheckoutStatus::Active))
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    let now = Utc::now();

    // Update checkout record
    let mut active_checkout: CheckoutActiveModel = checkout.into();
    active_checkout.returned_at = Set(Some(now.into()));
    active_checkout.status = Set(CheckoutStatus::Returned);
    active_checkout.updated_at = Set(now.into());

    active_checkout
        .update(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Update book status
    let book = Book::find_by_id(book_id)
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    let mut active_book: BookActiveModel = book.into();
    active_book.status = Set(BookStatus::Available);
    active_book.updated_at = Set(now.into());

    active_book
        .update(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::OK)
}
