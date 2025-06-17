# Multi-stage Dockerfile for Library Management App
# Stage 1: Bun builder for frontend and shared packages
FROM oven/bun:1 AS bun-builder

WORKDIR /app

# Copy package files
COPY package.json bunfig.toml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
COPY prisma ./prisma

# Build shared package
WORKDIR /app/packages/shared
RUN bun run build

# Build web app
WORKDIR /app/apps/web
RUN bun run build

# Stage 2: Rust builder for backend
FROM rust:1.75-slim AS rust-builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy Cargo files
COPY services/api/Cargo.toml services/api/Cargo.lock ./

# Create a dummy src/main.rs to cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release && rm -rf src

# Copy actual source code
COPY services/api/src ./src

# Build the application
RUN cargo build --release

# Stage 3: Runtime image
FROM debian:bookworm-slim AS runtime

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Copy built artifacts
COPY --from=rust-builder /app/target/release/library-api ./api
COPY --from=bun-builder /app/apps/web/dist ./web

# Create a non-root user
RUN useradd -r -s /bin/false appuser
RUN chown -R appuser:appuser /app
USER appuser

# Expose ports
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start the application
CMD ["./api"]