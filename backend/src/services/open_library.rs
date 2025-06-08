use chrono::NaiveDate;
use reqwest;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
struct OpenLibraryBook {
    title: Option<String>,
    authors: Option<Vec<OpenLibraryAuthor>>,
    publishers: Option<Vec<String>>,
    publish_date: Option<String>,
    description: Option<OpenLibraryDescription>,
    covers: Option<Vec<i64>>,
    subjects: Option<Vec<String>>,
    number_of_pages: Option<i32>,
    languages: Option<Vec<OpenLibraryLanguage>>,
    key: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenLibraryAuthor {
    name: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum OpenLibraryDescription {
    String(String),
    Object { value: String },
}

#[derive(Debug, Deserialize)]
struct OpenLibraryLanguage {
    key: String,
}

#[derive(Debug, Serialize)]
pub struct BookMetadata {
    pub title: String,
    pub author: String,
    pub publisher: Option<String>,
    pub publication_date: Option<NaiveDate>,
    pub description: Option<String>,
    pub cover_url: Option<String>,
    pub page_count: Option<i32>,
    pub language: Option<String>,
    pub open_library_id: Option<String>,
}

pub async fn fetch_book_metadata(isbn: &str) -> Result<BookMetadata, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();

    // Try ISBN-13 first, then ISBN-10
    let url = format!("https://openlibrary.org/isbn/{}.json", isbn);

    let response = client
        .get(&url)
        .header("User-Agent", "Opus Library Management System")
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(format!("API request failed with status: {}", response.status()).into());
    }

    let book: OpenLibraryBook = response.json().await?;

    let title = book.title.unwrap_or_else(|| "Unknown Title".to_string());

    let author = book
        .authors
        .and_then(|authors| authors.into_iter().next())
        .and_then(|author| author.name)
        .unwrap_or_else(|| "Unknown Author".to_string());

    let publisher = book
        .publishers
        .and_then(|publishers| publishers.into_iter().next());

    let publication_date = book.publish_date.and_then(|date_str| parse_date(&date_str));

    let description = book.description.map(|desc| match desc {
        OpenLibraryDescription::String(s) => s,
        OpenLibraryDescription::Object { value } => value,
    });

    let cover_url = book
        .covers
        .and_then(|covers| covers.into_iter().next())
        .map(|cover_id| format!("https://covers.openlibrary.org/b/id/{}-L.jpg", cover_id));

    let language = book
        .languages
        .and_then(|langs| langs.into_iter().next())
        .map(|lang| lang.key.replace("/languages/", "").to_uppercase());

    let open_library_id = book.key;

    Ok(BookMetadata {
        title,
        author,
        publisher,
        publication_date,
        description,
        cover_url,
        page_count: book.number_of_pages,
        language,
        open_library_id,
    })
}

fn parse_date(date_str: &str) -> Option<NaiveDate> {
    // Try different date formats commonly used by Open Library
    let formats = [
        "%Y-%m-%d",
        "%Y",
        "%B %d, %Y",
        "%b %d, %Y",
        "%Y-%m",
        "%m/%d/%Y",
    ];

    for format in &formats {
        if let Ok(date) = NaiveDate::parse_from_str(date_str, format) {
            return Some(date);
        }
    }

    // Try parsing just the year
    if let Ok(year) = date_str.parse::<i32>() {
        if year > 0 && year < 3000 {
            return NaiveDate::from_ymd_opt(year, 1, 1);
        }
    }

    None
}
