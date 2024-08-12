// src/events/raydiumEvents.ts

import { ParsedMessageAccount, PublicKey } from '@solana/web3.js'
import BigDecimal from 'src/common/BigDecimal'
import { JUPITER_AGREGATOR_PUBLIC_KEY, RAYDIUM_AUTHORITY_PUBLIC_KEY } from 'src/config/consts'
import db from 'src/drizzle/db'
import { dexTransactionsTable, InsertDexTransactionLogs, InsertTokenPairInfo, tokenPairInfo } from 'src/drizzle/schema'
import { ParsedBlockTransaction } from 'src/interfaces/ParsedBlockTransaction.interface'
import { LogType, LogParseResult } from 'src/interfaces/RaydiumLogParseResult.interface'
import * as fs from 'fs'
import { convertTokenAddressToName } from 'src/common/convertTokenAddressToName'
import solPriceServiceInstance from 'src/services/SolPriceService'

export async function parseRaydiumTransactions(transactions: ParsedBlockTransaction[], blockNumber: number, blockTimestamp: number) {
   const logTypesCount = {
      InitLiquidity: 0,
      AddLiquidity: 0,
      RemoveLiquidity: 0,
      SwapBaseIn: 0,
      SwapBaseOut: 0,
   }

   const insertDexTransactionLogsArray: InsertDexTransactionLogs[] = []

   for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i]
      if (tx.meta.err) continue
      const rayLogs = tx.meta.logMessages.filter((log) => log.includes('Program log: ray_log:'))
      for (let i = 0; i < rayLogs.length; i++) {
         const rayLog = rayLogs[i]
         const rayLogBuffer = Buffer.from(rayLog.replace('Program log: ray_log:', '').trim(), 'base64')
         const dataView = new DataView(rayLogBuffer.buffer, rayLogBuffer.byteOffset, rayLogBuffer.byteLength)

         const logType = dataView.getUint8(0) as LogType
         let insertDexTransactionLogsPartial = parseTransaction(dataView, logType, tx)

         //  writeAllLogsToFile(logType, tx, insertDexTransactionLogs)

         if (insertDexTransactionLogsPartial === undefined || insertDexTransactionLogsPartial.primaryTokenName === undefined) continue

         if (insertDexTransactionLogsPartial.primaryTokenName === 'USDC') {
            insertDexTransactionLogsPartial.primaryTokenPrice = '1'
            insertDexTransactionLogsPartial.secondaryTokenPrice = new BigDecimal(insertDexTransactionLogsPartial.primaryTokenAmount)
               .divide(new BigDecimal(insertDexTransactionLogsPartial.secondaryTokenAmount))
               .toString()
         } else {
            insertDexTransactionLogsPartial.primaryTokenPrice = solPriceServiceInstance.getCurrentSolPriceInUSD().toString()
            insertDexTransactionLogsPartial.secondaryTokenPrice = new BigDecimal(insertDexTransactionLogsPartial.primaryTokenPrice)
               .multiply(new BigDecimal(insertDexTransactionLogsPartial.primaryTokenAmount))
               .divide(new BigDecimal(insertDexTransactionLogsPartial.secondaryTokenAmount))
               .toString()
         }

         let transactionValueInUsd = new BigDecimal(insertDexTransactionLogsPartial.primaryTokenPrice).multiply(
            new BigDecimal(insertDexTransactionLogsPartial.primaryTokenAmount)
         )

         if (logType === LogType.RemoveLiquidity || logType === LogType.AddLiquidity) {
            transactionValueInUsd.multiply(new BigDecimal(2))
         }

         const insertDexTransactionLogsFull: InsertDexTransactionLogs = {
            primaryTokenAmount: parseFloat(insertDexTransactionLogsPartial.primaryTokenAmount).toFixed(8),
            primaryTokenName: insertDexTransactionLogsPartial.primaryTokenName,
            primaryTokenPrice: parseFloat(insertDexTransactionLogsPartial.primaryTokenPrice).toFixed(8),
            secondaryTokenAmount: parseFloat(insertDexTransactionLogsPartial.secondaryTokenAmount).toFixed(8),
            secondaryTokenAddress: insertDexTransactionLogsPartial.secondaryTokenAddress,
            secondaryTokenPrice: parseFloat(insertDexTransactionLogsPartial.secondaryTokenPrice).toFixed(8),
            transactionType: insertDexTransactionLogsPartial.transactionType,
            transactionValueInUsd: parseFloat(transactionValueInUsd.toString()).toFixed(8),
            blockNumber: blockNumber,
            dexName: 'Raydium',
            timestamp: new Date(blockTimestamp * 1000),
            transactionId: tx.transaction.signatures[0],
            signer: tx.transaction.message.accountKeys[0].pubkey.toBase58(),
            isUsingJupiter: tx.meta.logMessages.some((log) => log.includes(`Program ${JUPITER_AGREGATOR_PUBLIC_KEY} invoke`)),
         }

         if (parseFloat(insertDexTransactionLogsFull.secondaryTokenAmount) > 10 ** 12) {
            continue
         }

         if (logType === LogType.InitLiquidity) {
            addInitTokenPairInfoToDatabase(insertDexTransactionLogsFull, blockTimestamp)
         }

         insertDexTransactionLogsArray.push(insertDexTransactionLogsFull)
         logTypesCount[LogType[logType]]++
      }
   }

   if (insertDexTransactionLogsArray.length === 0) return

   try {
      await db.insert(dexTransactionsTable).values(insertDexTransactionLogsArray)
      console.log('Inserted dex transactions in database:', insertDexTransactionLogsArray.length, 'At block number:', blockNumber)
   } catch (error) {
      fs.writeFileSync('./example_data/errors/raydium-dex-transaction-error.json', JSON.stringify(insertDexTransactionLogsArray, null, 2))
      console.log('Error inserting dex transactions in database', error)
   }
}

function parseTransaction(ray_log: DataView, type: LogType, tx: ParsedBlockTransaction): Partial<InsertDexTransactionLogs> {
   switch (type) {
      case LogType.InitLiquidity:
         return parseInitTransaction(ray_log, tx)
      case LogType.AddLiquidity:
         return parseAddLiquidityTransaction(ray_log, tx)
      case LogType.RemoveLiquidity:
         return parseRemoveLiquidityTransaction(ray_log, tx)
      case LogType.SwapBaseIn:
         return parseSwapBaseInTransaction(ray_log, tx)
      case LogType.SwapBaseOut:
         return parseSwapBaseOutTransaction(ray_log, tx)
      default:
         throw new Error('Unsupported log type')
   }
}

async function addInitTokenPairInfoToDatabase(insertDexTransactionLogs: InsertDexTransactionLogs, blockTimestamp: number) {
   try {
      const insertTokenPairInfo: InsertTokenPairInfo = {
         creationTransaction: insertDexTransactionLogs.transactionId,
         dexName: 'Raydium',
         initialPrimaryTokenAmountInLP: insertDexTransactionLogs.primaryTokenAmount,
         initialSecondaryTokenAmountInLP: insertDexTransactionLogs.secondaryTokenAmount,
         primaryTokenName: insertDexTransactionLogs.primaryTokenName,
         secondaryTokenAddress: insertDexTransactionLogs.secondaryTokenAddress,
         timestamp: new Date(blockTimestamp * 1000),
         tokenPairCreator: insertDexTransactionLogs.signer,
      }
      await db.insert(tokenPairInfo).values(insertTokenPairInfo)
      console.log('Inserted token pair info in database:', insertTokenPairInfo)
   } catch (error) {
      console.log(error)
      return
   }
}

function parseInitTransaction(ray_log: DataView, tx: ParsedBlockTransaction): Partial<InsertDexTransactionLogs> {
   const initLog = {
      log_type: ray_log.getUint8(0).toString(),
      time: ray_log.getBigUint64(1, true).toString(),
      pc_decimals: ray_log.getUint8(9).toString(),
      coin_decimals: ray_log.getUint8(10).toString(),
      pc_lot_size: ray_log.getBigUint64(11, true).toString(),
      coin_lot_size: ray_log.getBigUint64(19, true).toString(),
      pc_amount: ray_log.getBigUint64(27, true).toString(),
      coin_amount: ray_log.getBigUint64(35, true).toString(),
      market: new PublicKey(ray_log.getBigUint64(43, true)).toBase58(),
   }

   let inCoinTokenName: 'WSOL' | 'USDC' | undefined
   let inCoinTokenAddress = ''
   let inCoinTokenDecimals = 0
   let inCoinTransferAddressIndexInAccountKeys = 0

   let inPcTokenName: 'WSOL' | 'USDC' | undefined
   let inPcTokenAddress = ''
   let inPcTokenDecimals = 0
   let inPcTransferAddressIndexInAccountKeys = 0

   try {
      for (let i = 0; i < tx.meta.innerInstructions.length; i++) {
         const innerInstruction: any = tx.meta.innerInstructions[i]
         for (let j = 0; j < innerInstruction.instructions.length; j++) {
            const instruction: any = innerInstruction.instructions[j]
            if (
               instruction.parsed?.info?.amount == initLog.coin_amount &&
               (innerInstruction.instructions[j + 1]?.parsed?.info?.amount == initLog.pc_amount ||
                  innerInstruction.instructions[j - 1]?.parsed?.info?.amount == initLog.pc_amount)
            ) {
               inCoinTransferAddressIndexInAccountKeys = findAccountIndexInAccountKeys(
                  new PublicKey(instruction.parsed.info.destination),
                  tx.transaction.message.accountKeys
               )
               if (innerInstruction.instructions[j + 1]?.parsed?.info?.amount == initLog.pc_amount) {
                  inPcTransferAddressIndexInAccountKeys = findAccountIndexInAccountKeys(
                     new PublicKey(innerInstruction.instructions[j + 1].parsed.info.destination),
                     tx.transaction.message.accountKeys
                  )
               } else {
                  inPcTransferAddressIndexInAccountKeys = findAccountIndexInAccountKeys(
                     new PublicKey(innerInstruction.instructions[j - 1].parsed.info.destination),
                     tx.transaction.message.accountKeys
                  )
               }
               break
            }
         }
      }

      console.log('In Coin Transfer Address Index In Account Keys:', inCoinTransferAddressIndexInAccountKeys)
      console.log('In PC Transfer Address Index In Account Keys:', inPcTransferAddressIndexInAccountKeys)

      for (let i = 0; i < tx.meta.postTokenBalances.length; i++) {
         const tokenBalance = tx.meta.postTokenBalances[i]
         if (inCoinTransferAddressIndexInAccountKeys === tokenBalance.accountIndex) {
            inCoinTokenAddress = tokenBalance.mint.trim()
            inCoinTokenName = convertTokenAddressToName(inCoinTokenAddress)
            inCoinTokenDecimals = tokenBalance.uiTokenAmount.decimals
         } else if (inPcTransferAddressIndexInAccountKeys === tokenBalance.accountIndex) {
            inPcTokenAddress = tokenBalance.mint.trim()
            inPcTokenName = convertTokenAddressToName(inPcTokenAddress)
            inPcTokenDecimals = tokenBalance.uiTokenAmount.decimals
         }
      }
   } catch (error) {
      console.log('Error in parsing init liquidity in transaction', error)
      fs.writeFileSync('./example_data/errors/raydium-init-liquidity-error.json', JSON.stringify(tx, null, 2))
      fs.writeFileSync('./example_data/errors/raydium-init-liquidity-ray-log-error.json', JSON.stringify(initLog, null, 2))
      console.log(
         'In Token Name: ',
         inCoinTokenName,
         'In Token Address: ',
         inCoinTokenAddress,
         'In Token Decimals: ',
         inCoinTokenDecimals,
         'In Transfer Address Index In Account Keys: ',
         inCoinTransferAddressIndexInAccountKeys
      )
      console.log(
         'Out Token Name: ',
         inPcTokenName,
         'Out Token Address: ',
         inPcTokenAddress,
         'Out Token Decimals: ',
         inPcTokenDecimals,
         'Out Transfer Address Index In Account Keys: ',
         inPcTransferAddressIndexInAccountKeys
      )
   }

   const insertDexTransactionLogs: Partial<InsertDexTransactionLogs> = {
      primaryTokenName: inCoinTokenName === undefined ? inPcTokenName : inCoinTokenName,
      primaryTokenAmount:
         inCoinTokenName === undefined
            ? new BigDecimal(initLog.pc_amount).divide(new BigDecimal(10 ** inPcTokenDecimals)).toString()
            : new BigDecimal(initLog.coin_amount).divide(new BigDecimal(10 ** inCoinTokenDecimals)).toString(),
      secondaryTokenAddress: inCoinTokenName === undefined ? inCoinTokenAddress : inPcTokenAddress,
      secondaryTokenAmount:
         inCoinTokenName === undefined
            ? new BigDecimal(initLog.coin_amount).divide(new BigDecimal(10 ** inCoinTokenDecimals)).toString()
            : new BigDecimal(initLog.pc_amount).divide(new BigDecimal(10 ** inPcTokenDecimals)).toString(),
      transactionType: 'init_lp',
   }

   console.log('Insert Dex Transaction Logs init LP:', insertDexTransactionLogs)

   if (!fs.existsSync('./example_data/raydium_transactions/raydium-init-liquidity-logs.json')) {
      fs.writeFileSync('./example_data/raydium_transactions/raydium-init-liquidity-logs.json', JSON.stringify(tx, null, 2))
      fs.writeFileSync('./example_data/raydium_transactions/raydium-init-liquidity-ray-logs.json', JSON.stringify(initLog, null, 2))
   }

   return insertDexTransactionLogs
}

function parseSwapBaseInTransaction(ray_log: DataView, tx: ParsedBlockTransaction): Partial<InsertDexTransactionLogs> {
   const swapBaseInLog = {
      log_type: ray_log.getUint8(0).toString(),
      amount_in: ray_log.getBigUint64(1, true).toString(),
      minimum_out: ray_log.getBigUint64(9, true).toString(),
      direction: ray_log.getBigUint64(17, true).toString(),
      user_source: ray_log.getBigUint64(25, true).toString(),
      pool_coin: ray_log.getBigUint64(33, true).toString(),
      pool_pc: ray_log.getBigUint64(41, true).toString(),
      amount_out: ray_log.getBigUint64(49, true).toString(),
   }

   let inTokenName: 'WSOL' | 'USDC' | undefined
   let inTokenAddress = ''
   let inTokenDecimals = 0
   let inTransferAddressIndexInAccountKeys = 0

   let outTokenName: 'WSOL' | 'USDC' | undefined
   let outTokenAddress = ''
   let outTokenDecimals = 0
   let outTransferAddressIndexInAccountKeys = 0

   try {
      for (let i = 0; i < tx.meta.innerInstructions.length; i++) {
         const innerInstruction: any = tx.meta.innerInstructions[i]
         for (let j = 0; j < innerInstruction.instructions.length; j++) {
            const instruction: any = innerInstruction.instructions[j]
            if (
               instruction.parsed?.info?.amount == swapBaseInLog.amount_in &&
               innerInstruction.instructions[j + 1]?.parsed?.info?.authority?.toString() === RAYDIUM_AUTHORITY_PUBLIC_KEY
            ) {
               inTransferAddressIndexInAccountKeys = findAccountIndexInAccountKeys(
                  new PublicKey(instruction.parsed.info.destination),
                  tx.transaction.message.accountKeys
               )
               outTransferAddressIndexInAccountKeys = findAccountIndexInAccountKeys(
                  new PublicKey(innerInstruction.instructions[j + 1].parsed.info.source),
                  tx.transaction.message.accountKeys
               )
               break
            }
         }
      }

      for (let i = 0; i < tx.meta.postTokenBalances.length; i++) {
         const tokenBalance = tx.meta.postTokenBalances[i]
         if (inTransferAddressIndexInAccountKeys === tokenBalance.accountIndex) {
            inTokenAddress = tokenBalance.mint.trim()
            inTokenName = convertTokenAddressToName(inTokenAddress)
            inTokenDecimals = tokenBalance.uiTokenAmount.decimals
         } else if (outTransferAddressIndexInAccountKeys === tokenBalance.accountIndex) {
            outTokenAddress = tokenBalance.mint.trim()
            outTokenName = convertTokenAddressToName(outTokenAddress)
            outTokenDecimals = tokenBalance.uiTokenAmount.decimals
         }
      }
   } catch (error) {
      console.log('Error in parsing swap base in transaction', error)
      fs.writeFileSync('./example_data/errors/raydium-swap-base-in-error.json', JSON.stringify(tx, null, 2))
      fs.writeFileSync('./example_data/errors/raydium-swap-base-in-ray-log-error.json', JSON.stringify(swapBaseInLog, null, 2))
      console.log(
         'In Token Name: ',
         inTokenName,
         'In Token Address: ',
         inTokenAddress,
         'In Token Decimals: ',
         inTokenDecimals,
         'In Transfer Address Index In Account Keys: ',
         inTransferAddressIndexInAccountKeys
      )
      console.log(
         'Out Token Name: ',
         outTokenName,
         'Out Token Address: ',
         outTokenAddress,
         'Out Token Decimals: ',
         outTokenDecimals,
         'Out Transfer Address Index In Account Keys: ',
         outTransferAddressIndexInAccountKeys
      )
   }

   // If the inTokenName and outTokenName are both defined or both undefined, return
   if ((inTokenName !== undefined && outTokenName !== undefined) || (inTokenName === undefined && outTokenName === undefined)) return

   const insertDexTransactionLogs: Partial<InsertDexTransactionLogs> = {
      primaryTokenName: inTokenName === undefined ? outTokenName : inTokenName,
      primaryTokenAmount:
         inTokenName === undefined
            ? new BigDecimal(swapBaseInLog.amount_out).divide(new BigDecimal(10 ** outTokenDecimals)).toString()
            : new BigDecimal(swapBaseInLog.amount_in).divide(new BigDecimal(10 ** inTokenDecimals)).toString(),
      secondaryTokenAddress: inTokenName === undefined ? inTokenAddress : outTokenAddress,
      secondaryTokenAmount:
         inTokenName === undefined
            ? new BigDecimal(swapBaseInLog.amount_in).divide(new BigDecimal(10 ** inTokenDecimals)).toString()
            : new BigDecimal(swapBaseInLog.amount_out).divide(new BigDecimal(10 ** outTokenDecimals)).toString(),
      transactionType: inTokenName === undefined ? 'sell' : 'buy',
   }

   return insertDexTransactionLogs
}

function parseSwapBaseOutTransaction(ray_log: DataView, tx: ParsedBlockTransaction): Partial<InsertDexTransactionLogs> {
   const swapBaseOutLog = {
      log_type: ray_log.getUint8(0).toString(),
      max_in: ray_log.getBigUint64(1, true).toString(),
      amount_out: ray_log.getBigUint64(9, true).toString(),
      direction: ray_log.getBigUint64(17, true).toString(),
      user_source: ray_log.getBigUint64(25, true).toString(),
      pool_coin: ray_log.getBigUint64(33, true).toString(),
      pool_pc: ray_log.getBigUint64(41, true).toString(),
      deduct_in: ray_log.getBigUint64(49, true).toString(),
   }

   let inTokenName: 'WSOL' | 'USDC' | undefined
   let inTokenAddress = ''
   let inTokenDecimals = 0
   let inTransferAddressIndexInAccountKeys = 0

   let outTokenName: 'WSOL' | 'USDC' | undefined
   let outTokenAddress = ''
   let outTokenDecimals = 0
   let outTransferAddressIndexInAccountKeys = 0

   try {
      for (let i = 0; i < tx.meta.innerInstructions.length; i++) {
         const innerInstruction: any = tx.meta.innerInstructions[i]
         for (let j = 0; j < innerInstruction.instructions.length; j++) {
            const instruction: any = innerInstruction.instructions[j]
            if (
               instruction.parsed?.info?.amount == swapBaseOutLog.deduct_in &&
               innerInstruction.instructions[j + 1]?.parsed?.info?.authority?.toString() === RAYDIUM_AUTHORITY_PUBLIC_KEY
            ) {
               inTransferAddressIndexInAccountKeys = findAccountIndexInAccountKeys(
                  new PublicKey(instruction.parsed.info.destination),
                  tx.transaction.message.accountKeys
               )
               outTransferAddressIndexInAccountKeys = findAccountIndexInAccountKeys(
                  new PublicKey(innerInstruction.instructions[j + 1].parsed.info.source),
                  tx.transaction.message.accountKeys
               )
               break
            }
         }
      }

      for (let i = 0; i < tx.meta.postTokenBalances.length; i++) {
         const tokenBalance = tx.meta.postTokenBalances[i]
         if (inTransferAddressIndexInAccountKeys === tokenBalance.accountIndex) {
            inTokenAddress = tokenBalance.mint.trim()
            inTokenName = convertTokenAddressToName(inTokenAddress)
            inTokenDecimals = tokenBalance.uiTokenAmount.decimals
         } else if (outTransferAddressIndexInAccountKeys === tokenBalance.accountIndex) {
            outTokenAddress = tokenBalance.mint.trim()
            outTokenName = convertTokenAddressToName(outTokenAddress)
            outTokenDecimals = tokenBalance.uiTokenAmount.decimals
         }
      }
   } catch (error) {
      console.log('Error in parsing swap base in transaction', error)
      fs.writeFileSync('./example_data/errors/raydium-swap-base-out-error.json', JSON.stringify(tx, null, 2))
      fs.writeFileSync('./example_data/errors/raydium-swap-base-out-ray-log-error.json', JSON.stringify(swapBaseOutLog, null, 2))
      console.log(
         'In Token Name: ',
         inTokenName,
         'In Token Address: ',
         inTokenAddress,
         'In Token Decimals: ',
         inTokenDecimals,
         'In Transfer Address Index In Account Keys: ',
         inTransferAddressIndexInAccountKeys
      )
      console.log(
         'Out Token Name: ',
         outTokenName,
         'Out Token Address: ',
         outTokenAddress,
         'Out Token Decimals: ',
         outTokenDecimals,
         'Out Transfer Address Index In Account Keys: ',
         outTransferAddressIndexInAccountKeys
      )
   }

   // If the inTokenName and outTokenName are both defined or both undefined, return
   if ((inTokenName !== undefined && outTokenName !== undefined) || (inTokenName === undefined && outTokenName === undefined)) return

   const insertDexTransactionLogs: Partial<InsertDexTransactionLogs> = {
      primaryTokenName: inTokenName === undefined ? outTokenName : inTokenName,
      primaryTokenAmount:
         inTokenName === undefined
            ? new BigDecimal(swapBaseOutLog.amount_out).divide(new BigDecimal(10 ** outTokenDecimals)).toString()
            : new BigDecimal(swapBaseOutLog.deduct_in).divide(new BigDecimal(10 ** inTokenDecimals)).toString(),
      secondaryTokenAddress: inTokenName === undefined ? inTokenAddress : outTokenAddress,
      secondaryTokenAmount:
         inTokenName === undefined
            ? new BigDecimal(swapBaseOutLog.deduct_in).divide(new BigDecimal(10 ** inTokenDecimals)).toString()
            : new BigDecimal(swapBaseOutLog.amount_out).divide(new BigDecimal(10 ** outTokenDecimals)).toString(),
      transactionType: inTokenName === undefined ? 'sell' : 'buy',
   }

   return insertDexTransactionLogs
}

function parseRemoveLiquidityTransaction(ray_log: DataView, tx: ParsedBlockTransaction): Partial<InsertDexTransactionLogs> {
   const removeLiquidityLog = {
      log_type: ray_log.getUint8(0).toString(),
      withdraw_lp: ray_log.getBigUint64(1, true).toString(),
      user_lp: ray_log.getBigUint64(9, true).toString(),
      pool_coin: ray_log.getBigUint64(17, true).toString(),
      pool_pc: ray_log.getBigUint64(25, true).toString(),
      pool_lp: ray_log.getBigUint64(33, true).toString(),
      calc_pnl_x: ray_log.getBigUint64(41, true).toString(),
      calc_pnl_y: ray_log.getBigUint64(57, true).toString(),
      out_coin: ray_log.getBigUint64(73, true).toString(),
      out_pc: ray_log.getBigUint64(81, true).toString(),
   }
   let outCoinTokenName: 'WSOL' | 'USDC' | undefined
   let outCoinTokenAddress = ''
   let outCoinTokenDecimals = 0
   let outCoinTransferAddressIndexInAccountKeys = 0

   let outPcTokenName: 'WSOL' | 'USDC' | undefined
   let outPcTokenAddress = ''
   let outPcTokenDecimals = 0
   let outPcTransferAddressIndexInAccountKeys = 0

   try {
      for (let i = 0; i < tx.meta.innerInstructions.length; i++) {
         const innerInstruction: any = tx.meta.innerInstructions[i]
         for (let j = 0; j < innerInstruction.instructions.length; j++) {
            const instruction: any = innerInstruction.instructions[j]
            if (
               instruction.parsed?.info?.amount == removeLiquidityLog.out_coin &&
               (innerInstruction.instructions[j + 1]?.parsed?.info?.amount == removeLiquidityLog.out_pc ||
                  innerInstruction.instructions[j - 1]?.parsed?.info?.amount == removeLiquidityLog.out_pc)
            ) {
               outCoinTransferAddressIndexInAccountKeys = findAccountIndexInAccountKeys(
                  new PublicKey(instruction.parsed.info.source),
                  tx.transaction.message.accountKeys
               )
               if (innerInstruction.instructions[j + 1]?.parsed?.info?.amount == removeLiquidityLog.out_pc) {
                  outPcTransferAddressIndexInAccountKeys = findAccountIndexInAccountKeys(
                     new PublicKey(innerInstruction.instructions[j + 1].parsed.info.source),
                     tx.transaction.message.accountKeys
                  )
               } else {
                  outCoinTransferAddressIndexInAccountKeys = findAccountIndexInAccountKeys(
                     new PublicKey(innerInstruction.instructions[j - 1].parsed.info.source),
                     tx.transaction.message.accountKeys
                  )
               }
               break
            }
         }
      }

      for (let i = 0; i < tx.meta.postTokenBalances.length; i++) {
         const tokenBalance = tx.meta.postTokenBalances[i]
         if (outCoinTransferAddressIndexInAccountKeys === tokenBalance.accountIndex) {
            outCoinTokenAddress = tokenBalance.mint.trim()
            outCoinTokenName = convertTokenAddressToName(outCoinTokenAddress)
            outCoinTokenDecimals = tokenBalance.uiTokenAmount.decimals
         } else if (outPcTransferAddressIndexInAccountKeys === tokenBalance.accountIndex) {
            outPcTokenAddress = tokenBalance.mint.trim()
            outPcTokenName = convertTokenAddressToName(outPcTokenAddress)
            outPcTokenDecimals = tokenBalance.uiTokenAmount.decimals
         }
      }
   } catch (error) {
      console.log('Error in parsing remove liquidity in transaction', error)
      fs.writeFileSync('./example_data/errors/raydium-remove-liquidity-error.json', JSON.stringify(tx, null, 2))
      fs.writeFileSync('./example_data/errors/raydium-remove-liquidity-ray-log-error.json', JSON.stringify(removeLiquidityLog, null, 2))
      console.log(
         'In Token Name: ',
         outCoinTokenName,
         'In Token Address: ',
         outCoinTokenAddress,
         'In Token Decimals: ',
         outCoinTokenDecimals,
         'In Transfer Address Index In Account Keys: ',
         outCoinTransferAddressIndexInAccountKeys
      )
      console.log(
         'Out Token Name: ',
         outPcTokenName,
         'Out Token Address: ',
         outPcTokenAddress,
         'Out Token Decimals: ',
         outPcTokenDecimals,
         'Out Transfer Address Index In Account Keys: ',
         outPcTransferAddressIndexInAccountKeys
      )
   }

   // If the inTokenName and outTokenName are both defined or both undefined, return
   //    if ((outCoinTokenName !== undefined && outPcTokenName !== undefined) || (outCoinTokenName === undefined && outPcTokenName === undefined)) return

   const insertDexTransactionLogs: Partial<InsertDexTransactionLogs> = {
      primaryTokenName: outCoinTokenName === undefined ? outPcTokenName : outCoinTokenName,
      primaryTokenAmount:
         outCoinTokenName === undefined
            ? new BigDecimal(removeLiquidityLog.out_pc).divide(new BigDecimal(10 ** outPcTokenDecimals)).toString()
            : new BigDecimal(removeLiquidityLog.out_coin).divide(new BigDecimal(10 ** outCoinTokenDecimals)).toString(),
      secondaryTokenAddress: outCoinTokenName === undefined ? outCoinTokenAddress : outPcTokenAddress,
      secondaryTokenAmount:
         outCoinTokenName === undefined
            ? new BigDecimal(removeLiquidityLog.out_coin).divide(new BigDecimal(10 ** outCoinTokenDecimals)).toString()
            : new BigDecimal(removeLiquidityLog.out_pc).divide(new BigDecimal(10 ** outPcTokenDecimals)).toString(),
      transactionType: 'remove_liquidity',
   }
   return insertDexTransactionLogs
}

function parseAddLiquidityTransaction(ray_log: DataView, tx: ParsedBlockTransaction): Partial<InsertDexTransactionLogs> {
   const addLiquidityLog = {
      log_type: ray_log.getUint8(0).toString(),
      max_coin: ray_log.getBigUint64(1, true).toString(),
      max_pc: ray_log.getBigUint64(9, true).toString(),
      base: ray_log.getBigUint64(17, true).toString(),
      pool_coin: ray_log.getBigUint64(25, true).toString(),
      pool_pc: ray_log.getBigUint64(33, true).toString(),
      pool_lp: ray_log.getBigUint64(41, true).toString(),
      calc_pnl_x: ray_log.getBigUint64(49, true).toString(),
      calc_pnl_y: ray_log.getBigUint64(65, true).toString(),
      deduct_coin: ray_log.getBigUint64(81, true).toString(),
      deduct_pc: ray_log.getBigUint64(89, true).toString(),
      mint_lp: ray_log.getBigUint64(97, true).toString(),
   }
   let inCoinTokenName: 'WSOL' | 'USDC' | undefined
   let inCoinTokenAddress = ''
   let inCoinTokenDecimals = 0
   let inCoinTransferAddressIndexInAccountKeys = 0

   let inPcTokenName: 'WSOL' | 'USDC' | undefined
   let inPcTokenAddress = ''
   let inPcTokenDecimals = 0
   let inPcTransferAddressIndexInAccountKeys = 0

   try {
      for (let i = 0; i < tx.meta.innerInstructions.length; i++) {
         const innerInstruction: any = tx.meta.innerInstructions[i]
         for (let j = 0; j < innerInstruction.instructions.length; j++) {
            const instruction: any = innerInstruction.instructions[j]
            if (
               instruction.parsed?.info?.amount == addLiquidityLog.deduct_coin &&
               (innerInstruction.instructions[j + 1]?.parsed?.info?.amount == addLiquidityLog.deduct_pc ||
                  innerInstruction.instructions[j - 1]?.parsed?.info?.amount == addLiquidityLog.deduct_pc)
            ) {
               inCoinTransferAddressIndexInAccountKeys = findAccountIndexInAccountKeys(
                  new PublicKey(instruction.parsed.info.destination),
                  tx.transaction.message.accountKeys
               )
               if (innerInstruction.instructions[j + 1]?.parsed?.info?.amount == addLiquidityLog.deduct_pc) {
                  inPcTransferAddressIndexInAccountKeys = findAccountIndexInAccountKeys(
                     new PublicKey(innerInstruction.instructions[j + 1].parsed.info.destination),
                     tx.transaction.message.accountKeys
                  )
               } else {
                  inPcTransferAddressIndexInAccountKeys = findAccountIndexInAccountKeys(
                     new PublicKey(innerInstruction.instructions[j - 1].parsed.info.destination),
                     tx.transaction.message.accountKeys
                  )
               }
               break
            }
         }
      }

      for (let i = 0; i < tx.meta.postTokenBalances.length; i++) {
         const tokenBalance = tx.meta.postTokenBalances[i]
         if (inCoinTransferAddressIndexInAccountKeys === tokenBalance.accountIndex) {
            inCoinTokenAddress = tokenBalance.mint.trim()
            inCoinTokenName = convertTokenAddressToName(inCoinTokenAddress)
            inCoinTokenDecimals = tokenBalance.uiTokenAmount.decimals
         } else if (inPcTransferAddressIndexInAccountKeys === tokenBalance.accountIndex) {
            inPcTokenAddress = tokenBalance.mint.trim()
            inPcTokenName = convertTokenAddressToName(inPcTokenAddress)
            inPcTokenDecimals = tokenBalance.uiTokenAmount.decimals
         }
      }
   } catch (error) {
      console.log('Error in parsing add liquidity in transaction', error)
      fs.writeFileSync('./example_data/errors/raydium-add-liquidity-error.json', JSON.stringify(tx, null, 2))
      fs.writeFileSync('./example_data/errors/raydium-add-liquidity-ray-log-error.json', JSON.stringify(addLiquidityLog, null, 2))
      console.log(
         'In Token Name: ',
         inCoinTokenName,
         'In Token Address: ',
         inCoinTokenAddress,
         'In Token Decimals: ',
         inCoinTokenDecimals,
         'In Transfer Address Index In Account Keys: ',
         inCoinTransferAddressIndexInAccountKeys
      )
      console.log(
         'Out Token Name: ',
         inPcTokenName,
         'Out Token Address: ',
         inPcTokenAddress,
         'Out Token Decimals: ',
         inPcTokenDecimals,
         'Out Transfer Address Index In Account Keys: ',
         inPcTransferAddressIndexInAccountKeys
      )
   }

   const insertDexTransactionLogs: Partial<InsertDexTransactionLogs> = {
      primaryTokenName: inCoinTokenName === undefined ? inPcTokenName : inCoinTokenName,
      primaryTokenAmount:
         inCoinTokenName === undefined
            ? new BigDecimal(addLiquidityLog.deduct_pc).divide(new BigDecimal(10 ** inPcTokenDecimals)).toString()
            : new BigDecimal(addLiquidityLog.deduct_coin).divide(new BigDecimal(10 ** inCoinTokenDecimals)).toString(),
      secondaryTokenAddress: inCoinTokenName === undefined ? inCoinTokenAddress : inPcTokenAddress,
      secondaryTokenAmount:
         inCoinTokenName === undefined
            ? new BigDecimal(addLiquidityLog.deduct_coin).divide(new BigDecimal(10 ** inCoinTokenDecimals)).toString()
            : new BigDecimal(addLiquidityLog.deduct_pc).divide(new BigDecimal(10 ** inPcTokenDecimals)).toString(),
      transactionType: 'add_liquidity',
   }
   return insertDexTransactionLogs
}

function findAccountIndexInAccountKeys(account: PublicKey, accountKeys: ParsedMessageAccount[]): number {
   for (let i = 0; i < accountKeys.length; i++) {
      if (accountKeys[i].pubkey.toBase58() === account.toBase58()) {
         return i
      }
   }
   return -1
}

function writeAllLogsToFile(logType: LogType, tx: ParsedBlockTransaction, parsedLogs: LogParseResult[]) {
   if (logType === LogType.InitLiquidity) {
      if (!fs.existsSync('./example_data/raydium_transactions/raydium-init-logs.json')) {
         fs.writeFileSync('./example_data/raydium_transactions/raydium-init-logs.json', JSON.stringify(tx, null, 2))
         fs.writeFileSync('./example_data/raydium_transactions/raydium-init-ray-logs.json', JSON.stringify(parsedLogs, null, 2))
      }
   } else if (logType === LogType.AddLiquidity) {
      if (!fs.existsSync('./example_data/raydium_transactions/raydium-add-liquidity-logs.json')) {
         fs.writeFileSync('./example_data/raydium_transactions/raydium-add-liquidity-logs.json', JSON.stringify(tx, null, 2))
         fs.writeFileSync('./example_data/raydium_transactions/raydium-add-liquidity-ray-logs.json', JSON.stringify(parsedLogs, null, 2))
      }
   } else if (logType === LogType.RemoveLiquidity) {
      if (!fs.existsSync('./example_data/raydium_transactions/raydium-remove-liquidity-logs.json')) {
         fs.writeFileSync('./example_data/raydium_transactions/raydium-remove-liquidity-logs.json', JSON.stringify(tx, null, 2))
         fs.writeFileSync('./example_data/raydium_transactions/raydium-remove-liquidity-ray-logs.json', JSON.stringify(parsedLogs, null, 2))
      }
   } else if (logType === LogType.SwapBaseIn) {
      if (!fs.existsSync('./example_data/raydium_transactions/raydium-swap-base-in-logs.json')) {
         fs.writeFileSync('./example_data/raydium_transactions/raydium-swap-base-in-logs.json', JSON.stringify(tx, null, 2))
         fs.writeFileSync('./example_data/raydium_transactions/raydium-swap-base-in-ray-logs.json', JSON.stringify(parsedLogs, null, 2))
      }
   } else if (logType === LogType.SwapBaseOut) {
      if (!fs.existsSync('./example_data/raydium_transactions/raydium-swap-base-out-logs.json')) {
         fs.writeFileSync('./example_data/raydium_transactions/raydium-swap-base-out-logs.json', JSON.stringify(tx, null, 2))
         fs.writeFileSync('./example_data/raydium_transactions/raydium-swap-base-out-ray-logs.json', JSON.stringify(parsedLogs, null, 2))
      }
   }
}
