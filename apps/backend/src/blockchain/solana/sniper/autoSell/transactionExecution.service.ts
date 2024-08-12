import { Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { SolanaService } from '../../solana.service'
import { UserService } from 'src/user/user.service'
import { EncryptionService } from 'src/encryption/encryption.service'
import { EventEmitter2 } from '@nestjs/event-emitter'
import BigNumber from 'bignumber.js'

@Injectable()
export class TransactionExecutionService {
   constructor(
      private readonly solanaService: SolanaService,
      private readonly userService: UserService,
      private readonly encryptionService: EncryptionService,
      private eventEmitter: EventEmitter2,
   ) {}

   @OnEvent('entry.triggered')
   async handleTriggeredEntry({ entry, trigger, amount }: { entry: any; trigger: string; amount: BigNumber }) {
      console.log(`Executing auto-sell for user ${entry.userId} (${trigger} trigger)`)
      try {
         const wallet = await this.userService.getWalletById(entry.userId, entry.walletId)
         const user = await this.userService.findById(entry.userId)
         await this.solanaService.makeJupiterSwapTransaction(
            entry.tokenAddressToSell,
            this.solanaService.knownAddresses.WSOL,
            amount,
            parseFloat(entry.slippage) * 100,
            this.solanaService.base58ToKeypair(this.encryptionService.decrypt(wallet.walletPk, user.createdAt.toISOString())),
            'auto',
         )
         console.log(`Auto-sell executed for user ${entry.userId} (${trigger} trigger)`)

         // Emit event for successful transaction
         this.eventEmitter.emit('transaction.executed', { entry, trigger, amount })
      } catch (error) {
         console.error(`Failed to execute auto-sell for user ${entry.userId}:`, error)
         // Optionally emit an event for failed transactions
         this.eventEmitter.emit('transaction.failed', { entry, trigger, amount, error })
      }
   }
}
