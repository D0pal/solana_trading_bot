// import { PUBLIC_BACKEND_URL } from '$env/static/public';
// import type { Handle } from '@sveltejs/kit';

// export const handle: Handle = async ({ event, resolve }) => {
// 	if (event.cookies.get('connect.sid')) {
// 		const res = await fetch(PUBLIC_BACKEND_URL + '/user/status', {
// 			credentials: 'include',
// 			headers: {
// 				Cookie: 'connect.sid=' + event.cookies.get('connect.sid')
// 			}
// 		});
// 		const data = await res.json();
// 		if (res.ok) {
// 			event.locals.user = data;
// 		}
// 	}
// 	const response = await resolve(event);
// 	return response;
// };
