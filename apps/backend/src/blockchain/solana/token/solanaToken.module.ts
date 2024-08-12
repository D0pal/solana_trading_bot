// src/blockchain/solana/token/token.module.ts
import { Module } from '@nestjs/common'
import { SolanaService } from '../solana.service'
import { SolanaTokenService } from './solanaToken.service'
import { SolanaTokenController } from './solanaToken.controller'
import { drizzleProvider } from 'src/drizzle/drizzle.provider'

@Module({
   providers: [SolanaTokenService, SolanaService, ...drizzleProvider],
   controllers: [SolanaTokenController],
   exports: [SolanaTokenService],
})
export class SolanaTokenModule {}
