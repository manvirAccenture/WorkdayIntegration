import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error logging
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API Client] Request failed:', error.message);
    return Promise.reject(error);
  }
);

export default apiClient;
