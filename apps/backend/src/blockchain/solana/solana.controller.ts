import { Controller, Get, Query } from '@nestjs/common'
import { SolanaService } from './solana.service'

@Controller('solana')
export class SolanaController {
   constructor(private readonly solanaService: SolanaService) {}

   @Get('price')
   async findPrices(@Query('tokenAddresses') tokenAddresses: string, @Query('vsToken') vsToken: string) {
      const tokenArray = tokenAddresses.split(',')
      return await this.solanaService.getPriceForMultipleTokens(tokenArray, vsToken)
   }
}
