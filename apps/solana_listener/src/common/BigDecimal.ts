class BigDecimal {
   static decimals = 18
   private bigint: bigint

   constructor(value: number | bigint | string) {
      let [ints, decis] = String(value).split('.').concat('')
      decis = decis.padEnd(BigDecimal.decimals, '0').slice(0, BigDecimal.decimals)
      this.bigint = BigInt(ints + decis)
   }

   static fromBigInt(bigint: bigint): BigDecimal {
      return Object.assign(Object.create(BigDecimal.prototype), { bigint })
   }

   divide(divisor: bigint | BigDecimal): BigDecimal {
      if (divisor instanceof BigDecimal) {
         return BigDecimal.fromBigInt((this.bigint * BigInt(10 ** BigDecimal.decimals)) / divisor.bigint)
      }
      return BigDecimal.fromBigInt(this.bigint / divisor)
   }

   multiply(multiplier: bigint | BigDecimal): BigDecimal {
      if (multiplier instanceof BigDecimal) {
         return BigDecimal.fromBigInt((this.bigint * multiplier.bigint) / BigInt(10 ** BigDecimal.decimals))
      }
      return BigDecimal.fromBigInt(this.bigint * multiplier)
   }

   add(addend: bigint | BigDecimal): BigDecimal {
      if (addend instanceof BigDecimal) {
         return BigDecimal.fromBigInt(this.bigint + addend.bigint)
      }
      return BigDecimal.fromBigInt(this.bigint + addend)
   }

   sub(subtrahend: bigint | BigDecimal): BigDecimal {
      if (subtrahend instanceof BigDecimal) {
         return BigDecimal.fromBigInt(this.bigint - subtrahend.bigint)
      }
      return BigDecimal.fromBigInt(this.bigint - subtrahend)
   }

   pow(exponent: bigint | number): BigDecimal {
      return BigDecimal.fromBigInt(this.bigint ** BigInt(exponent))
   }

   toString() {
      let s = this.bigint.toString().padStart(BigDecimal.decimals + 1, '0')
      if (this.bigint < 0) {
         s = '-' + s.slice(1)
      }
      let intPart = s.slice(0, -BigDecimal.decimals) || '0'
      let decPart = s.slice(-BigDecimal.decimals).replace(/0+$/, '') || '0'
      return decPart === '0' ? intPart : `${intPart}.${decPart}`
   }
}

export default BigDecimal
