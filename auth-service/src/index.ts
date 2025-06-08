import express from 'express';
import cors from 'cors';
import { betterAuth } from 'better-auth';
import Database from 'better-sqlite3';
import { toExpressHandler } from 'better-auth/adapters/express';
import { createCompatibleJWT } from './jwt-bridge.js';

const app = express();
const port = 3001;

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

const db = new Database('./auth.db');

const auth = betterAuth({
  database: db,
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
    async onSignUp(user) {
      console.log('User signed up:', user.email);
    },
    async onSignIn(user, request) {
      console.log('User signed in:', user.email);
    }
  }
});

app.use('/auth/*', toExpressHandler(auth));

app.post('/jwt-token', async (req, res) => {
  try {
    const { sessionToken } = req.body;
    
    if (!sessionToken) {
      return res.status(400).json({ error: 'Session token required' });
    }
    
    const session = await auth.api.getSession({ headers: { cookie: `better-auth.session_token=${sessionToken}` } });
    
    if (!session?.user) {
      return res.status(401).json({ error: 'Invalid session' });
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