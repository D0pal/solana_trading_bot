import axios from 'axios';
// import { token } from '../stores/auth';
import { PUBLIC_BACKEND_URL } from '$env/static/public';

// let jwtToken = '';
// token.subscribe((value: string) => {
// 	jwtToken = value;
// });

const api = axios.create({
	baseURL: PUBLIC_BACKEND_URL
});

api.interceptors.request.use((config) => {
	// if (jwtToken) {
	// 	config.headers.Authorization = `Bearer ${jwtToken}`;
	// }
	config.withCredentials = true;
	return config;
});

export default api;
