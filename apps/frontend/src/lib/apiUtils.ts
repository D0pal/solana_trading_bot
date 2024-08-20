/* eslint-disable @typescript-eslint/no-unused-vars */
import { loadingStore } from '$stores/loadingStore';
import toast from 'svelte-french-toast';
import api from './api';

export type ApiMethod = 'get' | 'post' | 'put' | 'delete';

export interface ServiceConfig<T, R> {
	method: ApiMethod;
	url: string;
	loadingKey: string;
	payload?: T;
	successMessage?: string;
	onSuccess?: (response: R) => void;
}

export async function genericServiceCall<T, R>({
	method,
	url,
	loadingKey,
	payload,
	successMessage,
	onSuccess
}: ServiceConfig<T, R>): Promise<R | undefined> {
	loadingStore.setLoading(loadingKey, true);

	try {
		const response = await api[method]<R>(url, payload);

		// Check if the response contains a message field
		if (typeof response.data === 'object' && response.data !== null && 'message' in response.data) {
			toast.success(response.data.message as string);
		} else if (successMessage) {
			// Use the provided success message as a fallback
			toast.success(successMessage);
		}

		if (onSuccess) {
			onSuccess(response.data);
		}

		return response.data;
	} catch (error) {
		// The error is already handled by the axios interceptor,
		// so we don't need to do anything here.
		// We just need to prevent the error from propagating further.
	} finally {
		loadingStore.setLoading(loadingKey, false);
	}
}
