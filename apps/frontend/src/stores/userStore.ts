import { writable, type Writable } from 'svelte/store';
import { type UserInfo } from 'shared-types/src/userInfo.interface';

export const defaultUserInfo: UserInfo = {
	wallets: []
};

export const userInfo: Writable<UserInfo> = writable(defaultUserInfo);
