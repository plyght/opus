import { AuthService } from '../services/AuthService';
import { ApiService } from '../services/ApiService';
import { BookList } from './BookList';
import { BookScanner } from './BookScanner';
import { AdminPanel } from './AdminPanel';

interface DashboardProps {
    authService: AuthService;
    apiService: ApiService;
}

export function Dashboard({ authService, apiService }: DashboardProps): Element {
    let currentView = 'books';

    const user = authService.getUser()!;

    const handleLogout = () => {
        authService.logout();
        window.location.reload();
    };

    const switchView = (view: string) => {
        currentView = view;
        renderContent();
    };

    const renderContent = () => {
        const contentContainer = document.querySelector('#content');
        if (!contentContainer) return;

        contentContainer.innerHTML = '';

        let content: Element;
        switch (currentView) {
            case 'books':
                content = <BookList apiService={apiService} authService={authService} />;
                break;
            case 'scanner':
                content = <BookScanner apiService={apiService} />;
                break;
            case 'admin':
                content = <AdminPanel apiService={apiService} authService={authService} />;
                break;
            default:
                content = <BookList apiService={apiService} authService={authService} />;
        }

        contentContainer.appendChild(content);
    };

    const container = (
        <div className="dashboard">
            <header className="dashboard-header">
                <h1>Opus Library</h1>
                <nav className="dashboard-nav">
                    <button
                        className={currentView === 'books' ? 'active' : ''}
                        onClick={() => switchView('books')}
                    >
                        Books
                    </button>
                    <button
                        className={currentView === 'scanner' ? 'active' : ''}
                        onClick={() => switchView('scanner')}
                    >
                        Scanner
                    </button>
                    {authService.isAdmin() && (
                        <button
                            className={currentView === 'admin' ? 'active' : ''}
                            onClick={() => switchView('admin')}
                        >
                            Admin
                        </button>
                    )}
                </nav>
                <div className="user-info">
                    <span>Welcome, {user.first_name}</span>
                    <button onClick={handleLogout}>Logout</button>
                </div>
            </header>
            <main id="content" className="dashboard-content">
                <BookList apiService={apiService} authService={authService} />
            </main>
        </div>
    );

    // Set up initial content after DOM is attached
    setTimeout(renderContent, 0);

    return container;
}
