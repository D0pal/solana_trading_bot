// This file could be placed in a shared directory accessible by both frontend and backend

export interface UserWalletInfo {
   solBalance: number;
   address: string;
   name: string;
}

export interface UserInfo {
   wallets: UserWalletInfo[];
}
