import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL;

const axiosClient = axios.create({
    baseURL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true, // 🔥 Required for cookies
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve();
        }
    });
    failedQueue = [];
};

axiosClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (!error.response) {
            return Promise.reject(error);
        }

        const originalRequest = error.config;
        const status = error.response.status;

        // Access token expired → try refresh
        if (status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(() => axiosClient(originalRequest));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                await axios.post(
                    `${baseURL}/auth/refresh`,   // ✅ CORRECT
                    {},
                    { withCredentials: true }
                );

                processQueue(null);
                isRefreshing = false;

                return axiosClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError);
                isRefreshing = false;

                window.location.replace(`${baseURL}/auth/saml/login`);
                return Promise.reject(refreshError);
            }
        }


        return Promise.reject(error);
    }
);

export default axiosClient;