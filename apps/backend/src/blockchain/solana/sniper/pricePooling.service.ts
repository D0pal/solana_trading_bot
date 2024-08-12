import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SolanaService } from '../solana.service'

@Injectable()
export class PricePollingService implements OnModuleInit, OnModuleDestroy {
   private intervalId: NodeJS.Timeout
   private readonly INTERVAL = 500 // 500ms

   constructor(
      private eventEmitter: EventEmitter2,
      private readonly solanaService: SolanaService,
   ) {}

   onModuleInit() {
      this.startInterval()
   }

   onModuleDestroy() {
      this.stopInterval()
   }

   private startInterval() {
      this.intervalId = setInterval(() => this.pollPrices(), this.INTERVAL)
   }

   private stopInterval() {
      if (this.intervalId) {
         clearInterval(this.intervalId)
      }
   }

   private async pollPrices() {
      try {
         const tokenAddresses = await this.eventEmitter.emitAsync('get.token.addresses')
         if (tokenAddresses[0] == null) return
         const tokenPrices = await this.solanaService.getPriceForMultipleTokens(tokenAddresses)
         this.eventEmitter.emit('prices.updated', tokenPrices.data)
      } catch (error) {
         console.error('Error in pollPrices:', error)
      }
   }
}
