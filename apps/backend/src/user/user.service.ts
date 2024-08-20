/* eslint-disable @typescript-eslint/no-unused-vars */
import { Inject, Injectable } from '@nestjs/common'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider'
import * as schema from 'src/drizzle/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { EncryptionService } from 'src/encryption/encryption.service'
import { SolanaService } from 'src/blockchain/solana/solana.service'
import { AutoSellPreset, BuyTokenDto, UserSettings } from 'shared-types/src/zodSchemas/BuyTokenFormSchema'
import BigNumber from 'bignumber.js'
import { EntryCalculationService } from 'src/blockchain/solana/sniper/autoSell/entryCalculation.service'
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class UserService {
   constructor(
      @Inject(DrizzleAsyncProvider)
      private db: PostgresJsDatabase<typeof schema>,
      private encryptionService: EncryptionService,
      private solanaService: SolanaService,
      private entryCalculationService: EntryCalculationService,
   ) {}

   async findById(id: number): Promise<schema.SelectUser | undefined> {
      const user = await this.db.select().from(schema.usersTable).where(eq(schema.usersTable.id, id)).limit(1)
      return user[0]
   }

   async findByTelegramId(telegramId: number): Promise<schema.SelectUser | undefined> {
      const subQuery = this.db
         .select()
         .from(schema.authProvidersTable)
         .where(eq(schema.authProvidersTable.providerId, telegramId.toString()))
         .limit(1)
         .as('sq')
      const user = await this.db.select().from(schema.usersTable).leftJoin(subQuery, eq(schema.usersTable.id, subQuery.userId)).limit(1)
      return user[0] === undefined ? undefined : user[0].users_table
   }

   async create(user: schema.InsertUser, authProvider: Omit<schema.InsertAuthProvider, 'userId'>): Promise<schema.SelectUser> {
      const newUser = await this.db.transaction(async (tx) => {
         const newUser = await tx.insert(schema.usersTable).values(user).returning()
         await tx.insert(schema.authProvidersTable).values({
            providerId: authProvider.providerId,
            provider: authProvider.provider,
            userId: newUser[0].id,
         })
         const newKeyPair = this.solanaService.createNewWallet()
         const encryptedPrivateKey = this.encryptionService.encrypt(
            this.solanaService.privateKeyToBase58(newKeyPair.secretKey),
            newUser[0].createdAt.toISOString(),
         )
         await tx.insert(schema.userWalletsTable).values({
            userId: newUser[0].id,
            walletAddress: newKeyPair.publicKey.toString(),
            walletPk: encryptedPrivateKey,
            name: 'Main Wallet',
         })
         return newUser
      })
      return newUser[0]
   }

   async createWallet(user: schema.SelectUser, name: string): Promise<schema.SelectUserWallet> {
      const newKeyPair = this.solanaService.createNewWallet()
      const encryptedPrivateKey = this.encryptionService.encrypt(
         this.solanaService.privateKeyToBase58(newKeyPair.secretKey),
         user.createdAt.toISOString(),
      )
      const wallet = await this.db
         .insert(schema.userWalletsTable)
         .values({
            userId: user.id,
            walletAddress: newKeyPair.publicKey.toString(),
            walletPk: encryptedPrivateKey,
            name,
         })
         .returning()
      return wallet[0]
   }

   async importWalletFromPk(user: schema.SelectUser, privateKey: string, name: string): Promise<schema.SelectUserWallet> {
      const newKeyPair = this.solanaService.base58ToKeypair(privateKey)
      const encryptedPrivateKey = this.encryptionService.encrypt(privateKey, user.createdAt.toISOString())
      const wallet = await this.db
         .insert(schema.userWalletsTable)
         .values({
            userId: user.id,
            walletAddress: newKeyPair.publicKey.toString(),
            walletPk: encryptedPrivateKey,
            name,
         })
         .returning()
      return wallet[0]
   }

   async getWallets(user: schema.SelectUser): Promise<schema.SelectUserWallet[]> {
      const wallet = await this.db.select().from(schema.userWalletsTable).where(eq(schema.userWalletsTable.userId, user.id))
      return wallet
   }

   async getWalletByAddress(user: schema.SelectUser, walletAddress: string): Promise<schema.SelectUserWallet | undefined> {
      const wallet = await this.db
         .select()
         .from(schema.userWalletsTable)
         .where(and(eq(schema.userWalletsTable.userId, user.id), eq(schema.userWalletsTable.walletAddress, walletAddress)))
         .limit(1)
      return wallet[0]
   }

   async getWalletById(userId: number, walletId: number): Promise<schema.SelectUserWallet | undefined> {
      const wallet = await this.db
         .select()
         .from(schema.userWalletsTable)
         .where(and(eq(schema.userWalletsTable.userId, userId), eq(schema.userWalletsTable.id, walletId)))
         .limit(1)
      return wallet[0]
   }

   async getWalletsByAddresses(user: schema.SelectUser, walletAddresses: string[]): Promise<schema.SelectUserWallet[]> {
      const wallets = await this.db
         .select()
         .from(schema.userWalletsTable)
         .where(and(eq(schema.userWalletsTable.userId, user.id), inArray(schema.userWalletsTable.walletAddress, walletAddresses)))

      return wallets
   }

   async deleteWallet(user: schema.SelectUser, walletAddress: string): Promise<void> {
      await this.db
         .delete(schema.userWalletsTable)
         .where(and(eq(schema.userWalletsTable.userId, user.id), eq(schema.userWalletsTable.walletAddress, walletAddress)))
   }

   async exportPrivateKey(user: schema.SelectUser, walletAddress: string): Promise<string> {
      const wallet = await this.getWalletByAddress(user, walletAddress)
      return this.encryptionService.decrypt(wallet.walletPk, user.createdAt.toISOString())
   }

   async transferFunds(user: schema.SelectUser, { fromAddress, toAddress, amount }: { fromAddress: string; toAddress: string; amount: number }) {
      const fromWallet = await this.getWalletByAddress(user, fromAddress)
      const privateKey = this.encryptionService.decrypt(fromWallet.walletPk, user.createdAt.toISOString())
      const keypair = this.solanaService.base58ToKeypair(privateKey)

      const txSignature = await this.solanaService.transferSol(keypair, toAddress, amount)
      return txSignature
   }

   async buyToken(
      user: schema.SelectUser,
      walletAddresses: string[],
      tokenAddress: string,
      solAmountInUi: number,
      slippageInPercentage: number,
      prioritizationFeeLamports: number | 'auto',
      autoSell: BuyTokenDto['autoSell'],
   ): Promise<{
      txSignatures: string[]
   }> {
      const wallets = await this.getWalletsByAddresses(user, walletAddresses)
      const solAmount = new BigNumber(solAmountInUi).multipliedBy(10 ** 9)
      const txSignatures = []
      for (const wallet of wallets) {
         const { outputAmount, outputAmountUi, txSignature } = await this.solanaService.makeJupiterSwapTransaction(
            this.solanaService.knownAddresses.WSOL,
            tokenAddress,
            solAmount,
            slippageInPercentage * 100,
            this.solanaService.base58ToKeypair(this.encryptionService.decrypt(wallet.walletPk, user.createdAt.toISOString())),
            prioritizationFeeLamports,
         )

         if (outputAmount === undefined || outputAmountUi === undefined || outputAmount.isZero() || outputAmountUi.isZero()) {
            continue
         }

         console.log('outputAmount', outputAmount.toString())
         console.log('outputAmountUi', outputAmountUi.toString())
         console.log('initialPriceExpressedInSol', new BigNumber(solAmountInUi).div(outputAmountUi).toString())

         if (autoSell.enabled) {
            await this.entryCalculationService.addAutoSellEntry({
               initialPriceExpressedInSol: new BigNumber(solAmountInUi).div(outputAmountUi).toString(),
               highestPriceExpressedInSol: new BigNumber(solAmountInUi).div(outputAmountUi).toString(),
               slippage: slippageInPercentage.toString(),
               strategy: autoSell.strategy.strategyName,
               strategyParams: autoSell.strategy,
               tokenAddressToSell: tokenAddress,
               tokenAmountBought: outputAmount.toString(),
               tokenAmountSold: '0',
               userId: user.id,
               walletId: wallet.id,
            })
         }
         txSignatures.push(txSignature)
      }

      return { txSignatures }
   }

   async sellToken(
      user: schema.SelectUser,
      walletAddress: string,
      tokenAddress: string,
      tokenAmountIn: string,
      slippageInPercentage: number,
      prioritizationFeeLamports: number | 'auto' = 'auto',
   ): Promise<void> {
      const wallet = await this.getWalletByAddress(user, walletAddress)

      // await this.solanaService.makeJupiterSwapTransaction(
      //    tokenAddress,
      //    this.solanaService.knownAddresses.WSOL,
      //    parseFloat(tokenAmountIn),
      //    slippageInPercentage * 100,
      //    this.solanaService.base58ToKeypair(this.encryptionService.decrypt(wallet.walletPk, user.createdAt.toISOString())),
      //    prioritizationFeeLamports,
      // )
   }

   async addAutoSellPreset(user: schema.SelectUser, autoSellpreset: AutoSellPreset) {
      const userAutoSellPresets = user.autoSellPresets ?? []
      autoSellpreset.id = uuidv4()
      await this.db
         .update(schema.usersTable)
         .set({
            autoSellPresets: [...userAutoSellPresets, autoSellpreset],
         })
         .where(eq(schema.usersTable.id, user.id))
   }

   async editAutoSellPreset(user: schema.SelectUser, autoSellpreset: AutoSellPreset) {
      const userAutoSellPresets = user.autoSellPresets ?? []
      const index = userAutoSellPresets.findIndex((preset) => preset.id === autoSellpreset.id)
      if (index === -1) throw new Error('Auto sell preset not found')
      userAutoSellPresets[index] = autoSellpreset
      await this.db
         .update(schema.usersTable)
         .set({
            autoSellPresets: userAutoSellPresets,
         })
         .where(eq(schema.usersTable.id, user.id))
   }

   async deleteAutoSellPreset(user: schema.SelectUser, presetId: string) {
      const userAutoSellPresets = user.autoSellPresets ?? []
      const updatedUserAutoSellPresets = userAutoSellPresets.filter((preset) => preset.id !== presetId)
      await this.db
         .update(schema.usersTable)
         .set({
            autoSellPresets: updatedUserAutoSellPresets,
         })
         .where(eq(schema.usersTable.id, user.id))
   }

   async getUserSettings(userId: number): Promise<UserSettings | null> {
      const user = await this.db
         .select({ settings: schema.usersTable.settings })
         .from(schema.usersTable)
         .where(eq(schema.usersTable.id, userId))
         .limit(1)

      return user[0]?.settings || null
   }

   async updateUserSettings(userId: number, settings: UserSettings): Promise<void> {
      await this.db.update(schema.usersTable).set({ settings }).where(eq(schema.usersTable.id, userId))
   }
}
