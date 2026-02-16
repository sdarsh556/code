import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../css/auth/Login.css';
import awsLogo from '../../assets/aws-logo.png';

function Login() {
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsLoading(true);

        window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/saml/login`;
    };

    return (
        <div className="login-container">
            <div className="background-shapes">
                <div className="shape shape-1"></div>
                <div className="shape shape-2"></div>
                <div className="shape shape-3"></div>
                <div className="shape shape-4"></div>
            </div>

            <div className="login-card">
                <div className="login-header">
                    <img src={awsLogo} alt="AWS Logo" className="aws-logo" />
                    <h1 className="login-title">EDITH</h1>
                    <p className="login-subtitle">
                        Manage your cloud resources in one place
                    </p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <button type="submit" className="login-button" disabled={isLoading}>
                        {isLoading ? (
                            <span className="button-content">
                                Signing in...
                            </span>
                        ) : (
                            <span className="button-content">
                                Sign in with SSO
                            </span>
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <p className="footer-text">
                        Secure access to your AWS infrastructure
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;