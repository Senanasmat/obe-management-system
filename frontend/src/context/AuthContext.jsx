import { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const timerRef = useRef(null);

    const doLogout = useCallback(() => {
        localStorage.removeItem('userInfo');
        setUser(null);
    }, []);

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(doLogout, SESSION_TIMEOUT_MS);
    }, [doLogout]);

    // Attach activity listeners whenever a user is logged in
    useEffect(() => {
        if (!user) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
        events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
        resetTimer();

        return () => {
            events.forEach(e => window.removeEventListener(e, resetTimer));
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [user, resetTimer]);

    useEffect(() => {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            setUser(JSON.parse(userInfo));
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                },
            };
            const { data } = await api.post('/api/users/login', { email, password }, config);

            localStorage.setItem('userInfo', JSON.stringify(data));
            setUser(data);
            return { success: true, data };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || error.message };
        }
    };

    const logout = () => {
        doLogout();
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
