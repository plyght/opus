# Supabase Setup Guide

This guide will help you set up your library management system with Supabase.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Node.js and Bun installed
- Git repository with this project

## Step 1: Create a Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Choose your organization
4. Give your project a name (e.g., "library-management")
5. Generate a secure database password
6. Select a region close to your users
7. Click "Create new project"

## Step 2: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update your `.env` file with Supabase credentials:
   - Go to Project Settings > Database in your Supabase dashboard
   - Copy the connection pooling URL to `DATABASE_URL`
   - Copy the direct connection URL to `DIRECT_URL`
   - Go to Project Settings > API
   - Copy the Project URL to `SUPABASE_URL` and `VITE_SUPABASE_URL`
   - Copy the anon public key to `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY`
   - Copy the service_role key to `SUPABASE_SERVICE_ROLE_KEY`

## Step 3: Run Database Migrations

1. Generate Prisma client:
   ```bash
   bun run db:generate
   ```

2. Push the schema to Supabase:
   ```bash
   bun run db:migrate
   ```

## Step 4: Enable Real-time (Optional)

If you want to use real-time features:

1. Go to your Supabase dashboard
2. Navigate to Database > Replication
3. Enable replication for the tables you want to subscribe to:
   - `books` (for real-time availability updates)
   - `checkouts` (for real-time checkout status)

## Step 5: Set up Row Level Security (Recommended)

For production environments, enable RLS:

1. Go to Authentication > Policies in your Supabase dashboard
2. Enable RLS for your tables
3. Create policies based on your security requirements

Example policies:

```sql
-- Allow authenticated users to read books
CREATE POLICY "Users can view books" ON books
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow users to view their own checkouts
CREATE POLICY "Users can view own checkouts" ON checkouts
  FOR SELECT USING (auth.uid() = user_id);
```

## Step 6: Test the Connection

Run the development server:

```bash
bun run dev
```

Your application should now be connected to Supabase!

## Troubleshooting

- **Connection Issues**: Verify your DATABASE_URL and DIRECT_URL are correct
- **Migration Issues**: Make sure you're using the DIRECT_URL for migrations
- **Real-time Not Working**: Check that replication is enabled for your tables
- **Authentication Issues**: Verify your Better Auth configuration matches your Supabase setup

## Production Deployment

When deploying to production:

1. Update your environment variables in your hosting platform
2. Make sure to use the production Supabase URLs
3. Consider enabling additional security features like RLS
4. Set up proper backup strategies
5. Monitor your database usage and performance