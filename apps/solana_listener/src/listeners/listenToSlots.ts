import blockchainServiceInstance from 'src/services/blockchainService'
import * as fs from 'fs'
import { sleep } from 'src/common/sleep'
import { RAYDIUM_PUBLIC_KEY } from 'src/config/consts'
import { ParsedBlockTransaction } from 'src/interfaces/ParsedBlockTransaction.interface'
import { parseRaydiumTransactions } from 'src/parsers/raydiumParser'

let currentSlot = 0
const POLL_INTERVAL = 400

export async function listenToSlots() {
   console.log('Polling for latest slots...')
   currentSlot = await blockchainServiceInstance.getSlot()
   while (true) {
      try {
         const blockInfo = await blockchainServiceInstance.getBlock(currentSlot)

         const raydiumTransactions = blockInfo.transactions.filter((tx) =>
            findLogsWithString(tx as ParsedBlockTransaction, [`Program ${RAYDIUM_PUBLIC_KEY} invoke`, 'Program log: ray_log:'])
         )

         fs.writeFileSync('raydiumTransactions.json', JSON.stringify(raydiumTransactions))

         if (raydiumTransactions.length > 0)
            parseRaydiumTransactions(raydiumTransactions as ParsedBlockTransaction[], currentSlot, blockInfo.blockTime)

         currentSlot++

         // const allTransactionsWithoutVote = blockInfo.transactions.filter(
         //    (tx) => !findLogsWithString(tx as ParsedBlockTransaction, ['Program Vote111111111111111111111111111111111111111 invoke'])
         // )
         // console.log(
         //    'all transactions',
         //    allTransactionsWithoutVote.length,
         //    'raydium transactions',
         //    raydiumTransactions.length,
         //    'raydium transactions percentage',
         //    (raydiumTransactions.length / allTransactionsWithoutVote.length) * 100
         // )
      } catch (e) {
         if (e.code == -32007) {
            console.log('Slot skipped', currentSlot)
            currentSlot++
         } else if (e.code == -32004) {
            console.log('Block not available yet')
            await sleep(3000)
         } else {
            console.log(e)
            fs.writeFileSync('error.json', JSON.stringify(e))
         }
      }
      await sleep(POLL_INTERVAL)
   }
}

function findLogsWithString(transaction: ParsedBlockTransaction, stringsToFind: string[]) {
   const shouldTxBeIncluded = transaction.meta.logMessages.filter((log) => {
      return stringsToFind.some((str) => log.includes(str))
   })
   return shouldTxBeIncluded && shouldTxBeIncluded.length > 0
}
