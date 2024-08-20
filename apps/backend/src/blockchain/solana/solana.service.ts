/* eslint-disable @typescript-eslint/no-unused-vars */
import { BlockchainInterface } from 'src/common/interfaces/blockchain.interface'
import {
   Connection,
   PublicKey,
   Keypair,
   TransactionInstruction,
   AddressLookupTableAccount,
   TransactionMessage,
   VersionedTransaction,
   SystemProgram,
   TokenBalance,
   LAMPORTS_PER_SOL,
   Transaction,
   sendAndConfirmTransaction,
} from '@solana/web3.js'
import { isSolanaError, SOLANA_ERROR__INSTRUCTION_ERROR__INSUFFICIENT_FUNDS } from '@solana/errors'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { Umi } from '@metaplex-foundation/umi'
import * as bs58 from 'bs58'
import axios from 'axios'
import { transactionSenderAndConfirmationWaiter } from 'src/common/helpers/transactionSender'
import { getSignature } from 'src/common/helpers/getSignature'
import * as fs from 'fs'
import { JupiterPriceReponse } from 'shared-types/src/JupiterPriceResponse.interface'
import BigNumber from 'bignumber.js'

export class SolanaService {
   public quickNodeConnection: Connection = new Connection(
      'https://frosty-neat-film.solana-mainnet.quiknode.pro/bc93aa68cf48e78a3afd0267b839ff4482f0958f/',
   )
   public defaultSolanaConnection: Connection = new Connection('https://api.mainnet-beta.solana.com/')
   public umi: Umi = createUmi('https://frosty-neat-film.solana-mainnet.quiknode.pro/bc93aa68cf48e78a3afd0267b839ff4482f0958f/')
   public juputerSwapURL: string = 'https://quote-api.jup.ag/v6'
   public jupiterPriceURL: string = 'https:///price.jup.ag/v6'

   public feeReceiverData = { feePercentage: process.env.FEE_PERCENTAGE, feeReceiver: new PublicKey(process.env.FEE_ACCOUNT_ADDRESS) }

   public knownAddresses = {
      WSOL: 'So11111111111111111111111111111111111111112',
   }

   createNewWallet() {
      return Keypair.generate()
   }

   base58ToKeypair(base58PrivateKey: string): Keypair {
      try {
         const privateKeyBuffer = bs58.decode(base58PrivateKey)
         return Keypair.fromSecretKey(privateKeyBuffer)
      } catch (error) {
         throw new Error('Invalid base58 private key.')
      }
   }

   async transferSol(fromWallet: Keypair, toAddress: string, amount: number): Promise<string> {
      const transaction = new Transaction().add(
         SystemProgram.transfer({
            fromPubkey: fromWallet.publicKey,
            toPubkey: new PublicKey(toAddress),
            lamports: amount * LAMPORTS_PER_SOL,
         }),
      )
      try {
         const signature = await sendAndConfirmTransaction(this.quickNodeConnection, transaction, [fromWallet])
         return signature
      } catch (error) {
         console.log(error)
         if (isSolanaError(error, SOLANA_ERROR__INSTRUCTION_ERROR__INSUFFICIENT_FUNDS)) {
            console.log(error)
            throw new Error('Insufficient balance')
         }
      }
   }

   privateKeyToBase58(privateKey: Uint8Array): string {
      return bs58.encode(privateKey)
   }

   async getBalance(address: string): Promise<number> {
      const publicKey = new PublicKey(address)
      return this.quickNodeConnection.getBalance(publicKey)
   }

   async getBalanceForMultipleAddresses(addresses: string[]): Promise<{
      [key: string]: number
   }> {
      const publicKeys = addresses.map((address) => new PublicKey(address))
      const accountsInfo = await this.quickNodeConnection.getMultipleAccountsInfo(publicKeys)
      return accountsInfo.reduce((acc, accountInfo, index) => {
         const publicKey = publicKeys[index]
         if (accountInfo) {
            acc[publicKey.toBase58()] = accountInfo.lamports
         } else {
            acc[publicKey.toBase58()] = 0
         }

         return acc
      }, {})
   }

   async makeJupiterSwapTransaction(
      inputMint: string,
      outputMint: string,
      inputAmount: BigNumber,
      slippageBps: number,
      wallet: Keypair,
      prioritizationFeeLamports: number | 'auto',
   ): Promise<{
      outputAmountUi: BigNumber
      outputAmount: BigNumber
      txSignature: string
   }> {
      const quoteResponse = await axios.get(`${this.juputerSwapURL}/quote`, {
         params: {
            inputMint,
            outputMint,
            amount: inputAmount.integerValue(BigNumber.ROUND_DOWN),
            slippageBps,
         },
      })

      console.log('Quote response: ', quoteResponse.data)

      const instructions = await axios.post(
         `${this.juputerSwapURL}/swap-instructions`,
         {
            userPublicKey: wallet.publicKey.toBase58(),
            quoteResponse: quoteResponse.data,
            dynamicComputeUnitLimit: true,
            prioritizationFeeLamports: prioritizationFeeLamports,
         },
         {
            headers: {
               'Content-Type': 'application/json',
            },
         },
      )

      const {
         tokenLedgerInstruction, // If you are using `useTokenLedger = true`.
         computeBudgetInstructions, // The necessary instructions to setup the compute budget.
         setupInstructions, // Setup missing ATA for the users.
         swapInstruction: swapInstructionPayload, // The actual swap instruction.
         cleanupInstruction, // Unwrap the SOL if `wrapAndUnwrapSol = true`.
         addressLookupTableAddresses, // The lookup table addresses that you can use if you are using versioned transaction.
      } = instructions.data

      const deserializeInstruction = (instruction) => {
         return new TransactionInstruction({
            programId: new PublicKey(instruction.programId),
            keys: instruction.accounts.map((key) => ({
               pubkey: new PublicKey(key.pubkey),
               isSigner: key.isSigner,
               isWritable: key.isWritable,
            })),
            data: Buffer.from(instruction.data, 'base64'),
         })
      }

      const getAddressLookupTableAccounts = async (keys: string[]): Promise<AddressLookupTableAccount[]> => {
         const addressLookupTableAccountInfos = await this.quickNodeConnection.getMultipleAccountsInfo(keys.map((key) => new PublicKey(key)))

         return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
            const addressLookupTableAddress = keys[index]
            if (accountInfo) {
               const addressLookupTableAccount = new AddressLookupTableAccount({
                  key: new PublicKey(addressLookupTableAddress),
                  state: AddressLookupTableAccount.deserialize(accountInfo.data),
               })
               acc.push(addressLookupTableAccount)
            }

            return acc
         }, new Array<AddressLookupTableAccount>())
      }

      const addressLookupTableAccounts: AddressLookupTableAccount[] = []
      addressLookupTableAccounts.push(...(await getAddressLookupTableAccounts(addressLookupTableAddresses)))

      const blockhash = await this.quickNodeConnection.getLatestBlockhash()

      const allInstructions = [
         ...computeBudgetInstructions.map(deserializeInstruction),
         ...setupInstructions.map(deserializeInstruction),
         deserializeInstruction(swapInstructionPayload),
         deserializeInstruction(cleanupInstruction),
      ]

      let feeAmountLamports: BigNumber

      if (inputMint === this.knownAddresses.WSOL) {
         // Calculate 0.8% of the input amount
         feeAmountLamports = inputAmount.multipliedBy(0.008)
      } else if (outputMint === this.knownAddresses.WSOL) {
         // Extract output amount from quoteResponse data (assuming it is available)
         const outputAmount = quoteResponse.data.outAmount // Adjust this based on actual data structure
         feeAmountLamports = new BigNumber(outputAmount).multipliedBy(0.008)
      }

      const feeTransferInstruction = SystemProgram.transfer({
         fromPubkey: wallet.publicKey,
         toPubkey: this.feeReceiverData.feeReceiver,
         lamports: feeAmountLamports.integerValue(BigNumber.ROUND_DOWN).toNumber(),
      })
      allInstructions.push(feeTransferInstruction)

      const messageV0 = new TransactionMessage({
         payerKey: wallet.publicKey,
         recentBlockhash: blockhash.blockhash,
         instructions: allInstructions,
      }).compileToV0Message(addressLookupTableAccounts)

      const transaction = new VersionedTransaction(messageV0)
      transaction.sign([wallet])

      const signature = getSignature(transaction)

      // console.time('simulateTransaction')
      // const { value: simulatedTransactionResponse } = await this.quickNodeConnection.simulateTransaction(transaction, {
      //    replaceRecentBlockhash: true,
      //    commitment: 'processed',
      // })
      // const { err, logs } = simulatedTransactionResponse

      // if (err) {
      //    // Simulation error, we can check the logs for more details
      //    // If you are getting an invalid account error, make sure that you have the input mint account to actually swap from.
      //    console.error('Simulation Error:')
      //    console.error({ err, logs })
      //    return
      // }
      // console.timeEnd('simulateTransaction')

      console.log('Current time: ', new Date().toLocaleTimeString())

      const transactionResponse = await transactionSenderAndConfirmationWaiter({
         connection: this.quickNodeConnection,
         serializedTransaction: Buffer.from(transaction.serialize()),
         blockhashWithExpiryBlockHeight: blockhash,
      })

      if (!transactionResponse) {
         throw new Error('Transaction not confirmed')
      }

      if (transactionResponse.meta?.err) {
         throw new Error(`Transaction failed: ${transactionResponse.meta.err}`)
      }

      const findTokenBalance = (balances: Array<TokenBalance>, mint: string, owner: string): BigNumber => {
         const balance = balances.find((balance) => balance.mint === mint && balance.owner === owner)
         const balanceAmount = balance ? new BigNumber(balance.uiTokenAmount.uiAmount) : new BigNumber(0)
         return balanceAmount.isNaN() ? new BigNumber(0) : balanceAmount
      }

      const findTokenDecimals = (balances: Array<TokenBalance>, mint: string): number => {
         const balance = balances.find((balance) => balance.mint === mint)
         return balance ? balance.uiTokenAmount.decimals : 0
      }

      const postBalanceUi = findTokenBalance(transactionResponse.meta.postTokenBalances, outputMint, wallet.publicKey.toBase58())
      const preBalanceUi = findTokenBalance(transactionResponse.meta.preTokenBalances, outputMint, wallet.publicKey.toBase58())
      console.log('Post balance: ', postBalanceUi.toString())
      console.log('Pre balance: ', preBalanceUi.toString())
      const outputAmountUi = postBalanceUi.minus(preBalanceUi)

      const tokenDecimals = findTokenDecimals(transactionResponse.meta.postTokenBalances, outputMint)
      console.log(`https://solscan.io/tx/${signature}`)

      console.log(`Output amount: ${outputAmountUi.toString()}`)

      return {
         outputAmountUi,
         outputAmount: outputAmountUi.multipliedBy(10 ** tokenDecimals),
         txSignature: signature,
      }
   }

   async getPriceForMultipleTokens(tokensToCheck: string[], vsToken: string = this.knownAddresses.WSOL): Promise<JupiterPriceReponse> {
      const tokenPrices = await axios.get(`${this.jupiterPriceURL}/price`, {
         params: {
            ids: tokensToCheck.join(','),
            vsToken: vsToken,
         },
      })
      return tokenPrices.data
   }
}
