import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: 'http://localhost:5000/api', // Replace with your backend URL
    // withCredentials: true, // Needed if using cookies for authentication
});

// Request Interceptor (Optional - Add Auth Token)
axiosInstance.interceptors.request.use(
    (config) => {
        // Don't add auth token for registration
        // Consider more robust ways to exclude paths if needed
        if (config.url.includes('/auth/register')) {
            return config;
        }
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        // Enhanced logging
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('API Error Response:', error.response.data);
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('API Error Request:', error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('API Error Message:', error.message);
        }
        console.error('API error Config:', error.config);
        return Promise.reject(error); // Reject with the error for further handling
    }
);

export default axiosInstance;
