import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-custom'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import * as crypto from 'crypto'
import { AuthService } from '../auth.service'
import { TelegramAuthData } from 'shared-types/src/TelegramAuthData.interface'
import { SelectUser } from 'src/drizzle/schema'
import { Request } from 'express'

@Injectable()
export class TelegramStrategy extends PassportStrategy(Strategy, 'telegram') {
   constructor(private authService: AuthService) {
      super()
   }

   async validate(request: Request): Promise<SelectUser> {
      const telegramAuthData: TelegramAuthData = request.body
      const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

      if (!TELEGRAM_BOT_TOKEN) {
         throw new UnauthorizedException('Bot token is not set.')
      }

      const { hash, ...authDataWithoutHash } = telegramAuthData
      const dataCheckArray: string[] = []

      for (const [key, value] of Object.entries(authDataWithoutHash)) {
         dataCheckArray.push(`${key}=${value}`)
      }
      dataCheckArray.sort()

      const dataCheckString = dataCheckArray.join('\n')
      const secretKey = crypto.createHash('sha256').update(TELEGRAM_BOT_TOKEN).digest()

      const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

      if (computedHash !== hash) {
         throw new UnauthorizedException('Data is NOT from Telegram')
      }

      if (Date.now() / 1000 - authDataWithoutHash.auth_date > 86400) {
         throw new UnauthorizedException('Data is outdated')
      }

      return await this.authService.validateTelegramUser(telegramAuthData)
   }
}
