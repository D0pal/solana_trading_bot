import { Controller, Get, Param } from '@nestjs/common'
import { SolanaTokenService } from './solanaToken.service'

@Controller('solanaToken')
export class SolanaTokenController {
   constructor(private readonly solanaTokenService: SolanaTokenService) {}

   @Get(':tokenAddress')
   findOne(@Param('tokenAddress') tokenAddress: string) {
      return this.solanaTokenService.getTokenInfo(tokenAddress)
   }
}
