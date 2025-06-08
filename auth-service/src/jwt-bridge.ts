import jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;
  email: string; 
  role: 'user' | 'admin' | 'developer';
  exp: number;
  iat: number;
}

export function createCompatibleJWT(userId: string, email: string, role: 'user' | 'admin' | 'developer' = 'user'): string {
  const jwtSecret = process.env.JWT_SECRET || 'default-secret';
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (24 * 60 * 60); // 24 hours
  
  const payload: JwtPayload = {
    sub: userId,
    email,
    role,
    exp,
    iat: now
  };
  
  return jwt.sign(payload, jwtSecret);
}

export function verifyCompatibleJWT(token: string): JwtPayload | null {
  try {
    const jwtSecret = process.env.JWT_SECRET || 'default-secret';
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}