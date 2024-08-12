// src/types/global.d.ts
import type { TelegramAuthData } from 'shared-types/src/TelegramAuthData.interface';

declare global {
	interface Window {
		onTelegramAuth: (user: TelegramAuthData) => void;
	}
}

export {};
