import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { DrizzleModule } from './drizzle/drizzle.module'
import { UserModule } from './user/user.module'
import { SolanaModule } from './blockchain/solana/solana.module'
import { AuthModule } from './auth/auth.module'
import { PassportModule } from '@nestjs/passport'

@Module({
   imports: [
      PassportModule.register({
         session: true,
      }),
      DrizzleModule,
      UserModule,
      SolanaModule,
      AuthModule,
   ],
   controllers: [AppController],
   providers: [AppService],
})
export class AppModule {}
