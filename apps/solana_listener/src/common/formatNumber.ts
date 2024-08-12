import BigDecimal from './BigDecimal'

export function formatNumber(num: number | bigint | BigDecimal, decimals = 2, dotsForThousands = true) {
   const [whole, fraction] = num.toString().split('.')
   const wholeWithCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, dotsForThousands ? '.' : ',')
   if (fraction) {
      return `${wholeWithCommas},${fraction.slice(0, decimals)}`
   }
   return wholeWithCommas
}
