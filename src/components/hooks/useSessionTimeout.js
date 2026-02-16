import { useEffect, useRef } from 'react';
import { logout } from '../utils/auth';

/**
 * useSessionTimeout
 * Logs out user after a period of inactivity
 * @param {number} timeoutDuration - milliseconds
 */
export default function useSessionTimeout(timeoutDuration = 15 * 60 * 1000) {
    const timerRef = useRef(null);

    const resetTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            alert('Session expired due to inactivity.');
            logout();
        }, timeoutDuration);
    };

    useEffect(() => {
        const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

        events.forEach(event => window.addEventListener(event, resetTimer));

        resetTimer();

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach(event => window.removeEventListener(event, resetTimer));
        };
    }, [timeoutDuration]);
}