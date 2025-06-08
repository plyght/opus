import type { Book, BookListResponse, CreateBookRequest, SearchQuery, Checkout, User } from '../types';

export class ApiService {
    private apiBaseUrl = 'http://localhost:8080/api';

    constructor(private getToken: () => string | null) {}

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        };

        const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    // Books API
    async getBooks(query: SearchQuery = {}): Promise<BookListResponse> {
        const params = new URLSearchParams();
        Object.entries(query).forEach(([key, value]) => {
            if (value !== undefined) {
                params.append(key, value.toString());
            }
        });

        return this.request<BookListResponse>(`/books?${params}`);
    }

    async searchBooks(query: SearchQuery = {}): Promise<BookListResponse> {
        return this.getBooks(query);
    }

    async getBook(id: string): Promise<Book> {
        return this.request<Book>(`/books/${id}`);
    }

    async getBookByIsbn(isbn: string): Promise<Book> {
        return this.request<Book>(`/books/isbn/${isbn}`);
    }

    async createBook(book: CreateBookRequest): Promise<Book> {
        return this.request<Book>('/books', {
            method: 'POST',
            body: JSON.stringify(book),
        });
    }

    async createBookFromISBN(isbn: string): Promise<Book> {
        return this.request<Book>('/books/isbn', {
            method: 'POST',
            body: JSON.stringify({ isbn }),
        });
    }

    async updateBook(id: string, updates: Partial<CreateBookRequest>): Promise<Book> {
        return this.request<Book>(`/books/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }

    async deleteBook(id: string): Promise<void> {
        await this.request<void>(`/books/${id}`, {
            method: 'DELETE',
        });
    }

    async checkoutBook(bookId: string, dueDate?: string): Promise<void> {
        await this.request<void>(`/books/${bookId}/checkout`, {
            method: 'POST',
            body: JSON.stringify({ due_date: dueDate }),
        });
    }

    async createCheckout(data: { book_id: string; due_date?: string }): Promise<Checkout> {
        return this.request<Checkout>('/checkouts', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async returnBook(checkoutId: string): Promise<void> {
        await this.request<void>(`/checkouts/${checkoutId}/return`, {
            method: 'POST',
        });
    }

    // Users API
    async getUsers(): Promise<User[]> {
        return this.request<User[]>('/users');
    }

    async getUser(id: string): Promise<User> {
        return this.request<User>(`/users/${id}`);
    }

    async getUserCheckouts(userId: string): Promise<Checkout[]> {
        return this.request<Checkout[]>(`/users/${userId}/checkouts`);
    }

    // Checkouts API
    async getCheckouts(): Promise<Checkout[]> {
        return this.request<Checkout[]>('/checkouts');
    }

    async getActiveCheckouts(): Promise<Checkout[]> {
        return this.request<Checkout[]>('/checkouts?status=active');
    }

    async getCheckout(id: string): Promise<Checkout> {
        return this.request<Checkout>(`/checkouts/${id}`);
    }

    async getOverdueCheckouts(): Promise<Checkout[]> {
        return this.request<Checkout[]>('/checkouts/overdue');
    }
}
