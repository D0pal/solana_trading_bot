import axios, { AxiosError } from 'axios';
import toast from 'svelte-french-toast';

// import { token } from '../stores/auth';
import { PUBLIC_BACKEND_URL } from '$env/static/public';

// let jwtToken = '';
// token.subscribe((value: string) => {
// 	jwtToken = value;
// });

interface ApiError {
	message: string;
}

const handleError = (error: AxiosError<ApiError>) => {
	const errorMessage = error.response?.data?.message || 'An unexpected error occurred';
	// console.error('API Error:', errorMessage);
	toast.error(errorMessage);
	return Promise.reject(error);
};

const api = axios.create({
	baseURL: PUBLIC_BACKEND_URL
});

api.interceptors.response.use(
	(response) => response,
	(error: AxiosError<ApiError>) => handleError(error)
);

api.interceptors.request.use((config) => {
	// if (jwtToken) {
	// 	config.headers.Authorization = `Bearer ${jwtToken}`;
	// }
	config.withCredentials = true;
	return config;
});

export default api;
