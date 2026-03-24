import axios from "axios";

export let activeEnv = sessionStorage.getItem('app_env') || 'uat';
export const setActiveEnv = (env) => { 
    activeEnv = env; 
    sessionStorage.setItem('app_env', env);
};

const getBaseUrl = () => {
    return activeEnv === 'pp'
        ? import.meta.env.VITE_API_BASE_URL_PP
        : import.meta.env.VITE_API_BASE_URL;
};

const axiosClient = axios.create({
    baseURL: getBaseUrl(),
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

axiosClient.interceptors.request.use((config) => {
    config.baseURL = getBaseUrl();
    return config;
});

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
                    `${getBaseUrl()}/auth/refresh`,   // ✅ CORRECT
                    {},
                    { withCredentials: true }
                );

                processQueue(null);
                isRefreshing = false;

                return axiosClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError);
                isRefreshing = false;

                window.location.replace(`${getBaseUrl()}/auth/saml/login`);
                return Promise.reject(refreshError);
            }
        }


        return Promise.reject(error);
    }
);

export default axiosClient;