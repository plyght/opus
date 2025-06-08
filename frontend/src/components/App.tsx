import { BetterAuthService } from '../services/BetterAuthService';
import { ApiService } from '../services/ApiService';
import { LoginForm } from './LoginForm';
import { Dashboard } from './Dashboard';

interface AppProps {
    authService: BetterAuthService;
}

export function App({ authService }: AppProps): Element {
    const apiService = new ApiService(() => authService.getToken());

    if (authService.isAuthenticated()) {
        return <Dashboard authService={authService} apiService={apiService} />;
    } else {
        return <LoginForm authService={authService} />;
    }
}
