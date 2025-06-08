export interface User {
    id: string;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    role: UserRole;
}

export enum UserRole {
    User = 'user',
    Admin = 'admin',
    Developer = 'developer',
}

export interface Book {
    id: string;
    isbn?: string;
    title: string;
    author: string;
    publisher?: string;
    publication_date?: string;
    description?: string;
    cover_url?: string;
    genre?: string;
    page_count?: number;
    language?: string;
    status: BookStatus;
    location?: string;
    barcode?: string;
    open_library_id?: string;
    created_at: string;
    updated_at: string;
}

export enum BookStatus {
    Available = 'available',
    CheckedOut = 'checked_out',
    Reserved = 'reserved',
    Maintenance = 'maintenance',
    Lost = 'lost',
}

export interface Checkout {
    id: string;
    user_id: string;
    book_id: string;
    checked_out_at: string;
    due_date: string;
    returned_at?: string;
    status: CheckoutStatus;
    notes?: string;
    renewal_count: number;
    created_at: string;
    updated_at: string;
}

export enum CheckoutStatus {
    Active = 'active',
    Returned = 'returned',
    Overdue = 'overdue',
    Lost = 'lost',
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    username: string;
    password: string;
    first_name: string;
    last_name: string;
}

export interface CreateBookRequest {
    isbn?: string;
    title: string;
    author: string;
    publisher?: string;
    description?: string;
    genre?: string;
    location?: string;
    barcode?: string;
}

export interface BookListResponse {
    books: Book[];
    total: number;
    page: number;
    limit: number;
}

export interface SearchQuery {
    q?: string;
    author?: string;
    genre?: string;
    status?: BookStatus;
    page?: number;
    limit?: number;
}
