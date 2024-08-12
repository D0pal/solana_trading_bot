import { Injectable } from '@nestjs/common'
import * as crypto from 'crypto'

@Injectable()
export class EncryptionService {
   private masterKey: Buffer // This should be securely loaded

   constructor() {
      const masterKeyHex = process.env.MASTER_KEY
      this.masterKey = Buffer.from(masterKeyHex, 'hex')
   }

   deriveKey(userSpecificData: string) {
      const salt = crypto.createHash('sha256').update(userSpecificData).digest()
      return crypto.pbkdf2Sync(this.masterKey, salt, 10000, 32, 'sha256')
   }

   encrypt(text: string, userSpecificData: string): string {
      const key = this.deriveKey(userSpecificData)
      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
      let encrypted = cipher.update(text, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      return iv.toString('hex') + ':' + encrypted
   }

   decrypt(encryptedText: string, userSpecificData: string): string {
      const textParts = encryptedText.split(':')
      const iv = Buffer.from(textParts[0], 'hex')
      const encrypted = textParts[1]
      const key = this.deriveKey(userSpecificData)
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
   }
}
