import flowbitePlugin from 'flowbite/plugin';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}', '../../node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}'],
	darkMode: 'selector',
	theme: {
		extend: {
			colors: {
				// flowbite-svelte
				primary: {
					50: '#e8fcfe',
					100: '#d1f9fd',
					200: '#a3f3fa',
					300: '#75edf7',
					400: '#35d0de', // The original color
					500: '#1ab3c3',
					600: '#0e96a6',
					700: '#0b7885',
					800: '#095c66',
					900: '#074047'
				}
			}
		}
	},

	plugins: [flowbitePlugin]
};
