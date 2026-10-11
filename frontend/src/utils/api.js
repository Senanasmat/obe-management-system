
import axios from 'axios';

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Attach the saved JWT to protected API requests.
api.interceptors.request.use(
    (config) => {
        const userInfo = localStorage.getItem('userInfo');

        if (userInfo) {
            try {
                const user = JSON.parse(userInfo);

                // Use the token property returned by your login API.
                if (user.token) {
                    config.headers.Authorization = `Bearer ${user.token}`;
                }
            } catch (error) {
                console.error('Could not read saved login information:', error);
            }
        }

        return config;
    },
    (error) => Promise.reject(error)
);

export default api;
