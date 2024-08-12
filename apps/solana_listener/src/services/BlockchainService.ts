import { Connection, Finality, GetVersionedTransactionConfig, LogsCallback, SlotChangeCallback } from '@solana/web3.js'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { Umi } from '@metaplex-foundation/umi'
import { getMint } from '@solana/spl-token'
import { PublicKey as SolanaPublicKey } from '@solana/web3.js'
import { PublicKey as UmiPublicKey } from '@metaplex-foundation/umi-public-keys'
import { fetchMetadata, findMetadataPda } from '@metaplex-foundation/mpl-token-metadata'

class BlockchainService {
   public quickNodeConnection: Connection
   public defaultSolanaConnection: Connection
   public umi: Umi

   constructor() {
      this.quickNodeConnection = new Connection(
         'https://responsive-warmhearted-paper.solana-mainnet.quiknode.pro/1e392934b1d2fc92f022cbf4c537da502d3bead8/'
      )
      this.defaultSolanaConnection = new Connection('https://api.mainnet-beta.solana.com/')
      this.umi = createUmi('https://responsive-warmhearted-paper.solana-mainnet.quiknode.pro/1e392934b1d2fc92f022cbf4c537da502d3bead8/')
   }

   async getMintBlockchainDataAndMetadata(mintAddress: string) {
      const mint = await getMint(this.quickNodeConnection, new SolanaPublicKey(mintAddress))

      const tokenMetadata = await fetchMetadata(
         this.umi,
         findMetadataPda(this.umi, {
            mint: mintAddress as UmiPublicKey,
         })
      )

      return { mint, tokenMetadata }
   }

   async getBlock(blockNumber: number) {
      return this.quickNodeConnection.getParsedBlock(blockNumber, {
         transactionDetails: 'full',
         maxSupportedTransactionVersion: 0,
         commitment: 'finalized',
      })
   }

   getMultipleAccountsInfo(publicKeys: SolanaPublicKey[]) {
      return this.quickNodeConnection.getMultipleAccountsInfo(publicKeys)
   }

   getAccountInfo(publicKey: SolanaPublicKey) {
      return this.quickNodeConnection.getAccountInfo(publicKey)
   }

   async listenToLogs(programAddress: SolanaPublicKey, callback: LogsCallback) {
      this.quickNodeConnection.onLogs(programAddress, callback, 'finalized')
   }

   async listenToSlots(callback: SlotChangeCallback) {
      this.quickNodeConnection.onSlotChange(callback)
   }

   async getParsedTransaction(transactionSignature: string, commitmentOrConfig?: GetVersionedTransactionConfig | Finality) {
      return this.quickNodeConnection.getParsedTransaction(transactionSignature, commitmentOrConfig)
   }

   async getSlot() {
      return this.quickNodeConnection.getSlot()
   }
}

const blockchainServiceInstance = new BlockchainService()
export default blockchainServiceInstance
