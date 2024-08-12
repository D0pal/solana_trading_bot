export interface BlockchainInterface {
   connect(): any
   getBalance(address: string): Promise<number>
   sendTransaction(transactionDetails: any): Promise<any>
}
