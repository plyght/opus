import './utils/jsx';
import { App } from './components/App';
import { AuthService } from './services/AuthService';

document.addEventListener('DOMContentLoaded', async () => {
    const authService = new AuthService();
    await authService.init();

    const app = <App authService={authService} />;
    document.body.appendChild(app);
});
