import axios from 'axios';

// Create an Axios instance
const apiClient = axios.create({
    baseURL: 'https://narutouzumaki.kz/api', // Base API URL
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add a request interceptor
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token'); // Retrieve the token from storage
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`; // Add the token to the header
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Export the API client
export default apiClient;
