import { Injectable } from '@nestjs/common'
import { UserService } from 'src/user/user.service'
import * as crypto from 'crypto'
import { TelegramAuthData } from 'shared-types/src/TelegramAuthData.interface'
import { InsertUser, SelectUser } from 'src/drizzle/schema'

@Injectable()
export class AuthService {
   constructor(private userService: UserService) {}

   async validateTelegramUser(telegramAuthData: TelegramAuthData): Promise<SelectUser> {
      let user = await this.userService.findByTelegramId(telegramAuthData.id)
      if (!user) {
         // Create a new user if it doesn't exist
         const insertUserData: InsertUser = {}
         user = await this.userService.create(insertUserData, {
            provider: 'telegram',
            providerId: telegramAuthData.id.toString(),
         })
      }
      return user
   }

   async encryptPrivateKey(privateKey: string): Promise<string> {
      const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY)
      let encrypted = cipher.update(privateKey, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      return encrypted
   }

   async decryptPrivateKey(encryptedPrivateKey: string): Promise<string> {
      const decipher = crypto.createDecipher('aes-256-cbc', process.env.ENCRYPTION_KEY)
      let decrypted = decipher.update(encryptedPrivateKey, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
   }
}
