import { Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { PassportModule } from '@nestjs/passport'
import { JwtModule } from '@nestjs/jwt'
import { JwtStrategy } from './strategies/jwt.tstrategy'
import { TelegramStrategy } from './strategies/telegram.strategy'
import { UserModule } from 'src/user/user.module'
import { SessionSerializer } from './strategies/SessionSerializer'

@Module({
   imports: [
      PassportModule,
      JwtModule.register({
         secret: process.env.JWT_SECRET,
         signOptions: { expiresIn: '1d' },
      }),
      UserModule,
   ],
   providers: [AuthService, JwtStrategy, TelegramStrategy, SessionSerializer],
   controllers: [AuthController],
})
export class AuthModule {}
