import { USDC_PUBLIC_KEY, WSOL_PUBLIC_KEY } from 'src/config/consts'
/**
 *
 * @param address
 * @returns The token name if the address is WSOL_PUBLIC_KEY or USDC_PUBLIC_KEY, otherwise the address itself
 */
export function convertTokenAddressToName(address: string): 'WSOL' | 'USDC' | undefined {
   switch (address) {
      case WSOL_PUBLIC_KEY:
         return 'WSOL'
      case USDC_PUBLIC_KEY:
         return 'USDC'
      default:
         return undefined
   }
}
