import { AuthService } from '../services/AuthService';
import { LoginRequest, RegisterRequest } from '../types';

interface LoginFormProps {
    authService: AuthService;
}

export function LoginForm({ authService }: LoginFormProps): Element {
    let isRegistering = false;

    const toggleMode = () => {
        isRegistering = !isRegistering;
        render();
    };

    const handleLogin = async (e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);

        const credentials: LoginRequest = {
            email: formData.get('email') as string,
            password: formData.get('password') as string,
        };

        try {
            await authService.login(credentials);
            window.location.reload();
        } catch (error) {
            alert('Login failed');
        }
    };

    const handleRegister = async (e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);

        const userData: RegisterRequest = {
            email: formData.get('email') as string,
            username: formData.get('username') as string,
            password: formData.get('password') as string,
            first_name: formData.get('first_name') as string,
            last_name: formData.get('last_name') as string,
        };

        try {
            await authService.register(userData);
            window.location.reload();
        } catch (error) {
            alert('Registration failed');
        }
    };

    const render = () => {
        const container = document.querySelector('#login-container');
        if (container) {
            container.innerHTML = '';
            container.appendChild(createForm());
        }
    };

    const createForm = () => {
        if (isRegistering) {
            return (
                <div className="auth-container">
                    <div className="auth-card">
                        <h1>Register for Opus</h1>
                        <form onSubmit={handleRegister}>
                            <input type="email" name="email" placeholder="Email" required />
                            <input type="text" name="username" placeholder="Username" required />
                            <input
                                type="text"
                                name="first_name"
                                placeholder="First Name"
                                required
                            />
                            <input type="text" name="last_name" placeholder="Last Name" required />
                            <input
                                type="password"
                                name="password"
                                placeholder="Password"
                                required
                            />
                            <button type="submit">Register</button>
                        </form>
                        <p>
                            Already have an account?{' '}
                            <a href="#" onClick={toggleMode}>
                                Sign in
                            </a>
                        </p>
                    </div>
                </div>
            );
        } else {
            return (
                <div className="auth-container">
                    <div className="auth-card">
                        <h1>Sign in to Opus</h1>
                        <form onSubmit={handleLogin}>
                            <input type="email" name="email" placeholder="Email" required />
                            <input
                                type="password"
                                name="password"
                                placeholder="Password"
                                required
                            />
                            <button type="submit">Sign In</button>
                        </form>
                        <p>
                            Don't have an account?{' '}
                            <a href="#" onClick={toggleMode}>
                                Register
                            </a>
                        </p>
                    </div>
                </div>
            );
        }
    };

    const container = (
        <div id="login-container" className="login-form">
            {createForm()}
        </div>
    );

    return container;
}
