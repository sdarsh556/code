import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

const BACKEND_BASE = import.meta.env.VITE_BACKEND_URL;

function AuthGuard() {
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        let mounted = true;

        const verify = async () => {
            try {
                await axiosClient.get('/auth/session');
                if (mounted) {
                    setChecking(false);
                }
            } catch (err) {
                // If session invalid → immediately start SAML login
                window.location.replace(
                    `${BACKEND_BASE}/api/auth/saml/login`
                );
            }
        };

        verify();

        return () => {
            mounted = false;
        };
    }, []);

    if (checking) {
        return (
            <div
                style={{
                    height: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <span>🔐 Verifying session...</span>
            </div>
        );
    }

    return <Outlet />;
}

export default AuthGuard;