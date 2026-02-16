import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL;

const publicAxios = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true // 🔥 REQUIRED for cookie-based auth
});

/* ===============================
   RESPONSE INTERCEPTOR (Optional)
================================ */
publicAxios.interceptors.response.use(
    response => response,
    error => Promise.reject(error)
);

export default publicAxios;
