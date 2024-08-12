import { AccountLayout } from '@solana/spl-token'
import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import db from 'src/drizzle/db'
import blockchainServiceInstance from './blockchainService'
import { AnchorProvider, setProvider, Wallet } from '@project-serum/anchor'
import * as anchor from '@project-serum/anchor'
import { BN } from '@project-serum/anchor'
import BigDecimal from 'src/common/BigDecimal'
import { sleep } from 'src/common/sleep'
import axios from 'axios'

class SolPriceService {
   private currentSolPriceInUSD: number = 0
   private fetchTime: number = 10000

   constructor() {
      this.setupGetSolPriceInUsdListener()
   }

   public getCurrentSolPriceInUSD() {
      return this.currentSolPriceInUSD
   }

   private async setupGetSolPriceInUsdListener() {
      const response = await axios.get('https://api-v3.raydium.io/mint/price?mints=So11111111111111111111111111111111111111112')
      this.currentSolPriceInUSD = response.data.data['So11111111111111111111111111111111111111112']

      setInterval(async () => {
         try {
            const response = await axios.get('https://api-v3.raydium.io/mint/price?mints=So11111111111111111111111111111111111111112')
            this.currentSolPriceInUSD = response.data.data['So11111111111111111111111111111111111111112']
         } catch (e) {
            console.error('Error fetching currentSolPriceInUSD:', e)
         }
      }, this.fetchTime)
   }
}

const solPriceServiceInstance = new SolPriceService()
export default solPriceServiceInstance
