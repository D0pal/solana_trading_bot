import { PUBLIC_BACKEND_URL } from '$env/static/public';
import axios, { AxiosError } from 'axios';
import toast from 'svelte-french-toast';

interface ApiError {
	message: string;
}

const handleError = (error: AxiosError<ApiError>) => {
	const errorMessage = error.response?.data?.message || 'An unexpected error occurred';
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
	config.withCredentials = true;
	return config;
});

export default api;
