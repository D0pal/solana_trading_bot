export interface JupiterPriceReponse {
   data: {
      [tokenAddress: string]: TokenPriceInfo;
   };
   timeTaken: number;
}

export interface TokenPriceInfo {
   id: string;
   mintSymbol: string;
   vsToken: string;
   vsTokenSymbol: string;
   price: number;
}
