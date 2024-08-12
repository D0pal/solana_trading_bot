import { forwardRef, Module } from '@nestjs/common'
import { drizzleProvider } from 'src/drizzle/drizzle.provider'
import { SolanaModule } from '../solana.module'
import { UserModule } from 'src/user/user.module'
import { EncryptionModule } from 'src/encryption/encryption.module'
import { PricePollingService } from './pricePooling.service'
import { TransactionExecutionService } from './autoSell/transactionExecution.service'
import { EntryCalculationService } from './autoSell/entryCalculation.service'
import { EventEmitterModule } from '@nestjs/event-emitter'

@Module({
   imports: [EventEmitterModule.forRoot(), SolanaModule, forwardRef(() => UserModule), EncryptionModule],
   providers: [...drizzleProvider, EntryCalculationService, PricePollingService, TransactionExecutionService],
   exports: [EntryCalculationService],
})
export class SolanaSniperModule {}
