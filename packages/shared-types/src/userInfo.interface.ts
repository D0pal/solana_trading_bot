// This file could be placed in a shared directory accessible by both frontend and backend

import { AutoSellPreset } from "./zodSchemas/BuyTokenFormSchema";

export interface UserWalletInfo {
   solBalance: number;
   address: string;
   name: string;
}

export interface UserDto {
   wallets: UserWalletInfo[];
   autoSellPresets: AutoSellPreset[];
}
