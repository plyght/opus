import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import { createCompatibleJWT } from './jwt-bridge.js';

const app = express();
const port = 3001;

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/opus_db'
});

const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true
  },
  session: {
    expiresIn: 60 * 60 * 24,
    updateAge: 60 * 60 * 24
  },
  secret: process.env.BETTER_AUTH_SECRET || 'your-secret-key-change-in-production',
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3001',
  callbacks: {
    async onSignUp(user: any) {
      console.log('User signed up:', user.email);
    },
    async onSignIn(user: any, request: any) {
      console.log('User signed in:', user.email);
    }
  }
});

app.all('/api/auth/*', (req: Request, res: Response) => {
  const request = new Request(`${req.protocol}://${req.get('host')}${req.originalUrl}`, {
    method: req.method,
    headers: req.headers as any,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
  });

  auth.handler(request).then((response) => {
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    return response.text().then(text => res.send(text));
  }).catch((error) => {
    console.error('Auth handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  });
});

app.post('/jwt-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionToken } = req.body;
    
    if (!sessionToken) {
      res.status(400).json({ error: 'Session token required' });
      return;
    }
    
    const session = await auth.api.getSession({ 
      headers: new Headers({ 
        'cookie': `better-auth.session_token=${sessionToken}` 
      }) 
    });
    
    if (!session?.user) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }
    
    const jwtToken = createCompatibleJWT(session.user.id, session.user.email);
    
    res.json({ 
      token: jwtToken,
      user: {
        id: session.user.id,
        email: session.user.email,
        username: session.user.email.split('@')[0],
        first_name: session.user.name?.split(' ')[0] || '',
        last_name: session.user.name?.split(' ').slice(1).join(' ') || '',
        role: 'user'
      }
    });
  } catch (error) {
    console.error('JWT token creation failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'opus-auth-service' });
});

app.listen(port, () => {
  console.log(`Auth service running on http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});