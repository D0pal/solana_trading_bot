import { redirect } from '@sveltejs/kit';
import type { UserInfo } from 'shared-types/src/userInfo.interface';
import { PUBLIC_BACKEND_URL } from '$env/static/public';

import type { LayoutServerLoad } from './$types';
export const load: LayoutServerLoad = async ({ fetch, cookies }) => {
	let response;
	try {
		response = await fetch(PUBLIC_BACKEND_URL + '/user/info', {
			credentials: 'include',
			headers: {
				Cookie: 'connect.sid=' + cookies.get('connect.sid')
			}
		});
	} catch (error) {
		if (error instanceof Response) {
			// This is a redirect, so we just throw it
			throw error;
		}
		console.error('Error loading user info:', error);
		return {
			status: 500,
			error: new Error('Failed to load user info')
		};
	}

	if (!response.ok) {
		redirect(302, `/login`);
	}

	const userInfo: UserInfo = await response.json();
	return { userInfo };
};
