import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { DrizzleModule } from './drizzle/drizzle.module'
import { UserModule } from './user/user.module'
import { SolanaModule } from './blockchain/solana/solana.module'
import { AuthModule } from './auth/auth.module'
import { PassportModule } from '@nestjs/passport'
import { SolanaSniperModule } from './blockchain/solana/sniper/solanaSniper.module'
import { EncryptionModule } from './encryption/encryption.module'
import { APP_FILTER } from '@nestjs/core'
import { AllExceptionsFilter } from './common/filters/AllExceptionsFilter.filter'

@Module({
   imports: [
      PassportModule.register({
         session: true,
      }),
      DrizzleModule,
      UserModule,
      SolanaModule,
      AuthModule,
      SolanaSniperModule,
      EncryptionModule,
   ],
   controllers: [AppController],
   providers: [
      AppService,
      {
         provide: APP_FILTER,
         useClass: AllExceptionsFilter,
      },
   ],
})
export class AppModule {}
