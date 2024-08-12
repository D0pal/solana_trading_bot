import { Module } from '@nestjs/common'
import { SolanaService } from './solana.service'
import { SolanaTokenModule } from './token/solanaToken.module'
import { SolanaController } from './solana.controller'

@Module({
   imports: [SolanaTokenModule],
   providers: [SolanaService],
   controllers: [SolanaController],
   exports: [SolanaService],
})
export class SolanaModule {}
