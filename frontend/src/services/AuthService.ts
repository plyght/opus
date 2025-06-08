import { User, AuthResponse, LoginRequest, RegisterRequest } from '../types';

export class AuthService {
    private apiBaseUrl = 'http://localhost:8080/api';
    private token: string | null = null;
    private currentUser: User | null = null;

    async init(): Promise<void> {
        this.token = localStorage.getItem('authToken');
        if (this.token) {
            try {
                await this.getCurrentUser();
            } catch (error) {
                this.logout();
            }
        }
    }

    async login(credentials: LoginRequest): Promise<AuthResponse> {
        const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        });

        if (!response.ok) {
            throw new Error('Login failed');
        }

        const authResponse: AuthResponse = await response.json();
        this.token = authResponse.token;
        this.currentUser = authResponse.user;
        localStorage.setItem('authToken', this.token);

        return authResponse;
    }

    async register(userData: RegisterRequest): Promise<AuthResponse> {
        const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            throw new Error('Registration failed');
        }

        const authResponse: AuthResponse = await response.json();
        this.token = authResponse.token;
        this.currentUser = authResponse.user;
        localStorage.setItem('authToken', this.token);

        return authResponse;
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

    logout(): void {
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
