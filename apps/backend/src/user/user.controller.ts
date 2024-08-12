/* eslint-disable @typescript-eslint/no-unused-vars */
import { Controller, Get, Post, Body, Param, Delete, Session, UseGuards, Request } from '@nestjs/common'
import { UserService } from './user.service'
import { AuthenticatedGuard } from 'src/auth/utils/authenticated.guard'
import { BuyTokenDto } from 'shared-types/src/zodSchemas/BuyTokenFormSchema'
import { UserInfo } from 'shared-types/src/userInfo.interface'
import { SolanaService } from 'src/blockchain/solana/solana.service'

@Controller('user')
export class UserController {
   constructor(
      private readonly userService: UserService,
      private readonly solanaService: SolanaService,
   ) {}

   @Get('status')
   @UseGuards(AuthenticatedGuard)
   status(@Request() req) {
      console.log('Here', req.user)
      return req.user
   }

   @UseGuards(AuthenticatedGuard)
   @Get('info')
   async getUserInfo(@Request() req): Promise<UserInfo> {
      const userId = req.user.id
      const user = await this.userService.findById(userId)
      const wallets = await this.userService.getWallets(user)
      const walletBalances = await this.solanaService.getBalanceForMultipleAddresses(wallets.map((wallet) => wallet.walletAddress))

      return {
         wallets: wallets.map((wallet) => ({
            solBalance: walletBalances[wallet.walletAddress] / 10 ** 9,
            address: wallet.walletAddress,
            name: wallet.name,
         })),
      }
   }

   @Post('buy-token')
   @UseGuards(AuthenticatedGuard)
   async buyToken(@Body() buyTokenDto: BuyTokenDto, @Request() req): Promise<void> {
      const { walletAddress, tokenAddress, inputAmount, slippage, prioritizationFeeLamports, autoSell } = buyTokenDto
      await this.userService.buyToken(req.user, walletAddress, tokenAddress, inputAmount, slippage, prioritizationFeeLamports, autoSell)
   }

   // @Post('sell-token')
   // @UseGuards(AuthenticatedGuard)
   // async sellToken(@Body() sellTokenDto: SellTokenDto, @Request() req): Promise<void> {
   //    const { walletAddress, tokenAddress, tokenAmountIn, slippageInPercentage, prioritizationFeeLamports } = sellTokenDto
   //    await this.userService.sellToken(req.user, walletAddress, tokenAddress, tokenAmountIn, slippageInPercentage, prioritizationFeeLamports)
   // }
}
