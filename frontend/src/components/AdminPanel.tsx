import { useState, useEffect } from '../utils/jsx';
import type { ApiService } from '../services/ApiService';
import type { AuthService } from '../services/AuthService';
import type { User, Book, Checkout, CreateBookRequest } from '../types';

interface AdminPanelProps {
    apiService: ApiService;
    authService?: AuthService;
}

export function AdminPanel({ apiService }: AdminPanelProps): Element {
    const [activeTab, setActiveTab] = useState<'users' | 'books' | 'checkouts' | 'stats'>('users');
    const [users, setUsers] = useState<User[]>([]);
    const [books, setBooks] = useState<Book[]>([]);
    const [checkouts, setCheckouts] = useState<Checkout[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAddBookForm, setShowAddBookForm] = useState(false);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const userList = await apiService.getUsers();
            setUsers(userList);
        } catch (err) {
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const loadBooks = async () => {
        setLoading(true);
        try {
            const response = await apiService.searchBooks({ limit: 100 });
            setBooks(response.books);
        } catch (err) {
            setError('Failed to load books');
        } finally {
            setLoading(false);
        }
    };

    const loadCheckouts = async () => {
        setLoading(true);
        try {
            const checkoutList = await apiService.getActiveCheckouts();
            setCheckouts(checkoutList);
        } catch (err) {
            setError('Failed to load checkouts');
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (tab: 'users' | 'books' | 'checkouts' | 'stats') => {
        setActiveTab(tab);
        setError(null);
        
        switch (tab) {
            case 'users':
                loadUsers();
                break;
            case 'books':
                loadBooks();
                break;
            case 'checkouts':
                loadCheckouts();
                break;
        }
    };

    const handleAddBook = async (event: Event) => {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        const formData = new FormData(form);
        
        const bookData: CreateBookRequest = {
            title: formData.get('title') as string,
            author: formData.get('author') as string,
            isbn: formData.get('isbn') as string || undefined,
            publisher: formData.get('publisher') as string || undefined,
            description: formData.get('description') as string || undefined,
            genre: formData.get('genre') as string || undefined,
            location: formData.get('location') as string || undefined,
            barcode: formData.get('barcode') as string || undefined,
        };

        try {
            await apiService.createBook(bookData);
            setShowAddBookForm(false);
            form.reset();
            await loadBooks();
        } catch (err) {
            setError('Failed to create book');
        }
    };

    const handleDeleteBook = async (bookId: string) => {
        if (!confirm('Are you sure you want to delete this book?')) {
            return;
        }

        try {
            await apiService.deleteBook(bookId);
            await loadBooks();
        } catch (err) {
            setError('Failed to delete book');
        }
    };

    const handleReturnBook = async (checkoutId: string) => {
        try {
            await apiService.returnBook(checkoutId);
            await loadCheckouts();
        } catch (err) {
            setError('Failed to return book');
        }
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString();
    };

    const isOverdue = (dueDateString: string): boolean => {
        return new Date(dueDateString) < new Date();
    };

    useEffect(() => {
        loadUsers();
    }, []);

    return (
        <div className="admin-panel">
            <div className="admin-header">
                <h2>Admin Panel</h2>
                <nav className="admin-tabs">
                    <button
                        className={activeTab === 'users' ? 'active' : ''}
                        onClick={() => handleTabChange('users')}
                    >
                        Users
                    </button>
                    <button
                        className={activeTab === 'books' ? 'active' : ''}
                        onClick={() => handleTabChange('books')}
                    >
                        Books
                    </button>
                    <button
                        className={activeTab === 'checkouts' ? 'active' : ''}
                        onClick={() => handleTabChange('checkouts')}
                    >
                        Checkouts
                    </button>
                    <button
                        className={activeTab === 'stats' ? 'active' : ''}
                        onClick={() => handleTabChange('stats')}
                    >
                        Statistics
                    </button>
                </nav>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {loading && (
                <div className="loading">Loading...</div>
            )}

            <div className="admin-content">
                {activeTab === 'users' && (
                    <div className="users-tab">
                        <h3>Users ({users.length})</h3>
                        <div className="users-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Username</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.id}>
                                            <td>{user.first_name} {user.last_name}</td>
                                            <td>{user.email}</td>
                                            <td>{user.username}</td>
                                            <td className={`role-${user.role}`}>{user.role}</td>
                                            <td>Active</td>
                                            <td>N/A</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'books' && (
                    <div className="books-tab">
                        <div className="books-header">
                            <h3>Books ({books.length})</h3>
                            <button
                                className="add-book-btn"
                                onClick={() => setShowAddBookForm(!showAddBookForm)}
                            >
                                {showAddBookForm ? 'Cancel' : 'Add Book'}
                            </button>
                        </div>

                        {showAddBookForm && (
                            <form className="add-book-form" onSubmit={handleAddBook}>
                                <h4>Add New Book</h4>
                                <div className="form-grid">
                                    <input type="text" name="title" placeholder="Title *" required />
                                    <input type="text" name="author" placeholder="Author *" required />
                                    <input type="text" name="isbn" placeholder="ISBN" />
                                    <input type="text" name="publisher" placeholder="Publisher" />
                                    <input type="text" name="genre" placeholder="Genre" />
                                    <input type="text" name="location" placeholder="Location" />
                                    <input type="text" name="barcode" placeholder="Barcode" />
                                    <textarea name="description" placeholder="Description"></textarea>
                                </div>
                                <div className="form-actions">
                                    <button type="submit">Add Book</button>
                                    <button type="button" onClick={() => setShowAddBookForm(false)}>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className="books-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Author</th>
                                        <th>ISBN</th>
                                        <th>Status</th>
                                        <th>Location</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {books.map((book) => (
                                        <tr key={book.id}>
                                            <td>{book.title}</td>
                                            <td>{book.author}</td>
                                            <td>{book.isbn || 'N/A'}</td>
                                            <td className={`status-${book.status}`}>{book.status}</td>
                                            <td>{book.location || 'N/A'}</td>
                                            <td>
                                                <button
                                                    className="delete-btn"
                                                    onClick={() => handleDeleteBook(book.id)}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'checkouts' && (
                    <div className="checkouts-tab">
                        <h3>Active Checkouts ({checkouts.length})</h3>
                        <div className="checkouts-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Book</th>
                                        <th>User</th>
                                        <th>Checked Out</th>
                                        <th>Due Date</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {checkouts.map((checkout) => (
                                        <tr key={checkout.id} className={isOverdue(checkout.due_date) ? 'overdue' : ''}>
                                            <td>N/A</td>
                                            <td>N/A</td>
                                            <td>{formatDate(checkout.checked_out_at)}</td>
                                            <td>{formatDate(checkout.due_date)}</td>
                                            <td className={`status-${checkout.status}`}>
                                                {checkout.status}
                                                {isOverdue(checkout.due_date) && ' (OVERDUE)'}
                                            </td>
                                            <td>
                                                <button
                                                    className="return-btn"
                                                    onClick={() => handleReturnBook(checkout.id)}
                                                >
                                                    Return
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'stats' && (
                    <div className="stats-tab">
                        <h3>Library Statistics</h3>
                        <div className="stats-grid">
                            <div className="stat-card">
                                <h4>Total Books</h4>
                                <p className="stat-number">{books.length}</p>
                            </div>
                            <div className="stat-card">
                                <h4>Total Users</h4>
                                <p className="stat-number">{users.length}</p>
                            </div>
                            <div className="stat-card">
                                <h4>Active Checkouts</h4>
                                <p className="stat-number">{checkouts.length}</p>
                            </div>
                            <div className="stat-card">
                                <h4>Overdue Books</h4>
                                <p className="stat-number">
                                    {checkouts.filter(c => isOverdue(c.due_date)).length}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}