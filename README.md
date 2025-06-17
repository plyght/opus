# Library Management System

A modern library management application with barcode scanning, automated notifications, and role-based access control.

## Architecture

```mermaid
graph TB
    subgraph "Frontend (React + TypeScript)"
        UI[User Interface]
        Scanner[Barcode Scanner]
        Auth[Auth Components]
        Router[React Router]
        State[State Management]
        
        UI --> Scanner
        UI --> Auth
        Router --> UI
        State --> UI
    end
    
    subgraph "API Layer"
        tRPC[tRPC Client/Server]
        Validation[Zod Schemas]
        
        tRPC --> Validation
    end
    
    subgraph "Backend Services (Rust + Axum)"
        API[REST API Handlers]
        Auth_Service[Auth Service]
        Book_Service[Book Service]
        Checkout_Service[Checkout Service]
        Email_Service[Email Service]
        Middleware[Auth/CORS Middleware]
        
        API --> Auth_Service
        API --> Book_Service
        API --> Checkout_Service
        Middleware --> API
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL/Supabase)]
        Prisma[Prisma ORM]
        SQLx[SQLx Queries]
        Supabase_Client[Supabase Client]
        Realtime[Real-time Subscriptions]
        
        Prisma --> DB
        SQLx --> DB
        Supabase_Client --> DB
        Realtime --> DB
    end
    
    subgraph "External Services"
        OpenLibrary[Open Library API]
        Resend[Resend Email API]
        OAuth_Providers[GitHub/Google OAuth]
        Camera[Device Camera]
        Supabase_API[Supabase API]
    end
    
    subgraph "Background Jobs"
        Cron[Tokio Cron Scheduler]
        Overdue_Job[Overdue Email Job]
        
        Cron --> Overdue_Job
        Overdue_Job --> Email_Service
    end
    
    subgraph "Infrastructure"
        Docker[Docker Containers]
        Nginx[Reverse Proxy]
        SSL[SSL/TLS]
        
        Nginx --> SSL
        Docker --> Nginx
    end
    
    %% Frontend connections
    Router --> tRPC
    Scanner --> Camera
    Auth --> OAuth_Providers
    UI --> Supabase_Client
    State --> Realtime
    
    %% API connections
    tRPC --> API
    
    %% Backend connections
    Book_Service --> OpenLibrary
    Book_Service --> Prisma
    Checkout_Service --> SQLx
    Auth_Service --> SQLx
    Email_Service --> Resend
    Supabase_Client --> Supabase_API
    Realtime --> Supabase_API
    
    %% Styling
    classDef frontend stroke:#000,color:#fff
    classDef backend stroke:#666,color:#fff
    classDef database stroke:#333,color:#fff
    classDef external stroke:#999,color:#fff
    classDef infra stroke:#000,color:#fff
    
    class UI,Scanner,Auth,Router,State frontend
    class API,Auth_Service,Book_Service,Checkout_Service,Email_Service,Middleware,Cron,Overdue_Job backend
    class DB,Prisma,SQLx,Supabase_Client,Realtime database
    class OpenLibrary,Resend,OAuth_Providers,Camera,Supabase_API external
    class Docker,Nginx,SSL infra
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend UI** | React + TypeScript + Vite | Component-based SPA with hot reload |
| **Routing** | React Router | Client-side navigation |
| **State Management** | React Context/Zustand | Global state management |
| **Styling** | Tailwind CSS | Utility-first CSS framework |
| **Barcode Scanning** | @zxing/browser | Client-side ISBN recognition |
| **Form Validation** | Zod + React Hook Form | Type-safe form handling |
| **API Layer** | tRPC | End-to-end type safety |
| **Backend Framework** | Rust + Axum | High-performance async web framework |
| **Database ORM** | Prisma + SQLx | Type-safe database queries |
| **Database** | PostgreSQL/Supabase | ACID-compliant relational database |
| **Real-time** | Supabase Real-time | Live data synchronization and subscriptions |
| **Authentication** | Better Auth | Session management + OAuth |
| **Background Jobs** | Tokio Cron | Scheduled task execution |
| **Email Service** | Resend API | Transactional email delivery |
| **External APIs** | Open Library API | Book metadata retrieval |
| **Runtime** | Bun Workspace | Fast package management |
| **Containerization** | Docker + Docker Compose | Development and deployment |
| **Reverse Proxy** | Nginx | Load balancing and SSL termination |
| **SSL/TLS** | Let's Encrypt | HTTPS certificate management |

### Data Flow

1. **User Interaction** → React components handle UI events
2. **Form Submission** → Zod validation → tRPC client call
3. **API Request** → Axum middleware → Service layer → Database
4. **Background Jobs** → Tokio cron → Email notifications
5. **External APIs** → ISBN lookup → Book metadata enrichment

## Quick Start

**Prerequisites:** Bun, Rust, PostgreSQL

```bash
# 1. Clone and install
git clone <your-repo-url> && cd library-management-app
cp .env.example .env
bun install

# 2. Setup database
createdb library_db
bun run db:migrate && bun run db:generate

# 3. Start development
bun run dev
```

Frontend: http://localhost:3000 | Backend: http://localhost:8080

## Database Options

### Option 1: Supabase (Recommended for Production)

Supabase provides managed PostgreSQL with additional features like real-time subscriptions, built-in auth, and automatic backups.

**Setup:**
1. Create a Supabase project at https://supabase.com
2. Follow the guide: `scripts/setup-supabase.md`
3. Configure environment variables with Supabase credentials

**Benefits:**
- Managed PostgreSQL database
- Built-in real-time subscriptions
- Automatic backups and scaling
- Global CDN and edge functions
- Row-level security (RLS)

### Option 2: Local PostgreSQL

For local development or custom deployments.

**Setup:**
```bash
# Install PostgreSQL
createdb library_db
cp .env.example .env
# Update DATABASE_URL in .env
bun run db:migrate
```

### Option 3: Docker PostgreSQL

Using the included Docker Compose setup.

**Setup:**
```bash
docker-compose --profile local-db up -d postgres
bun run db:migrate
```

## Environment Setup

Create `.env` from `.env.example`:

**For Supabase:**
```bash
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"
BETTER_AUTH_SECRET="your-secure-secret-here"
RESEND_API_KEY="your-resend-api-key"
```

**For Local PostgreSQL:**
```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/library_db"
BETTER_AUTH_SECRET="your-secure-secret-here"
RESEND_API_KEY="your-resend-api-key"
```

## Commands

```bash
bun run dev          # Start development servers
bun run build        # Build for production
bun run test         # Run tests
bun run lint         # Lint code
bun run db:migrate   # Run database migrations
```

## Features

- **Book Management** - Add, edit, delete books with ISBN integration and Open Library API metadata
- **User Management** - Role-based access control with administrative privileges
- **Barcode Scanning** - Camera-based ISBN scanning with real-time operation feedback
- **Checkout System** - Track loans, renewals, and returns with live status updates
- **Real-time Updates** - Live book availability and checkout status synchronization across all clients
- **Email Notifications** - Automated overdue alerts via Resend API
- **Authentication** - Session management with OAuth support (GitHub, Google)
- **Live Dashboard** - Real-time statistics and system connectivity monitoring
- **Connection Status** - Visual indicators for real-time data synchronization status