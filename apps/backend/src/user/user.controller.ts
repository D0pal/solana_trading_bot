/* eslint-disable @typescript-eslint/no-unused-vars */
import { Controller, Get, Post, Body, Param, Delete, Session, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common'
import { UserService } from './user.service'
import { AuthenticatedGuard } from 'src/auth/utils/authenticated.guard'
import { AutoSellPreset, BuyTokenDto } from 'shared-types/src/zodSchemas/BuyTokenFormSchema'
import { UserDto } from 'shared-types/src/userInfo.interface'
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
   async getUserInfo(@Request() req): Promise<UserDto> {
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
         autoSellPresets: user.autoSellPresets ? user.autoSellPresets : [],
      }
   }

   @Post('buy-token')
   @UseGuards(AuthenticatedGuard)
   async buyToken(@Body() buyTokenDto: BuyTokenDto, @Request() req): Promise<{ message: string }> {
      try {
         const { walletAddress, tokenAddress, inputAmount, slippage, prioritizationFeeLamports, autoSell } = buyTokenDto
         const { txSignature } = await this.userService.buyToken(
            req.user,
            walletAddress,
            tokenAddress,
            inputAmount,
            slippage,
            prioritizationFeeLamports,
            autoSell,
         )
         return { message: 'Token bought successfully ' + txSignature }
      } catch (error) {
         if (error instanceof HttpException) throw error
         throw new HttpException('Failed to buy token', HttpStatus.BAD_REQUEST)
      }
   }

   @Post('add-auto-sell-preset')
   @UseGuards(AuthenticatedGuard)
   async addAutoSellPreset(@Body() autoSellPreset: AutoSellPreset, @Request() req): Promise<{ message: string }> {
      try {
         if (autoSellPreset.name === '') throw new HttpException('Auto-sell preset name cannot be empty', HttpStatus.BAD_REQUEST)
         await this.userService.addAutoSellPreset(req.user, autoSellPreset)
         return { message: 'Auto-sell preset added successfully' }
      } catch (error) {
         if (error instanceof HttpException) throw error
         throw new HttpException('Failed to add auto-sell preset', HttpStatus.BAD_REQUEST)
      }
   }

   @Post('edit-auto-sell-preset')
   @UseGuards(AuthenticatedGuard)
   async editAutoSellPreset(@Body() autoSellPreset: AutoSellPreset, @Request() req): Promise<{ message: string }> {
      try {
         if (autoSellPreset.name === '') throw new HttpException('Auto-sell preset name cannot be empty', HttpStatus.BAD_REQUEST)
         await this.userService.editAutoSellPreset(req.user, autoSellPreset)
         return { message: 'Auto-sell preset edited successfully' }
      } catch (error) {
         if (error instanceof HttpException) throw error
         throw new HttpException('Failed to edit auto-sell preset', HttpStatus.BAD_REQUEST)
      }
   }

   @Delete('delete-auto-sell-preset/:presetId')
   @UseGuards(AuthenticatedGuard)
   async deleteAutoSellPreset(@Param('presetId') presetId: string, @Request() req): Promise<{ message: string }> {
      try {
         await this.userService.deleteAutoSellPreset(req.user, presetId)
         return { message: 'Auto-sell preset deleted successfully' }
      } catch (error) {
         if (error instanceof HttpException) throw error
         throw new HttpException('Failed to delete auto-sell preset', HttpStatus.BAD_REQUEST)
      }
   }

   // @Post('sell-token')
   // @UseGuards(AuthenticatedGuard)
   // async sellToken(@Body() sellTokenDto: SellTokenDto, @Request() req): Promise<void> {
   //    const { walletAddress, tokenAddress, tokenAmountIn, slippageInPercentage, prioritizationFeeLamports } = sellTokenDto
   //    await this.userService.sellToken(req.user, walletAddress, tokenAddress, tokenAmountIn, slippageInPercentage, prioritizationFeeLamports)
   // }
}
