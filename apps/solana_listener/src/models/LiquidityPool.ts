import { Connection, Keypair, PublicKey, TransactionInstruction, Transaction, sendAndConfirmTransaction, ComputeBudgetProgram } from '@solana/web3.js'
import {
   Liquidity,
   LiquidityPoolKeys,
   LIQUIDITY_STATE_LAYOUT_V4,
   MARKET_STATE_LAYOUT_V3,
   Market,
   SPL_MINT_LAYOUT,
   ApiPoolInfoV4,
   jsonInfo2PoolKeys,
   TokenAmount,
   Token,
   Percent,
   TxVersion,
   LiquidityPoolInfo,
   TokenAccount,
   SPL_ACCOUNT_LAYOUT,
   TOKEN_PROGRAM_ID,
} from '@raydium-io/raydium-sdk'
import config from 'config'
import { buildAndSendTx } from 'common/src/utils/transactions/sendTransactionsRaydium'
import { connectionManager } from 'common/src/utils/connectionManager'
import { ILP } from 'common/src/interfaces/lptable.interface'
import DatabaseService from 'database/src/DatabaseService'
import { StrategyManager } from 'src/strategy-manager/src/StrategyManager'
import { VaultType } from 'common/src/enum/LPVaultType'
import BN from 'bn.js'
import { SolanaWallet } from 'src/wallet-management/src/SolanaWallet'
import { walletManager2 } from 'src/wallet-management/src/WalletManager'
import { NATIVE_MINT } from '@solana/spl-token'
import {
   RaydiumSwapLogs,
   RaydiumSwapDirection,
   RaydiumAddLiquidityLogs,
   RaydiumRemoveLiquidityLogs,
   isRaydiumSwapLogs,
   isRaydiumAddLiquidityLogs,
   isRaydiumRemoveLiquidityLogs,
} from 'common/src/interfaces/RaydiumSwapLogs'
import { transactionTracker } from 'transaction-sender/src/TransactionTracker'
import sleep from 'common/src/utils/sleep'
import { toBlockchainFormat, toHumanReadableFormat } from 'common/src/utils/formatNumbersForBlockchain'
import { TransactionBuilder } from 'transaction-sender/src/TransactionOperation'
import InstructionOperation from 'transaction-sender/src/interfaces/InstructionOperation'
import InstructionGroup from 'transaction-sender/src/InstructionGroup'
import { MICRO_LAMPORTS_DIVIDE } from 'common/src/constants/constants'
import logger from 'services/src/LoggerService'
import sqrt from 'bn-sqrt'
import { NewTransactionBuilder } from 'transaction-sender/src/TransactionBuilder'
import { WalletType } from 'common/src/enum/WalletType'
import { transactionSender } from 'transaction-sender/src/TransactionSender'

// coin = base token
// pc = quote token
class LiquidityPool {
   baseMintToken: Token
   quoteMintToken: Token
   poolKeys: LiquidityPoolKeys
   poolInfo: LiquidityPoolInfo
   baseMintAmountFromMyWalletsInsideLP: BN = new BN(0)
   quoteMintAmountFromMyWalletsInsideLP: BN = new BN(0)
   externalBaseMintAmountBought: BN = new BN(0)
   externalQuoteMintAmountInvested: BN = new BN(0)

   constructor(
      poolKeys: LiquidityPoolKeys,
      poolInfo: LiquidityPoolInfo,
      externalBaseMintAmountBought = new BN(0),
      externalQuoteMintAmountInvested = new BN(0)
   ) {
      this.baseMintToken = new Token(config.accountAddresses.raydiumAMMProgramId, poolKeys.baseMint, poolKeys.baseDecimals)
      this.quoteMintToken = new Token(config.accountAddresses.raydiumAMMProgramId, poolKeys.quoteMint, poolKeys.quoteDecimals)
      this.poolKeys = poolKeys
      this.poolInfo = poolInfo
      this.externalBaseMintAmountBought = externalBaseMintAmountBought
      this.externalQuoteMintAmountInvested = externalQuoteMintAmountInvested
   }

   getLookupTableAddress(): PublicKey | null {
      if (this.poolKeys.lookupTableAccount.toBase58() == '11111111111111111111111111111111') return null
      return this.poolKeys.lookupTableAccount
   }

   setLookupTableAddress(lookupTableAddress: PublicKey) {
      this.poolKeys.lookupTableAccount = lookupTableAddress
   }

   static initLPUponCreation(targetPoolInfo: ApiPoolInfoV4) {
      const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys
      const baseReserve = toBlockchainFormat(config.lpConfig.tokenAmountInLP, targetPoolInfo.baseDecimals)
      const quoteReserve = toBlockchainFormat(config.lpConfig.solAmountInLP, targetPoolInfo.quoteDecimals)
      const product = baseReserve.mul(quoteReserve)
      const sqrtValue = sqrt(product)

      const poolInfo: LiquidityPoolInfo = {
         baseDecimals: targetPoolInfo.baseDecimals,
         quoteDecimals: targetPoolInfo.quoteDecimals,
         status: new BN(0, 10),
         startTime: new BN(0, 10),
         lpDecimals: targetPoolInfo.lpDecimals,
         baseReserve: baseReserve,
         quoteReserve: quoteReserve,
         lpSupply: sqrtValue.sub(toBlockchainFormat(1, 9)),
      }

      logger.info('LP data: ')
      logger.info(poolInfo)

      return new LiquidityPool(poolKeys, poolInfo)
   }

   static async initLPFromDatabase(
      connection: Connection,
      id: string,
      {
         previousBaseMintAmount,
         previousQuoteMintAmount,
         previousExternalBaseMintAmountBought,
         previousExternalQuoteMintAmountInvested,
      }: {
         previousBaseMintAmount: BN
         previousQuoteMintAmount: BN
         previousExternalBaseMintAmountBought: BN
         previousExternalQuoteMintAmountInvested: BN
      }
   ): Promise<LiquidityPool> {
      const ammInfo = await LiquidityPool.formatAmmKeysById(connection, id)
      const poolKeys = jsonInfo2PoolKeys(ammInfo) as LiquidityPoolKeys

      const poolInfo = await Liquidity.fetchInfo({ connection: connection, poolKeys: poolKeys })
      let currentExternalBaseMintAmountBought = previousBaseMintAmount.sub(poolInfo.baseReserve).abs().add(previousExternalBaseMintAmountBought)
      let currentExternalQuoteMintAmountInvested = previousQuoteMintAmount
         .sub(poolInfo.quoteReserve)
         .abs()
         .add(previousExternalQuoteMintAmountInvested)
      currentExternalBaseMintAmountBought = currentExternalBaseMintAmountBought.isNeg() ? new BN(0) : currentExternalBaseMintAmountBought
      currentExternalQuoteMintAmountInvested = currentExternalQuoteMintAmountInvested.isNeg() ? new BN(0) : currentExternalQuoteMintAmountInvested
      console.log('currentExternalBaseMintAmountBought', currentExternalBaseMintAmountBought.toString())
      console.log('currentExternalQuoteMintAmountInvested', currentExternalQuoteMintAmountInvested.toString())
      console.log('previousBaseMintAmount', previousBaseMintAmount.toString())
      console.log('previousQuoteMintAmount', previousQuoteMintAmount.toString())
      console.log('poolInfo.baseReserve', poolInfo.baseReserve.toString())
      console.log('poolInfo.quoteReserve', poolInfo.quoteReserve.toString())
      console.log('previousExternalBaseMintAmountBought', previousExternalBaseMintAmountBought.toString())
      console.log('previousExternalQuoteMintAmountInvested', previousExternalQuoteMintAmountInvested.toString())
      return new LiquidityPool(poolKeys, poolInfo, currentExternalBaseMintAmountBought, currentExternalQuoteMintAmountInvested)
   }

   async addLiquidity(baseAmount: number, quoteAmount: number) {
      // Implementation to add liquidity
      // This should create a TransactionInstruction for adding liquidity
      // and then call this._createTransaction
      //   const instruction = new TransactionInstruction();
      //   return this._createTransaction(instruction);
   }

   removeAllLiquidity(wallet: SolanaWallet): TransactionBuilder {
      const connection = connectionManager.getWeb3Connection(config.endpoints.http.alchemy)
      const transactionBuilder: TransactionBuilder = new TransactionBuilder(wallet, connection)

      transactionBuilder.addPriorityFee(2_000_000, 200_000)

      let baseTokenAccount = wallet.getAssociatedTokenAddressOrAddInstructionForCreation(transactionBuilder, this.baseMintToken.mint)
      let quoteTokenAccount = wallet.getAssociatedTokenAddressOrAddInstructionForCreation(transactionBuilder, this.quoteMintToken.mint)
      let lpTokenAccount = wallet.getAssociatedTokenAddressOrAddInstructionForCreation(transactionBuilder, this.poolKeys.lpMint)

      console.log('tokens rugpull', new Date().getTime())
      const removeLiquidityInstructionResponse = Liquidity.makeRemoveLiquidityInstruction({
         poolKeys: this.poolKeys,
         amountIn: wallet.getTokenAccountBalance(this.poolKeys.lpMint),
         userKeys: {
            baseTokenAccount: baseTokenAccount,
            quoteTokenAccount: quoteTokenAccount,
            lpTokenAccount: lpTokenAccount,
            owner: wallet.keypair.publicKey,
         },
      })
      console.log('created instruction rugpull', new Date().getTime())
      const { innerTransaction } = removeLiquidityInstructionResponse

      transactionBuilder.addOperation({
         instructions: innerTransaction.instructions,
         commit: () => {},
      })

      return transactionBuilder
   }

   makeSwapTransactionFixedIn(
      amountIn: BN,
      slippage: number,
      userWallet: SolanaWallet,
      swapType: 'quoteForBase' | 'baseForQuote',
      prioritizeFee: boolean = false,
      minAmountOut?: BN
   ): TransactionBuilder {
      const inputToken = swapType === 'quoteForBase' ? this.quoteMintToken : this.baseMintToken
      const outputToken = swapType === 'quoteForBase' ? this.baseMintToken : this.quoteMintToken

      const inputAmountIn = new TokenAmount(inputToken, amountIn)

      const transactionBuilder: TransactionBuilder = new TransactionBuilder(
         userWallet,
         connectionManager.getWeb3Connection(config.endpoints.http.alchemy)
      )
      if (prioritizeFee) {
         transactionBuilder.addPriorityFee(config.lpConfig.computeUnitPriceInMicroLamports, config.lpConfig.computeUnitLimit)
      }

      let tokenAccountIn =
         inputToken.mint.toBase58() == NATIVE_MINT.toBase58()
            ? userWallet.getWrappedNativeAccountOrAddInstructionForCreation(transactionBuilder, inputAmountIn.raw.toNumber())
            : userWallet.getAssociatedTokenAddressOrAddInstructionForCreation(transactionBuilder, inputToken.mint)

      let tokenAccountOut =
         outputToken.mint.toBase58() == NATIVE_MINT.toBase58()
            ? userWallet.getWrappedNativeAccountOrAddInstructionForCreation(transactionBuilder, 0)
            : userWallet.getAssociatedTokenAddressOrAddInstructionForCreation(transactionBuilder, outputToken.mint)

      if (minAmountOut === undefined) {
         const { minAmountOut: minAmountOutCalculated } = Liquidity.computeAmountOut({
            poolKeys: this.poolKeys,
            poolInfo: this.poolInfo,
            amountIn: inputAmountIn,
            currencyOut: outputToken,
            slippage: new Percent(slippage, 100),
         })
         minAmountOut = minAmountOutCalculated.raw
      }

      const { innerTransaction } = Liquidity.makeSwapInstruction({
         poolKeys: this.poolKeys,
         amountIn: inputAmountIn.raw,
         amountOut: minAmountOut,
         fixedSide: 'in',
         userKeys: {
            owner: userWallet.keypair.publicKey,
            tokenAccountIn: tokenAccountIn,
            tokenAccountOut: tokenAccountOut,
         },
      })

      transactionBuilder.addOperation({
         instructions: innerTransaction.instructions,
         commit: () => {},
      })

      userWallet.closeTokenAccountInstruction(transactionBuilder, tokenAccountIn)

      return transactionBuilder
   }

   makeSwapTransactionFixedInTemp(
      transactionBuilder: NewTransactionBuilder,
      amountIn: BN,
      slippage: number,
      userWallet: SolanaWallet,
      swapType: 'quoteForBase' | 'baseForQuote',
      minAmountOut?: BN
   ) {
      const inputToken = swapType === 'quoteForBase' ? this.quoteMintToken : this.baseMintToken
      const outputToken = swapType === 'quoteForBase' ? this.baseMintToken : this.quoteMintToken

      const instructionGroup: InstructionGroup = new InstructionGroup()
      instructionGroup.addSigner(userWallet)

      const inputAmountIn = new TokenAmount(inputToken, amountIn)

      let tokenAccountIn =
         inputToken.mint.toBase58() == NATIVE_MINT.toBase58()
            ? userWallet.getWrappedNativeAccountOrAddInstructionForCreation(instructionGroup, inputAmountIn.raw.toNumber())
            : userWallet.getAssociatedTokenAddressOrAddInstructionForCreation(instructionGroup, inputToken.mint)

      let tokenAccountOut =
         outputToken.mint.toBase58() == NATIVE_MINT.toBase58()
            ? userWallet.getWrappedNativeAccountOrAddInstructionForCreation(instructionGroup, 0)
            : userWallet.getAssociatedTokenAddressOrAddInstructionForCreation(instructionGroup, outputToken.mint)

      if (minAmountOut === undefined) {
         const { minAmountOut: minAmountOutCalculated } = Liquidity.computeAmountOut({
            poolKeys: this.poolKeys,
            poolInfo: this.poolInfo,
            amountIn: inputAmountIn,
            currencyOut: outputToken,
            slippage: new Percent(slippage, 100),
         })
         minAmountOut = minAmountOutCalculated.raw
      }

      const { innerTransaction } = Liquidity.makeSwapInstruction({
         poolKeys: this.poolKeys,
         amountIn: inputAmountIn.raw,
         amountOut: minAmountOut,
         fixedSide: 'in',
         userKeys: {
            owner: userWallet.keypair.publicKey,
            tokenAccountIn: tokenAccountIn,
            tokenAccountOut: tokenAccountOut,
         },
      })

      instructionGroup.addOperation({
         instructions: innerTransaction.instructions,
         commit: () => {},
      })
      userWallet.closeWrappedNativeAccountInstruction(instructionGroup)

      transactionBuilder.addTransactionGroup(instructionGroup)
   }

   makeSwapTransactionFixedOut(
      transactionBuilder: TransactionBuilder,
      amountOut: BN,
      slippage: number,
      userWallet: SolanaWallet,
      swapType: 'quoteForBase' | 'baseForQuote',
      prioritizeFee: boolean = false,
      maxAmountIn?: BN
   ) {
      const inputToken = swapType === 'quoteForBase' ? this.quoteMintToken : this.baseMintToken
      const outputToken = swapType === 'quoteForBase' ? this.baseMintToken : this.quoteMintToken

      const inputAmountIn = new TokenAmount(inputToken, amountOut)

      if (prioritizeFee) {
         transactionBuilder.addPriorityFee(config.lpConfig.computeUnitPriceInMicroLamports, config.lpConfig.computeUnitLimit)
      }

      let tokenAccountIn =
         inputToken.mint.toBase58() == NATIVE_MINT.toBase58()
            ? userWallet.getWrappedNativeAccountOrAddInstructionForCreation(transactionBuilder, inputAmountIn.raw.toNumber())
            : userWallet.getAssociatedTokenAddressOrAddInstructionForCreation(transactionBuilder, inputToken.mint)

      let tokenAccountOut =
         outputToken.mint.toBase58() == NATIVE_MINT.toBase58()
            ? userWallet.getWrappedNativeAccountOrAddInstructionForCreation(transactionBuilder, 0)
            : userWallet.getAssociatedTokenAddressOrAddInstructionForCreation(transactionBuilder, outputToken.mint)

      if (maxAmountIn === undefined) {
         const { maxAmountIn: minAmountOutCalculated } = Liquidity.computeAmountIn({
            poolKeys: this.poolKeys,
            poolInfo: this.poolInfo,
            amountOut: inputAmountIn,
            currencyIn: inputToken,
            slippage: new Percent(slippage, 100),
         })
         maxAmountIn = minAmountOutCalculated.raw
      }

      const { innerTransaction } = Liquidity.makeSwapInstruction({
         poolKeys: this.poolKeys,
         amountIn: maxAmountIn,
         amountOut: amountOut,
         fixedSide: 'out',
         userKeys: {
            owner: userWallet.keypair.publicKey,
            tokenAccountIn: tokenAccountIn,
            tokenAccountOut: tokenAccountOut,
         },
      })

      transactionBuilder.addOperation({
         instructions: innerTransaction.instructions,
         commit: () => {},
      })

      userWallet.closeTokenAccountInstruction(transactionBuilder, tokenAccountIn)
   }

   calculateAmountOut(amountInDecimal: number, slippage: number): { amountOut: BN; minAmountOut: BN } {
      const inputAmountIn = new TokenAmount(this.quoteMintToken, amountInDecimal * 10 ** this.poolKeys.quoteDecimals)

      const { amountOut, minAmountOut } = Liquidity.computeAmountOut({
         poolKeys: this.poolKeys,
         poolInfo: this.poolInfo,
         amountIn: inputAmountIn,
         currencyOut: this.baseMintToken,
         slippage: new Percent(slippage, 100),
      })

      return { amountOut: amountOut.raw, minAmountOut: minAmountOut.raw }
   }

   calculateAmountIn(amountOut: BN, slippage: number, currencyIn: 'base' | 'quote'): { amountIn: BN; maxAmountIn: BN } {
      let inputAmountOut
      if (currencyIn == 'quote') {
         inputAmountOut = new TokenAmount(this.baseMintToken, amountOut)
      } else {
         inputAmountOut = new TokenAmount(this.quoteMintToken, amountOut)
      }

      const { amountIn, maxAmountIn } = Liquidity.computeAmountIn({
         poolKeys: this.poolKeys,
         poolInfo: this.poolInfo,
         amountOut: inputAmountOut,
         currencyIn: currencyIn == 'base' ? this.baseMintToken : this.quoteMintToken,
         slippage: new Percent(slippage, 100),
      })

      return { amountIn: amountIn.raw, maxAmountIn: maxAmountIn.raw }
   }

   static async formatAmmKeysById(connection: Connection, id: string): Promise<ApiPoolInfoV4> {
      const account = await connection.getAccountInfo(new PublicKey(id))
      if (account === null) throw Error(' get id info error ')
      const info = LIQUIDITY_STATE_LAYOUT_V4.decode(account.data)

      const marketId = info.marketId
      const marketAccount = await connection.getAccountInfo(marketId)
      if (marketAccount === null) throw Error(' get market info error')
      const marketInfo = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data)

      const lpMint = info.lpMint
      const lpMintAccount = await connection.getAccountInfo(lpMint)
      if (lpMintAccount === null) throw Error(' get lp mint info error')
      const lpMintInfo = SPL_MINT_LAYOUT.decode(lpMintAccount.data)

      return {
         id,
         baseMint: info.baseMint.toString(),
         quoteMint: info.quoteMint.toString(),
         lpMint: info.lpMint.toString(),
         baseDecimals: info.baseDecimal.toNumber(),
         quoteDecimals: info.quoteDecimal.toNumber(),
         lpDecimals: lpMintInfo.decimals,
         version: 4,
         programId: account.owner.toString(),
         authority: Liquidity.getAssociatedAuthority({ programId: account.owner }).publicKey.toString(),
         openOrders: info.openOrders.toString(),
         targetOrders: info.targetOrders.toString(),
         baseVault: info.baseVault.toString(),
         quoteVault: info.quoteVault.toString(),
         withdrawQueue: info.withdrawQueue.toString(),
         lpVault: info.lpVault.toString(),
         marketVersion: 3,
         marketProgramId: info.marketProgramId.toString(),
         marketId: info.marketId.toString(),
         marketAuthority: Market.getAssociatedAuthority({ programId: info.marketProgramId, marketId: info.marketId }).publicKey.toString(),
         marketBaseVault: marketInfo.baseVault.toString(),
         marketQuoteVault: marketInfo.quoteVault.toString(),
         marketBids: marketInfo.bids.toString(),
         marketAsks: marketInfo.asks.toString(),
         marketEventQueue: marketInfo.eventQueue.toString(),
         lookupTableAccount: PublicKey.default.toString(),
      }
   }

   async savePoolInfo() {
      await DatabaseService.saveLPToDatabase({
         ammId: this.poolKeys.id.toString(),
         baseMint: this.baseMintToken.mint.toString(),
         quoteMint: this.quoteMintToken.mint.toString(),
         baseDecimals: this.poolKeys.baseDecimals,
         quoteDecimals: this.poolKeys.quoteDecimals,
         isActivated: true,
         tokenSymbol: this.baseMintToken.symbol + '-' + this.quoteMintToken.symbol,
         baseMintAmountFromMyWalletsInsideLP: BigInt(this.baseMintAmountFromMyWalletsInsideLP.toString()),
         quoteMintAmountFromMyWalletsInsideLP: BigInt(this.quoteMintAmountFromMyWalletsInsideLP.toString()),
         lookupTableAccount: this.poolKeys.lookupTableAccount.toString(),
         quoteMintAmount: BigInt(this.poolInfo.quoteReserve.toString()),
         baseMintAmount: BigInt(this.poolInfo.baseReserve.toString()),
         externalBaseMintAmountBought: BigInt(this.externalBaseMintAmountBought.toString()),
         externalQuoteMintAmountInvested: BigInt(this.externalQuoteMintAmountInvested.toString()),
      })
   }

   async listenForQuoteVaultChanges(strategyManager: StrategyManager) {
      const wssConnection = connectionManager.getWeb3WssConnection(config.endpoints.http.quicknode, config.endpoints.websocket.quicknode)
      wssConnection.onLogs(
         this.poolKeys.quoteVault,
         (logs, ctx) => {
            try {
               if (logs.err) return
               const rayLogs = logs.logs.filter((log) => log.includes('Program log: ray_log:'))
               if (rayLogs.length == 0) {
                  logger.info('No ray log found in logs: ' + logs.signature)
                  logger.info(logs.logs)
                  return
               }

               const sentTxMappingData = transactionTracker.getTransaction(logs.signature)
               if (sentTxMappingData?.executeCommits) sentTxMappingData.executeCommits()
               for (let i = 0; i < rayLogs.length; i++) {
                  const rayLog = rayLogs[i]
                  const rayLogBuffer = Buffer.from(rayLog.replace('Program log: ray_log:', '').trim(), 'base64')
                  const dataView = new DataView(rayLogBuffer.buffer, rayLogBuffer.byteOffset, rayLogBuffer.byteLength)
                  let raydiumSwapLogs: RaydiumSwapLogs | RaydiumAddLiquidityLogs | RaydiumRemoveLiquidityLogs
                  switch (dataView.getUint8(0)) {
                     case 0:
                        logger.info('LP created confirmed')
                        return
                     case 1:
                        raydiumSwapLogs = this.decodeAddLiquidityLog(dataView)
                        break
                     case 2:
                        raydiumSwapLogs = this.decodeRemoveLiquidityLog(dataView)
                        break
                     case 3:
                        raydiumSwapLogs = this.decodeSwapBaseInLog(dataView)
                        break
                     case 4:
                        raydiumSwapLogs = this.decodeSwapBaseOutLog(dataView)
                        break
                     default:
                        return
                  }

                  if (sentTxMappingData) {
                     if (isRaydiumSwapLogs(raydiumSwapLogs)) {
                        if (RaydiumSwapDirection.BoughtBaseToken == raydiumSwapLogs.direction) {
                           this.quoteMintAmountFromMyWalletsInsideLP = this.quoteMintAmountFromMyWalletsInsideLP.add(raydiumSwapLogs.amount_in)
                           this.baseMintAmountFromMyWalletsInsideLP = this.baseMintAmountFromMyWalletsInsideLP.sub(raydiumSwapLogs.amount_out)

                           sentTxMappingData.wallets[i].deductFromSpendableBalance(raydiumSwapLogs.amount_in)
                           sentTxMappingData.wallets[i].addTokenBalance(this.baseMintToken.mint, raydiumSwapLogs.amount_out)
                           logger.info('checking if macro wallet')
                           if (sentTxMappingData.wallets[i].walletType == WalletType.macro) {
                              const transactionBuilder = new NewTransactionBuilder()
                              logger.info('Sending macro children transactions start loop')
                              for (let j = 0; j < config.lpConfig.macroChildrenAccountCount; j++) {
                                 const instructionGroup = new InstructionGroup()
                                 instructionGroup.addSigner(sentTxMappingData.wallets[i])
                                 logger.info(raydiumSwapLogs.amount_out.div(new BN(config.lpConfig.macroChildrenAccountCount)).sub(new BN(100)))
                                 sentTxMappingData.wallets[i].createNewAccountAndSendTokenInstruction(
                                    instructionGroup,
                                    this.baseMintToken.mint,
                                    raydiumSwapLogs.amount_out.div(new BN(config.lpConfig.macroChildrenAccountCount)).sub(new BN(100))
                                 )
                                 transactionBuilder.addTransactionGroup(instructionGroup)
                              }
                              logger.info('Sending macro children transactions end loop')
                              const builtLegacyTransactions = transactionBuilder.buildLegacyTransactions()
                              logger.info('Sending macro children transactions')
                              transactionSender.sendLegacyTransactions(builtLegacyTransactions)
                           }
                           logger.info(
                              `Our wallet "${sentTxMappingData.wallets[i].keypair.publicKey}" swapped confirmed with TxID: "${
                                 logs.signature
                              }". Swapped: "${toHumanReadableFormat(raydiumSwapLogs.amount_in, 9)}" SOL, for: "${toHumanReadableFormat(
                                 raydiumSwapLogs.amount_out,
                                 9
                              )}" Token`
                           )
                        } else {
                           this.baseMintAmountFromMyWalletsInsideLP = this.baseMintAmountFromMyWalletsInsideLP.add(raydiumSwapLogs.amount_in)
                           this.quoteMintAmountFromMyWalletsInsideLP = this.quoteMintAmountFromMyWalletsInsideLP.sub(raydiumSwapLogs.amount_out)

                           this.externalQuoteMintAmountInvested = this.externalQuoteMintAmountInvested.sub(raydiumSwapLogs.amount_out)

                           sentTxMappingData.wallets[i].addToSpendableBalance(raydiumSwapLogs.amount_out)
                           sentTxMappingData.wallets[i].deductTokenBalance(this.baseMintToken.mint, raydiumSwapLogs.amount_in)
                           logger.info(
                              `Our wallet "${sentTxMappingData.wallets[i].keypair.publicKey}" swapped confirmed with TxID: "${
                                 logs.signature
                              }". Swapped: "${toHumanReadableFormat(raydiumSwapLogs.amount_in, 9)}" Token, for: "${toHumanReadableFormat(
                                 raydiumSwapLogs.amount_out,
                                 9
                              )}" SOL`
                           )
                        }
                     } else if (isRaydiumAddLiquidityLogs(raydiumSwapLogs)) {
                        // console.log("Our wallet added liquidity confirmed. Added: ", raydiumSwapLogs.base_token_amount_in_decimal_form, " for: ", raydiumSwapLogs.quote_token_amount_in_decimal_form);
                        this.baseMintAmountFromMyWalletsInsideLP = this.baseMintAmountFromMyWalletsInsideLP.add(raydiumSwapLogs.base_token_amount_in)
                        this.quoteMintAmountFromMyWalletsInsideLP = this.quoteMintAmountFromMyWalletsInsideLP.add(
                           raydiumSwapLogs.quote_token_amount_in
                        )

                        sentTxMappingData.wallets[i].deductTokenBalance(this.baseMintToken.mint, raydiumSwapLogs.base_token_amount_in)
                        sentTxMappingData.wallets[i].deductFromSpendableBalance(raydiumSwapLogs.quote_token_amount_in)
                        sentTxMappingData.wallets[i].addTokenBalance(this.poolKeys.lpMint, raydiumSwapLogs.lp_token_amount_mint)
                     } else if (isRaydiumRemoveLiquidityLogs(raydiumSwapLogs)) {
                        logger.info(
                           `Our wallet "${sentTxMappingData.wallets[i].keypair.publicKey}" removed liquidity confirmed with TxID: "${
                              logs.signature
                           }". Removed: "${toHumanReadableFormat(raydiumSwapLogs.base_token_amount_out, 9)}" Token, with: "${toHumanReadableFormat(
                              raydiumSwapLogs.quote_token_amount_out,
                              9
                           )} SOL`
                        )
                        this.baseMintAmountFromMyWalletsInsideLP = this.baseMintAmountFromMyWalletsInsideLP.sub(raydiumSwapLogs.base_token_amount_out)
                        this.quoteMintAmountFromMyWalletsInsideLP = this.quoteMintAmountFromMyWalletsInsideLP.sub(
                           raydiumSwapLogs.quote_token_amount_out
                        )

                        this.externalQuoteMintAmountInvested = this.externalQuoteMintAmountInvested.sub(raydiumSwapLogs.quote_token_amount_out)

                        sentTxMappingData.wallets[i].addTokenBalance(this.baseMintToken.mint, raydiumSwapLogs.base_token_amount_out)
                        sentTxMappingData.wallets[i].addToSpendableBalance(raydiumSwapLogs.quote_token_amount_out)
                        sentTxMappingData.wallets[i].deductTokenBalance(this.poolKeys.lpMint, raydiumSwapLogs.lp_token_amount_burn)
                     }
                  } else {
                     if (isRaydiumSwapLogs(raydiumSwapLogs)) {
                        if (RaydiumSwapDirection.BoughtBaseToken == raydiumSwapLogs.direction) {
                           this.externalBaseMintAmountBought = this.externalBaseMintAmountBought.add(raydiumSwapLogs.amount_out)
                           this.externalQuoteMintAmountInvested = this.externalQuoteMintAmountInvested.add(raydiumSwapLogs.amount_in)
                        } else if (RaydiumSwapDirection.BoughtQuoteToken == raydiumSwapLogs.direction) {
                           this.externalBaseMintAmountBought = this.externalBaseMintAmountBought.sub(raydiumSwapLogs.amount_in)
                           this.externalQuoteMintAmountInvested = this.externalQuoteMintAmountInvested.sub(raydiumSwapLogs.amount_out)
                        }
                     } else if (isRaydiumAddLiquidityLogs(raydiumSwapLogs)) {
                        this.externalBaseMintAmountBought = this.externalBaseMintAmountBought.sub(raydiumSwapLogs.base_token_amount_in)
                        this.externalQuoteMintAmountInvested = this.externalQuoteMintAmountInvested.add(raydiumSwapLogs.quote_token_amount_in)
                     } else if (isRaydiumRemoveLiquidityLogs(raydiumSwapLogs)) {
                        this.externalBaseMintAmountBought = this.externalBaseMintAmountBought.add(raydiumSwapLogs.base_token_amount_out)
                        this.externalQuoteMintAmountInvested = this.externalQuoteMintAmountInvested.sub(raydiumSwapLogs.quote_token_amount_out)
                     }
                     logger.info(
                        `External wallet swapped confirmed with TxID: ${logs.signature}, External base bought: ${this.externalBaseMintAmountBought}, External quote invested: ${this.externalQuoteMintAmountInvested}`
                     )
                  }
                  logger.info(
                     `LP data: base reserve: ${toHumanReadableFormat(this.poolInfo.baseReserve, 9)}, quote reserve: ${toHumanReadableFormat(
                        this.poolInfo.quoteReserve,
                        9
                     )}`
                  )
                  if (this.externalQuoteMintAmountInvested.isNeg()) this.externalQuoteMintAmountInvested = new BN(0)
                  this.poolInfo.baseReserve = raydiumSwapLogs.base_token_amount_after
                  this.poolInfo.quoteReserve = raydiumSwapLogs.quote_token_amount_after
                  if (isRaydiumAddLiquidityLogs(raydiumSwapLogs) || isRaydiumRemoveLiquidityLogs(raydiumSwapLogs)) {
                     this.poolInfo.lpSupply = raydiumSwapLogs.lp_token_amount_after
                  }
               }
               strategyManager.handleEvent('lp transaction', this)
            } catch (e) {
               console.log(e)
            }
         },
         'processed'
      )
   }

   decodeSwapBaseInLog(dataView: DataView): RaydiumSwapLogs {
      // Create an object to hold the decoded values
      const swapBaseInLog = {
         log_type: dataView.getUint8(0),
         amount_in: dataView.getBigUint64(1, true),
         minimum_out: dataView.getBigUint64(9, true),
         direction: dataView.getBigUint64(17, true),
         user_source: dataView.getBigUint64(25, true),
         pool_coin: dataView.getBigUint64(33, true),
         pool_pc: dataView.getBigUint64(41, true),
         amount_out: dataView.getBigUint64(49, true),
      }

      // TEST THE CALCULATIONS

      const raydiumSwapLogs: RaydiumSwapLogs = {
         direction: swapBaseInLog.direction.toString() == '1' ? RaydiumSwapDirection.BoughtBaseToken : RaydiumSwapDirection.BoughtQuoteToken,
         amount_in: new BN(swapBaseInLog.amount_in.toString()),
         amount_out: new BN(swapBaseInLog.amount_out.toString()),
         base_token_amount_before: new BN(swapBaseInLog.pool_coin.toString()),
         base_token_amount_after: new BN(0),
         quote_token_amount_before: new BN(swapBaseInLog.pool_pc.toString()),
         quote_token_amount_after: new BN(0),
      }

      if (raydiumSwapLogs.direction == RaydiumSwapDirection.BoughtBaseToken) {
         raydiumSwapLogs.quote_token_amount_after = raydiumSwapLogs.quote_token_amount_before.add(raydiumSwapLogs.amount_in)
         raydiumSwapLogs.base_token_amount_after = raydiumSwapLogs.base_token_amount_before.sub(raydiumSwapLogs.amount_out)
      } else {
         raydiumSwapLogs.quote_token_amount_after = raydiumSwapLogs.quote_token_amount_before.sub(raydiumSwapLogs.amount_out)
         raydiumSwapLogs.base_token_amount_after = raydiumSwapLogs.base_token_amount_before.add(raydiumSwapLogs.amount_in)
      }

      return raydiumSwapLogs
   }

   decodeSwapBaseOutLog(dataView: DataView): RaydiumSwapLogs {
      const swapBaseOutLog = {
         log_type: dataView.getUint8(0),
         max_in: dataView.getBigUint64(1, true),
         amount_out: dataView.getBigUint64(9, true),
         direction: dataView.getBigUint64(17, true),
         user_source: dataView.getBigUint64(25, true),
         pool_coin: dataView.getBigUint64(33, true),
         pool_pc: dataView.getBigUint64(41, true),
         deduct_in: dataView.getBigUint64(49, true),
      }
      // TEST THE CALCULATIONS

      const raydiumSwapLogs: RaydiumSwapLogs = {
         direction: swapBaseOutLog.direction.toString() == '1' ? RaydiumSwapDirection.BoughtBaseToken : RaydiumSwapDirection.BoughtQuoteToken,
         amount_in: new BN(swapBaseOutLog.deduct_in.toString()),
         amount_out: new BN(swapBaseOutLog.amount_out.toString()),
         base_token_amount_before: new BN(swapBaseOutLog.pool_coin.toString()),
         base_token_amount_after: new BN(0),
         quote_token_amount_before: new BN(swapBaseOutLog.pool_pc.toString()),
         quote_token_amount_after: new BN(0),
      }

      if (raydiumSwapLogs.direction == RaydiumSwapDirection.BoughtBaseToken) {
         raydiumSwapLogs.quote_token_amount_after = raydiumSwapLogs.quote_token_amount_before.add(raydiumSwapLogs.amount_in)
         raydiumSwapLogs.base_token_amount_after = raydiumSwapLogs.base_token_amount_before.sub(raydiumSwapLogs.amount_out)
      } else {
         raydiumSwapLogs.quote_token_amount_after = raydiumSwapLogs.quote_token_amount_before.sub(raydiumSwapLogs.amount_out)
         raydiumSwapLogs.base_token_amount_after = raydiumSwapLogs.base_token_amount_before.add(raydiumSwapLogs.amount_in)
      }

      return raydiumSwapLogs
   }

   decodeRemoveLiquidityLog(dataView: DataView): RaydiumRemoveLiquidityLogs {
      const swapBaseInLog = {
         log_type: dataView.getUint8(0),
         withdraw_lp: dataView.getBigUint64(1, true),
         user_lp: dataView.getBigUint64(9, true),
         pool_coin: dataView.getBigUint64(17, true),
         pool_pc: dataView.getBigUint64(25, true),
         pool_lp: dataView.getBigUint64(33, true),
         calc_pnl_x: dataView.getBigUint64(41, true),
         calc_pnl_y: dataView.getBigUint64(57, true),
         out_coin: dataView.getBigUint64(73, true),
         out_pc: dataView.getBigUint64(81, true),
      }
      const raydiumRemoveLiquidityLogs = {
         lp_token_amount_burn: new BN(swapBaseInLog.withdraw_lp.toString()),
         base_token_amount_out: new BN(swapBaseInLog.out_coin.toString()),
         quote_token_amount_out: new BN(swapBaseInLog.out_pc.toString()),

         base_token_amount_before: new BN(swapBaseInLog.pool_coin.toString()),
         base_token_amount_after: new BN(swapBaseInLog.pool_coin.toString()).sub(new BN(swapBaseInLog.out_coin.toString())),

         quote_token_amount_before: new BN(swapBaseInLog.pool_pc.toString()),
         quote_token_amount_after: new BN(swapBaseInLog.pool_pc.toString()).sub(new BN(swapBaseInLog.out_pc.toString())),

         lp_token_amount_before: new BN(swapBaseInLog.pool_lp.toString()),
         lp_token_amount_after: new BN(swapBaseInLog.pool_lp.toString()).sub(new BN(swapBaseInLog.withdraw_lp.toString())),
      }
      return raydiumRemoveLiquidityLogs
   }

   decodeAddLiquidityLog(dataView: DataView): RaydiumAddLiquidityLogs {
      const swapBaseInLog = {
         log_type: dataView.getUint8(0),
         max_coin: dataView.getBigUint64(1, true),
         max_pc: dataView.getBigUint64(9, true),
         base: dataView.getBigUint64(17, true),
         pool_coin: dataView.getBigUint64(25, true),
         pool_pc: dataView.getBigUint64(33, true),
         pool_lp: dataView.getBigUint64(41, true),
         calc_pnl_x: dataView.getBigUint64(49, true),
         calc_pnl_y: dataView.getBigUint64(65, true),
         deduct_coin: dataView.getBigUint64(81, true),
         deduct_pc: dataView.getBigUint64(89, true),
         mint_lp: dataView.getBigUint64(97, true),
      }

      const raydiumRemoveLiquidityLogs = {
         lp_token_amount_mint: new BN(swapBaseInLog.mint_lp.toString()),
         base_token_amount_in: new BN(swapBaseInLog.deduct_coin.toString()),
         quote_token_amount_in: new BN(swapBaseInLog.deduct_pc.toString()),

         base_token_amount_before: new BN(swapBaseInLog.pool_coin.toString()),
         base_token_amount_after: new BN(swapBaseInLog.pool_coin.toString()).add(new BN(swapBaseInLog.deduct_coin.toString())),

         quote_token_amount_before: new BN(swapBaseInLog.pool_pc.toString()),
         quote_token_amount_after: new BN(swapBaseInLog.pool_pc.toString()).add(new BN(swapBaseInLog.deduct_pc.toString())),

         lp_token_amount_before: new BN(swapBaseInLog.pool_lp.toString()),
         lp_token_amount_after: new BN(swapBaseInLog.pool_lp.toString()).add(new BN(swapBaseInLog.mint_lp.toString())),
      }

      return raydiumRemoveLiquidityLogs
   }
}

export default LiquidityPool
