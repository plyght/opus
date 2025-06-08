# Opus Library Management System

A modern, full-stack library management platform built with Rust and TypeScript.

## Architecture

- **Backend**: Rust with Axum (HTTP server) + SeaORM (ORM) + PostgreSQL
- **Frontend**: Pure TypeScript using Bun for bundling/dev tooling
- **Database**: PostgreSQL
- **Authentication**: JWT-based with user/admin/developer roles
- **Book Metadata**: Open Library API integration
- **Barcode Scanning**: W3C BarcodeDetector API with ZXing-js fallback

## Features

### For Users
- Browse and search books
- Check out and return books
- Barcode/ISBN scanning for quick book lookup
- Personal checkout history

### For Admins
- Manage book inventory
- User administration
- View overdue books
- Book status management

### For Developers
- Full API access
- Advanced admin capabilities
- System configuration

## Project Structure

```
opus/
├── backend/          # Rust backend API
│   ├── src/
│   │   ├── models/   # Database entities
│   │   ├── handlers/ # API route handlers
│   │   ├── auth/     # Authentication & middleware
│   │   └── services/ # External service integrations
│   └── Cargo.toml
├── frontend/         # TypeScript frontend
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── services/   # API & auth services
│   │   ├── types/      # TypeScript interfaces
│   │   └── utils/      # Utilities including JSX
│   └── package.json
└── README.md
```

## Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Bun](https://bun.sh/) (latest)
- [PostgreSQL](https://postgresql.org/) (14+)

## Quick Start

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb opus_db

# Update connection string in backend/.env if needed
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies and run
cargo run

# The API will be available at http://localhost:8080
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
bun install

# Start development server
bun run dev

# The frontend will be available at http://localhost:3000
```

## Development

### Backend Commands

```bash
cd backend

# Run with auto-reload
cargo watch -x run

# Format code
cargo fmt

# Lint code
cargo clippy

# Run tests
cargo test
```

### Frontend Commands

```bash
cd frontend

# Development server
bun run dev

# Build for production
bun run build

# Format code
bun run format

# Lint code
bun run lint

# Type checking
bun run typecheck
```

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token

### Books Endpoints

- `GET /api/books` - List books (with search/filter)
- `GET /api/books/:id` - Get book by ID
- `GET /api/books/isbn/:isbn` - Get book by ISBN
- `POST /api/books` - Create book (admin+)
- `PUT /api/books/:id` - Update book (admin+)
- `DELETE /api/books/:id` - Delete book (developer only)
- `POST /api/books/:id/checkout` - Check out book
- `POST /api/books/:id/return` - Return book

### Users Endpoints

- `GET /api/users` - List users (admin+)
- `GET /api/users/:id` - Get user details
- `GET /api/users/:id/checkouts` - Get user's checkouts

### Checkouts Endpoints

- `GET /api/checkouts` - List checkouts
- `GET /api/checkouts/:id` - Get checkout details
- `GET /api/checkouts/overdue` - Get overdue checkouts (admin+)

## Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/opus_db
JWT_SECRET=your-super-secure-jwt-secret-key-here
RUST_LOG=debug
```

### User Roles

- **User**: Can browse books, check out/return, view personal history
- **Admin**: All user permissions + book management, user administration
- **Developer**: All admin permissions + system configuration, book deletion

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

### Code Quality

This project uses automated formatting and linting:

- **Rust**: `cargo fmt` and `cargo clippy`
- **TypeScript**: `prettier` and `eslint`
- **Pre-commit hooks**: Automatically format and lint on commit

## License

MIT License - see LICENSE file for details.