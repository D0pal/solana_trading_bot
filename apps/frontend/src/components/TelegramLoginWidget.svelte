<script lang="ts">
	import { goto } from '$app/navigation';
	import { PUBLIC_BACKEND_URL } from '$env/static/public';
	import type { TelegramAuthData } from 'shared-types/src/TelegramAuthData.interface';

	async function onTelegramAuth(user: TelegramAuthData) {
		console.log(JSON.stringify(user));
		const res = await fetch(PUBLIC_BACKEND_URL + '/auth/loginWithTelegram', {
			method: 'POST',
			body: JSON.stringify(user),
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			}
		});
		if (res.ok) {
			const data = await res.json();
			goto('/dashboard');
		} else {
			console.error('Failed to login with Telegram');
		}
	}

	// Svelte action to load the Telegram widget
	function loadTelegramWidget(node: HTMLElement) {
		if (typeof window !== 'undefined') {
			window.onTelegramAuth = onTelegramAuth;

			const script = document.createElement('script');
			script.src = 'https://telegram.org/js/telegram-widget.js?7';
			script.async = true;
			script.setAttribute('data-telegram-login', 'SolanaCryptoTradingTestBot');
			script.setAttribute('data-size', 'large');
			script.setAttribute('data-radius', '10');
			script.setAttribute('data-onauth', 'onTelegramAuth(user)');
			script.setAttribute('data-userpic', 'false');
			node.appendChild(script);
		}
	}
</script>

<div class="telegram-login" use:loadTelegramWidget></div>

<style>
	div {
		width: 100%;
		display: flex;
		justify-content: center;
	}
</style>
