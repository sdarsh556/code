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
});

// Dynamically update baseURL on every request so env switching works instantly
axiosClient.interceptors.request.use((config) => {
    config.baseURL = getBaseUrl();
    return config;
});

export default axiosClient;