/* eslint-disable @typescript-eslint/no-unused-vars */
import { Controller, Get, Post, Body, Param, Delete, Session, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common'
import { UserService } from './user.service'
import { AuthenticatedGuard } from 'src/auth/utils/authenticated.guard'
import { AutoSellPreset, BuyTokenDto, UserSettings } from 'shared-types/src/zodSchemas/BuyTokenFormSchema'
import { UserDto, UserWalletInfo } from 'shared-types/src/userInfo.interface'
import { SolanaService } from 'src/blockchain/solana/solana.service'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'

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
         settings: user.settings,
      }
   }

   @Get('wallets')
   @UseGuards(AuthenticatedGuard)
   async getWallets(@Request() req): Promise<UserWalletInfo[]> {
      const wallets = await this.userService.getWallets(req.user)
      const walletBalances = await this.solanaService.getBalanceForMultipleAddresses(wallets.map((wallet) => wallet.walletAddress))
      return wallets.map((wallet) => ({
         solBalance: walletBalances[wallet.walletAddress] / 10 ** 9,
         address: wallet.walletAddress,
         name: wallet.name,
      }))
   }

   @Post('wallets')
   @UseGuards(AuthenticatedGuard)
   async createWallet(@Request() req, @Body('name') name: string) {
      return this.userService.createWallet(req.user, name)
   }

   @Delete('wallets/:address')
   @UseGuards(AuthenticatedGuard)
   async deleteWallet(@Request() req, @Param('address') walletAddress: string) {
      return this.userService.deleteWallet(req.user, walletAddress)
   }

   @Get('wallets/:address/export')
   @UseGuards(AuthenticatedGuard)
   async exportPrivateKey(@Request() req, @Param('address') address: string) {
      return this.userService.exportPrivateKey(req.user, address)
   }

   @Post('wallets/import')
   @UseGuards(AuthenticatedGuard)
   async importWallet(@Request() req, @Body() importData: { privateKey: string; name: string }) {
      return this.userService.importWalletFromPk(req.user, importData.privateKey, importData.name)
   }

   @Post('transfer')
   @UseGuards(AuthenticatedGuard)
   async transferFunds(
      @Request() req,
      @Body() transferData: { fromAddress: string; toAddress: string; amount: number },
   ): Promise<{ message: string }> {
      const txSignature = await this.userService.transferFunds(req.user, transferData)
      return { message: 'Funds transferred successfully ' + txSignature }
   }

   @Post('buy-token')
   @UseGuards(AuthenticatedGuard)
   async buyToken(@Body() buyTokenDto: BuyTokenDto, @Request() req): Promise<{ message: string }> {
      try {
         const { walletAddresses, tokenAddress, inputAmount, slippage, prioritizationFeeInSolana, autoSell } = buyTokenDto
         const { txSignatures } = await this.userService.buyToken(
            req.user,
            walletAddresses,
            tokenAddress,
            inputAmount,
            slippage,
            prioritizationFeeInSolana * LAMPORTS_PER_SOL,
            autoSell,
         )
         return { message: 'Token bought successfully ' + txSignatures.join(',') }
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

   @Post('update-user-settings')
   @UseGuards(AuthenticatedGuard)
   async updateUserSettings(@Request() req, @Body() settings: UserSettings) {
      try {
         await this.userService.updateUserSettings(req.user.id, settings)
         return { message: 'Settings updated successfully' }
      } catch (error) {
         if (error instanceof HttpException) throw error
         throw new HttpException('Failed to update settings', HttpStatus.BAD_REQUEST)
      }
   }

   // @Post('sell-token')
   // @UseGuards(AuthenticatedGuard)
   // async sellToken(@Body() sellTokenDto: SellTokenDto, @Request() req): Promise<void> {
   //    const { walletAddress, tokenAddress, tokenAmountIn, slippageInPercentage, prioritizationFeeLamports } = sellTokenDto
   //    await this.userService.sellToken(req.user, walletAddress, tokenAddress, tokenAmountIn, slippageInPercentage, prioritizationFeeLamports)
   // }
}
