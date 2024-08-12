import { Controller, UseGuards, Request, Post } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthGuard } from '@nestjs/passport'
import { JwtService } from '@nestjs/jwt'
import { UserService } from 'src/user/user.service'
import { TelegramGuard } from './utils/telegram.guard'

@Controller('auth')
export class AuthController {
   constructor(
      private authService: AuthService,
      private jwtService: JwtService,
      private userService: UserService,
   ) {}

   @UseGuards(TelegramGuard)
   @Post('loginWithTelegram')
   async loginWithTelegram(@Request() req) {
      return req.user
   }

   @UseGuards(AuthGuard('local'))
   @Post('login')
   async login(@Request() req) {
      const user = req.user
      const payload = { username: user.username, sub: user.userId }
      return {
         access_token: this.jwtService.sign(payload),
      }
   }

   // @Post('store-key')
   // async storePrivateKey(@Body() body: any, @Request() req) {
   //    const userId = req.user.id
   //    const encryptedPrivateKey = await this.authService.encryptPrivateKey(body.privateKey)
   //    await this.userService.storeEncryptedPrivateKey(userId, encryptedPrivateKey)
   //    return { message: 'Private key stored successfully' }
   // }

   // @Get('retrieve-key')
   // async retrievePrivateKey(@Request() req) {
   //    const userId = req.user.id
   //    const encryptedPrivateKey = await this.userService.getEncryptedPrivateKey(userId)
   //    if (!encryptedPrivateKey) {
   //       return { message: 'Private key not found' }
   //    }
   //    const privateKey = await this.authService.decryptPrivateKey(encryptedPrivateKey)
   //    return { privateKey }
   // }
}
