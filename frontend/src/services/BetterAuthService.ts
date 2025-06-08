import { createAuthClient } from 'better-auth/client';
import type { User, AuthResponse } from '../types';

export const authClient = createAuthClient({
    baseURL: 'http://localhost:3001',
    basePathname: '/api/auth',
});

export class BetterAuthService {
    private apiBaseUrl = 'http://localhost:8080/api';
    private token: string | null = null;
    private currentUser: User | null = null;

    async login(credentials: {
        email: string;
        password: string;
    }): Promise<{ token: string; user: User }> {
        return this.signIn(credentials.email, credentials.password);
    }

    async register(userData: {
        email: string;
        password: string;
        name: string;
    }): Promise<{ token: string; user: User }> {
        return this.signUp(userData.email, userData.password, userData.name);
    }

    async init(): Promise<void> {
        const session = await authClient.getSession();
        if (session?.data) {
            try {
                await this.exchangeSessionForJWT();
            } catch (error) {
                console.error('Failed to initialize auth service:', error);
            }
        }
    }

    async exchangeSessionForJWT(): Promise<void> {
        try {
            const session = await authClient.getSession();
            if (!session?.data) {
                throw new Error('No session found');
            }

            const response = await fetch('http://localhost:3001/jwt-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionToken: session.data.session.token }),
            });

            if (!response.ok) {
                throw new Error('Failed to exchange session for JWT');
            }

            const authResponse: AuthResponse = await response.json();
            this.token = authResponse.token;
            this.currentUser = authResponse.user;
            localStorage.setItem('authToken', this.token);
        } catch (error) {
            console.error('JWT exchange failed:', error);
            this.logout();
        }
    }

    async signUp(email: string, password: string, name: string): Promise<AuthResponse> {
        const result = await authClient.signUp.email({
            email,
            password,
            name,
        });

        if (!result.data) {
            throw new Error('Sign up failed');
        }

        await this.exchangeSessionForJWT();
        return {
            token: this.token!,
            user: this.currentUser!,
        };
    }

    async signIn(email: string, password: string): Promise<AuthResponse> {
        const result = await authClient.signIn.email({
            email,
            password,
        });

        if (!result.data) {
            throw new Error('Sign in failed');
        }

        await this.exchangeSessionForJWT();
        return {
            token: this.token!,
            user: this.currentUser!,
        };
    }

    async getCurrentUser(): Promise<User> {
        if (!this.token) {
            throw new Error('No auth token');
        }

        const response = await fetch(`${this.apiBaseUrl}/auth/me`, {
            headers: { Authorization: `Bearer ${this.token}` },
        });

        if (!response.ok) {
            throw new Error('Failed to get current user');
        }

        this.currentUser = await response.json();
        return this.currentUser!;
    }

    async logout(): Promise<void> {
        await authClient.signOut();
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
    }

    isAuthenticated(): boolean {
        return this.token !== null && this.currentUser !== null;
    }

    getUser(): User | null {
        return this.currentUser;
    }

    getToken(): string | null {
        return this.token;
    }

    isAdmin(): boolean {
        return this.currentUser?.role === 'admin' || this.currentUser?.role === 'developer';
    }

    isDeveloper(): boolean {
        return this.currentUser?.role === 'developer';
    }
}
