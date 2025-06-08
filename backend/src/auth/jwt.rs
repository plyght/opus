use crate::models::user::UserRole;
use chrono::{Duration, Utc};
use jsonwebtoken::{DecodingKey, EncodingKey, Header, TokenData, Validation, decode, encode};
use serde::{Deserialize, Serialize};
use std::env;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // user id
    pub email: String,
    #[serde(deserialize_with = "deserialize_role")]
    pub role: UserRole,
    pub exp: i64,
    pub iat: i64,
}

fn deserialize_role<'de, D>(deserializer: D) -> Result<UserRole, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let s = String::deserialize(deserializer)?;
    match s.as_str() {
        "user" => Ok(UserRole::User),
        "admin" => Ok(UserRole::Admin),
        "developer" => Ok(UserRole::Developer),
        _ => Ok(UserRole::User), // Default to User for unknown roles
    }
}

impl Claims {
    pub fn new(user_id: Uuid, email: String, role: UserRole) -> Self {
        let now = Utc::now();
        let exp = now + Duration::hours(24);

        Self {
            sub: user_id.to_string(),
            email,
            role,
            iat: now.timestamp(),
            exp: exp.timestamp(),
        }
    }
}

pub fn create_token(claims: &Claims) -> Result<String, jsonwebtoken::errors::Error> {
    let secret = env::var("JWT_SECRET").unwrap_or_else(|_| "default-secret".to_string());
    let encoding_key = EncodingKey::from_secret(secret.as_ref());

    encode(&Header::default(), claims, &encoding_key)
}

pub fn verify_token(token: &str) -> Result<TokenData<Claims>, jsonwebtoken::errors::Error> {
    let secret = env::var("JWT_SECRET").unwrap_or_else(|_| "default-secret".to_string());
    let decoding_key = DecodingKey::from_secret(secret.as_ref());

    decode::<Claims>(token, &decoding_key, &Validation::default())
}
