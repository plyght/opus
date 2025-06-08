import './utils/jsx';
import { App } from './components/App';
import { BetterAuthService } from './services/BetterAuthService';

document.addEventListener('DOMContentLoaded', async () => {
    const authService = new BetterAuthService();
    await authService.init();

    const app = <App authService={authService} />;
    document.body.appendChild(app);
});
