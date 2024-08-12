import { forwardRef, Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider'
import { SolanaService } from '../solana.service'
import * as schema from 'src/drizzle/schema'
import { InsertAutoSell, SelectAutoSell } from 'shared-types/src/drizzle.types'
import { UserService } from 'src/user/user.service'
import { EncryptionService } from 'src/encryption/encryption.service'
import BigNumber from 'bignumber.js'
import { BuyTokenDto, GridSellStrategyParams, StrategyType } from 'shared-types/src/zodSchemas/BuyTokenFormSchema'
import { eq } from 'drizzle-orm'

@Injectable()
export class SolanaAutoSellSniperService implements OnModuleInit, OnModuleDestroy {
   private intervalId: NodeJS.Timeout
   private readonly INTERVAL = 500 // 250ms
   private cachedEntries: SelectAutoSell[] = []
   private cachedEntriesTokenAddresses: Set<string> = new Set()
   private executingEntries: Set<number> = new Set()

   constructor(
      @Inject(DrizzleAsyncProvider)
      private db: PostgresJsDatabase<typeof schema>,
      private readonly solanaService: SolanaService,
      @Inject(forwardRef(() => UserService))
      private readonly userService: UserService,
      private readonly encryptionService: EncryptionService,
   ) {}

   async onModuleInit() {
      this.cachedEntries = await this.getAutoSellEntriesFromDb()
      this.cachedEntriesTokenAddresses = new Set(this.cachedEntries.map((entry) => entry.tokenAddressToSell))
      this.startInterval()
   }

   onModuleDestroy() {
      this.stopInterval()
   }

   private startInterval() {
      this.intervalId = setInterval(() => this.checkAutoSells(), this.INTERVAL)
   }

   private stopInterval() {
      if (this.intervalId) {
         clearInterval(this.intervalId)
      }
   }

   private async checkAutoSells() {
      if (this.cachedEntries.length === 0) return
      try {
         const tokenPrices = await this.solanaService.getPriceForMultipleTokens([...this.cachedEntriesTokenAddresses])
         for (const entry of this.cachedEntries) {
            const currentPrice = new BigNumber(tokenPrices.data[entry.tokenAddressToSell].price)

            switch (entry.strategy as StrategyType) {
               case 'simple':
                  await this.checkSimpleAutoSell(entry, currentPrice)
                  break
               case 'grid':
                  await this.checkGridAutoSell(entry, currentPrice)
                  break
            }
         }
      } catch (error) {
         console.error('Error in checkAutoSells:', error)
      }
   }

   private async checkSimpleAutoSell(entry: SelectAutoSell, currentPrice: BigNumber) {
      const { profitPercentage, stopLossPercentage } = entry.strategyParams as BuyTokenDto['autoSell']['simpleStrategy']
      // const potentialSaleAmount = currentPrice * parseFloat(entry.tokenAmountToSell)
      const profitTrigger = new BigNumber(entry.initialPriceExpressedInSol).times(1 + profitPercentage / 100)
      const lossTrigger = new BigNumber(entry.initialPriceExpressedInSol).times(1 - stopLossPercentage / 100)
      console.log('Current price:', currentPrice.toString(), 'Profit Trigger:', profitTrigger.toString(), 'Loss Trigger:', lossTrigger.toString())
      if (currentPrice.gte(profitTrigger)) {
         const success = await this.executeSell(entry, 'profit', new BigNumber(entry.tokenAmountBought))
         if (success) {
            await this.removeAutoSellEntry(entry)
         }
      } else if (currentPrice.lte(lossTrigger)) {
         const success = await this.executeSell(entry, 'loss', new BigNumber(entry.tokenAmountBought))
         if (success) {
            await this.removeAutoSellEntry(entry)
         }
      }
   }

   private async checkGridAutoSell(entry: SelectAutoSell, currentPrice: BigNumber) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { stopLossType, profitTargets, breakEvenInitialStopLoss, staticStopLoss, trailingStopLoss } =
         entry.strategyParams as GridSellStrategyParams

      console.log('Checking grid auto-sell:', entry.id, currentPrice.toString())
      // Check stop loss
      let stopLossTriggered = false
      switch (stopLossType) {
         case 'static':
            const staticLossTrigger = new BigNumber(entry.initialPriceExpressedInSol).times(1 - staticStopLoss / 100)
            stopLossTriggered = currentPrice.lte(staticLossTrigger)
            break
         // case 'trailing':
         //    const highWaterMark = this.priceHighWaterMarks.get(entry.id) || entry.initialPrice
         //    if (currentPrice > highWaterMark) {
         //       this.priceHighWaterMarks.set(entry.id, currentPrice)
         //    }
         //    stopLossTriggered = currentPrice <= highWaterMark * (1 - stopLossPercentage / 100)
         //    break
         // case 'breakeven':
         //    stopLossTriggered = currentPrice <= entry.initialPrice
         //    break
      }

      if (stopLossTriggered) {
         const success = await this.executeSell(entry, 'stop loss', new BigNumber(entry.tokenAmountBought).minus(entry.tokenAmountSold))
         if (success) {
            await this.removeAutoSellEntry(entry)
         }
         return
      }

      // Check profit targets
      for (let i = 0; i < profitTargets.length; i++) {
         const target = profitTargets[i]
         if (target.done) continue
         const targetPrice = new BigNumber(entry.initialPriceExpressedInSol).times(target.multiplier)
         console.log('Checking profit target:', targetPrice.toString())
         if (currentPrice.gte(targetPrice)) {
            const sellAmount = new BigNumber(entry.tokenAmountBought).times(target.sellPercentage / 100)
            const success = await this.executeSell(entry, `profit target ${target.multiplier}`, sellAmount)

            // Update the entry after partial sell
            if (success) {
               entry.tokenAmountSold = new BigNumber(entry.tokenAmountSold).plus(sellAmount).toString()
               profitTargets[i].done = true
               const newStrategyParams = { ...(entry.strategyParams as GridSellStrategyParams), profitTargets: profitTargets }
               await this.updateAutoSellEntry(newStrategyParams, entry.id, entry.tokenAmountSold)
            }
         }
      }

      if (profitTargets.every((target) => target.done)) {
         await this.removeAutoSellEntry(entry)
      }
   }

   private async executeSell(entry: SelectAutoSell, trigger: string, amount: BigNumber) {
      let uniqueTokenId
      if (entry.strategy === 'simple') uniqueTokenId = entry.id
      else if (entry.strategy === 'grid') uniqueTokenId = entry.id + trigger
      if (this.executingEntries.has(uniqueTokenId)) {
         return
      }
      this.executingEntries.add(uniqueTokenId)
      console.log(`Executing auto-sell for user ${entry.userId} (${trigger} trigger)`)
      let success = false
      try {
         const wallet = await this.userService.getWalletById(entry.userId, entry.walletId)
         const user = await this.userService.findById(entry.userId)
         await this.solanaService.makeJupiterSwapTransaction(
            entry.tokenAddressToSell,
            this.solanaService.knownAddresses.WSOL,
            amount,
            parseFloat(entry.slippage) * 100, // 1% slippage
            this.solanaService.base58ToKeypair(this.encryptionService.decrypt(wallet.walletPk, user.createdAt.toISOString())),
            'auto',
         )
         console.log(`Auto-sell executed for user ${entry.userId} (${trigger} trigger)`)
         success = true
      } catch (error) {
         console.error(`Failed to execute auto-sell for user ${entry.userId}:`, error)
         success = false
      } finally {
         this.executingEntries.delete(entry.id)
         return success
      }
   }

   private async updateAutoSellEntry(strategyParams: GridSellStrategyParams, entryId: number, tokenAmountSold: string) {
      const updatedEntry = await this.db
         .update(schema.autoSellTable)
         .set({ strategyParams: strategyParams, tokenAmountSold: tokenAmountSold })
         .where(eq(schema.autoSellTable.id, entryId))
         .returning()
      const index = this.cachedEntries.findIndex((e) => e.id === entryId)
      this.cachedEntries[index] = updatedEntry[0]
   }

   private async getAutoSellEntriesFromDb(): Promise<SelectAutoSell[]> {
      const entries = await this.db.select().from(schema.autoSellTable).execute()
      return entries
   }

   public async addAutoSellEntry(entry: InsertAutoSell) {
      const newEntry = await this.db.insert(schema.autoSellTable).values(entry).returning()
      this.cachedEntries.push(newEntry[0])
      this.cachedEntriesTokenAddresses.add(newEntry[0].tokenAddressToSell)
   }

   public async removeAutoSellEntry(entry: SelectAutoSell) {
      const index = this.cachedEntries.findIndex((e) => e.id === entry.id)
      if (index !== -1) {
         this.cachedEntries.splice(index, 1)
         this.cachedEntriesTokenAddresses.delete(entry.tokenAddressToSell)
      }
      await this.db.delete(schema.autoSellTable).where(eq(schema.autoSellTable.id, entry.id)).execute()
   }
}
