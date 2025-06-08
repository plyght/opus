import { useState, useEffect, Fragment } from '../utils/jsx';
import type { ApiService } from '../services/ApiService';
import type { AuthService } from '../services/AuthService';
import type { Book, SearchQuery } from '../types';
import { BookStatus } from '../types';

interface BookListProps {
    apiService: ApiService;
    authService?: AuthService;
}

export function BookList({ apiService }: BookListProps): Element {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<BookStatus | ''>('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const loadBooks = async (page = 1) => {
        setLoading(true);
        setError(null);
        
        try {
            const query: SearchQuery = {
                page,
                limit: 20,
            };
            
            if (searchQuery.trim()) {
                query.q = searchQuery.trim();
            }
            
            if (selectedStatus) {
                query.status = selectedStatus as BookStatus;
            }
            
            const response = await apiService.searchBooks(query);
            setBooks(response.books);
            setCurrentPage(response.page);
            setTotalPages(Math.ceil(response.total / response.limit));
        } catch (err) {
            setError('Failed to load books');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setCurrentPage(1);
        loadBooks(1);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        loadBooks(page);
    };

    const handleCheckout = async (bookId: string) => {
        try {
            await apiService.createCheckout({ book_id: bookId });
            await loadBooks(currentPage);
        } catch (err) {
            setError('Failed to checkout book');
        }
    };

    const formatStatus = (status: BookStatus): string => {
        switch (status) {
            case BookStatus.Available:
                return 'Available';
            case BookStatus.CheckedOut:
                return 'Checked Out';
            case BookStatus.Reserved:
                return 'Reserved';
            case BookStatus.Maintenance:
                return 'Maintenance';
            case BookStatus.Lost:
                return 'Lost';
            default:
                return status;
        }
    };

    const getStatusClass = (status: BookStatus): string => {
        switch (status) {
            case BookStatus.Available:
                return 'status-available';
            case BookStatus.CheckedOut:
                return 'status-checked-out';
            case BookStatus.Reserved:
                return 'status-reserved';
            case BookStatus.Maintenance:
                return 'status-maintenance';
            case BookStatus.Lost:
                return 'status-lost';
            default:
                return '';
        }
    };

    // Load initial books
    useEffect(() => {
        loadBooks();
    }, []);

    return (
        <div className="book-list">
            <div className="book-list-header">
                <h2>Library Books</h2>
                <div className="search-controls">
                    <input
                        type="text"
                        placeholder="Search books..."
                        value={searchQuery}
                        onInput={(e: any) => setSearchQuery((e.target as HTMLInputElement).value)}
                        onKeyPress={(e: any) => e.key === 'Enter' && handleSearch()}
                    />
                    <select
                        value={selectedStatus}
                        onChange={(e: any) => setSelectedStatus((e.target as HTMLSelectElement).value as BookStatus | '')}
                    >
                        <option value="">All Status</option>
                        <option value={BookStatus.Available}>Available</option>
                        <option value={BookStatus.CheckedOut}>Checked Out</option>
                        <option value={BookStatus.Reserved}>Reserved</option>
                        <option value={BookStatus.Maintenance}>Maintenance</option>
                        <option value={BookStatus.Lost}>Lost</option>
                    </select>
                    <button onClick={handleSearch} disabled={loading}>
                        Search
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="loading">Loading books...</div>
            ) : (
                <Fragment children={[]}>
                    <div className="books-grid">
                        {books.map((book) => (
                            <div key={book.id} className="book-card">
                                {book.cover_url && (
                                    <img src={book.cover_url} alt={book.title} className="book-cover" />
                                )}
                                <div className="book-info">
                                    <h3 className="book-title">{book.title}</h3>
                                    <p className="book-author">by {book.author}</p>
                                    {book.publisher && (
                                        <p className="book-publisher">{book.publisher}</p>
                                    )}
                                    {book.genre && (
                                        <p className="book-genre">Genre: {book.genre}</p>
                                    )}
                                    {book.location && (
                                        <p className="book-location">Location: {book.location}</p>
                                    )}
                                    <div className={`book-status ${getStatusClass(book.status)}`}>
                                        {formatStatus(book.status)}
                                    </div>
                                    {book.status === BookStatus.Available && (
                                        <button
                                            className="checkout-btn"
                                            onClick={() => handleCheckout(book.id)}
                                        >
                                            Check Out
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage <= 1}
                            >
                                Previous
                            </button>
                            <span className="page-info">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage >= totalPages}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </Fragment>
            )}
        </div>
    );
}