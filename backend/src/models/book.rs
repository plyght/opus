use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "books")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    #[sea_orm(unique)]
    pub isbn: Option<String>,
    pub title: String,
    pub author: String,
    pub publisher: Option<String>,
    pub publication_date: Option<Date>,
    pub description: Option<String>,
    pub cover_url: Option<String>,
    pub genre: Option<String>,
    pub page_count: Option<i32>,
    pub language: Option<String>,
    pub status: BookStatus,
    pub location: Option<String>,
    pub barcode: Option<String>,
    pub open_library_id: Option<String>,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::checkout::Entity")]
    Checkouts,
}

impl Related<super::checkout::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Checkouts.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "Enum", enum_name = "book_status")]
pub enum BookStatus {
    #[sea_orm(string_value = "available")]
    Available,
    #[sea_orm(string_value = "checked_out")]
    CheckedOut,
    #[sea_orm(string_value = "reserved")]
    Reserved,
    #[sea_orm(string_value = "maintenance")]
    Maintenance,
    #[sea_orm(string_value = "lost")]
    Lost,
}
