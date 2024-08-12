/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, OnModuleInit } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { OnEvent } from '@nestjs/event-emitter'
import { Inject } from '@nestjs/common'
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from 'src/drizzle/schema'
import { InsertAutoSell, SelectAutoSell } from 'shared-types/src/drizzle.types'
import BigNumber from 'bignumber.js'
import { BuyTokenDto, GridSellStrategyParams, StrategyType } from 'shared-types/src/zodSchemas/BuyTokenFormSchema'
import { eq } from 'drizzle-orm'

@Injectable()
export class EntryCalculationService implements OnModuleInit {
   private cachedEntries: SelectAutoSell[] = []
   private cachedEntriesTokenAddresses: Set<string> = new Set()
   private executingEntries: Map<number, Set<string>> = new Map()

   constructor(
      @Inject(DrizzleAsyncProvider)
      private db: PostgresJsDatabase<typeof schema>,
      private eventEmitter: EventEmitter2,
   ) {}

   async onModuleInit() {
      this.cachedEntries = await this.getAutoSellEntriesFromDb()
      this.cachedEntriesTokenAddresses = new Set(this.cachedEntries.map((entry) => entry.tokenAddressToSell))
   }

   private async getAutoSellEntriesFromDb(): Promise<SelectAutoSell[]> {
      return await this.db.select().from(schema.autoSellTable).execute()
   }

   async addAutoSellEntry(entry: InsertAutoSell) {
      const newEntry = await this.db.insert(schema.autoSellTable).values(entry).returning()
      this.cachedEntries.push(newEntry[0])
      this.cachedEntriesTokenAddresses.add(newEntry[0].tokenAddressToSell)
   }

   async removeAutoSellEntry(entry: SelectAutoSell) {
      const index = this.cachedEntries.findIndex((e) => e.id === entry.id)
      if (index !== -1) {
         this.cachedEntries.splice(index, 1)
         this.cachedEntriesTokenAddresses.delete(entry.tokenAddressToSell)
      }
      await this.db.delete(schema.autoSellTable).where(eq(schema.autoSellTable.id, entry.id)).execute()
   }

   async updateAutoSellEntry(entry: SelectAutoSell) {
      const index = this.cachedEntries.findIndex((e) => e.id === entry.id)
      this.cachedEntries[index] = entry
      await this.db
         .update(schema.autoSellTable)
         .set({
            strategyParams: entry.strategyParams,
            tokenAmountSold: entry.tokenAmountSold,
            highestPriceExpressedInSol: entry.highestPriceExpressedInSol,
         })
         .where(eq(schema.autoSellTable.id, entry.id))
         .returning()
   }

   private isEntryExecuting(entryId: number, subType?: string): boolean {
      const executingSet = this.executingEntries.get(entryId)
      return executingSet ? (subType ? executingSet.has(subType) : executingSet.size > 0) : false
   }

   private addExecutingEntry(entryId: number, subType: string) {
      if (!this.executingEntries.has(entryId)) {
         this.executingEntries.set(entryId, new Set())
      }
      this.executingEntries.get(entryId)!.add(subType)
   }

   private removeExecutingEntry(entryId: number, trigger: string) {
      const executingSet = this.executingEntries.get(entryId)
      if (executingSet) {
         if (trigger.startsWith('profit target')) {
            const targetIndex = trigger.split(' ')[2]
            executingSet.delete(`target_${targetIndex}`)
         } else {
            executingSet.delete(trigger)
         }
         if (executingSet.size === 0) {
            this.executingEntries.delete(entryId)
         }
      }
   }

   @OnEvent('get.token.addresses')
   handleGetTokenAddresses() {
      return this.cachedEntriesTokenAddresses.size > 0 ? Array.from(this.cachedEntriesTokenAddresses) : null
   }

   @OnEvent('prices.updated')
   handlePriceUpdate(prices: Record<string, { price: string }>) {
      for (const entry of this.cachedEntries) {
         const currentPrice = new BigNumber(prices[entry.tokenAddressToSell].price)
         switch (entry.strategy as StrategyType) {
            case 'simple':
               this.checkSimpleAutoSell(entry, currentPrice)
               break
            case 'grid':
               this.checkGridAutoSell(entry, currentPrice)
               break
         }
      }
      console.log()
   }

   @OnEvent('transaction.executed')
   async handleExecutedTransaction({ entry, trigger, amount }: { entry: SelectAutoSell; trigger: string; amount: BigNumber }) {
      if (entry.strategy === 'simple') {
         await this.removeAutoSellEntry(entry)
      } else if (entry.strategy === 'grid') {
         const strategyParams = entry.strategyParams as GridSellStrategyParams
         const newTokenAmountSold = new BigNumber(entry.tokenAmountSold).plus(amount).toString()
         const profitTargets = strategyParams.profitTargets
         const targetIndex = profitTargets.findIndex((t) => !t.done)
         if (targetIndex !== -1) {
            profitTargets[targetIndex].done = true
         }
         let newStrategyParams: GridSellStrategyParams
         if (strategyParams.stopLossType === 'trailing') {
            newStrategyParams = {
               ...strategyParams,
               profitTargets,
               trailingStopLoss: strategyParams.profitTargets[targetIndex].trailingStopLossAfter,
            }
         } else {
            newStrategyParams = { ...strategyParams, profitTargets }
         }
         await this.updateAutoSellEntry({ ...entry, strategyParams: newStrategyParams, tokenAmountSold: newTokenAmountSold })

         if (profitTargets.every((target) => target.done) || trigger === 'stop_loss') {
            await this.removeAutoSellEntry(entry)
         }
      }
      this.removeExecutingEntry(entry.id, trigger)
   }

   @OnEvent('transaction.failed')
   async handleFailedTransaction({ entry, trigger, amount, error }: { entry: SelectAutoSell; trigger: string; amount: BigNumber; error: any }) {
      this.removeExecutingEntry(entry.id, trigger)
      console.log(`Failed to execute auto-sell for user ${entry.userId}:`, error)
   }

   private checkSimpleAutoSell(entry: SelectAutoSell, currentPrice: BigNumber) {
      if (this.isEntryExecuting(entry.id)) return
      const { profitPercentage, stopLossPercentage } = entry.strategyParams as BuyTokenDto['autoSell']['simpleStrategy']
      const profitTrigger = new BigNumber(entry.initialPriceExpressedInSol).times(1 + profitPercentage / 100)
      const lossTrigger = new BigNumber(entry.initialPriceExpressedInSol).times(1 - stopLossPercentage / 100)

      if (currentPrice.gte(profitTrigger) || currentPrice.lte(lossTrigger)) {
         this.addExecutingEntry(entry.id, 'simple')
         this.eventEmitter.emit('entry.triggered', {
            entry,
            trigger: currentPrice.gte(profitTrigger) ? 'profit' : 'loss',
            amount: new BigNumber(entry.tokenAmountBought),
         })
      }
   }

   private checkGridAutoSell(entry: SelectAutoSell, currentPrice: BigNumber) {
      const { stopLossType, profitTargets, staticStopLoss, trailingStopLoss } = entry.strategyParams as GridSellStrategyParams
      if (new BigNumber(entry.highestPriceExpressedInSol).lt(currentPrice)) {
         entry.highestPriceExpressedInSol = currentPrice.toString()
         this.updateAutoSellEntry(entry)
      }

      if (this.isEntryExecuting(entry.id, 'stop_loss')) return

      process.stdout.write('currentPrice: ' + currentPrice.toString())
      let stopLossTriggered = false

      switch (stopLossType) {
         case 'static':
            const staticLossTrigger = new BigNumber(entry.initialPriceExpressedInSol).times(1 - staticStopLoss / 100)
            stopLossTriggered = currentPrice.lte(staticLossTrigger)
            process.stdout.write(', staticLossTrigger ' + staticLossTrigger.toString())
            break
         case 'trailing':
            const highWaterMark = new BigNumber(entry.highestPriceExpressedInSol)
            const trailingStopLossTrigger = highWaterMark.times(1 - trailingStopLoss / 100)
            stopLossTriggered = currentPrice.lte(trailingStopLossTrigger)
            process.stdout.write(', trailingStopLossTrigger: ' + trailingStopLossTrigger.toString() + ', trailingStopLoss: ' + trailingStopLoss)
            break
      }

      if (stopLossTriggered) {
         this.addExecutingEntry(entry.id, 'stop_loss')
         this.eventEmitter.emit('entry.triggered', {
            entry,
            trigger: 'stop_loss',
            amount: new BigNumber(entry.tokenAmountBought).minus(entry.tokenAmountSold),
         })
         return
      }

      // Check profit targets
      for (let i = 0; i < profitTargets.length; i++) {
         const target = profitTargets[i]
         const trigger = `profit target ${target.multiplier}`

         if (target.done || this.isEntryExecuting(entry.id, trigger)) continue

         const targetPrice = new BigNumber(entry.initialPriceExpressedInSol).times(target.multiplier)
         process.stdout.write(', target ' + i + ': ' + targetPrice.toString())
         if (currentPrice.gte(targetPrice)) {
            const sellAmount = new BigNumber(entry.tokenAmountBought).times(target.sellPercentage / 100)
            if (sellAmount.isZero()) {
               console.log(entry.tokenAmountBought, target.sellPercentage)
               continue
            }
            this.addExecutingEntry(entry.id, trigger)
            this.eventEmitter.emit('entry.triggered', { entry, trigger: trigger, amount: sellAmount })
         }
      }
      console.log()
   }
}
