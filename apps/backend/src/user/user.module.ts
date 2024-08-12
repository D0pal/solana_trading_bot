import { forwardRef, Module } from '@nestjs/common'
import { UserService } from './user.service'
import { UserController } from './user.controller'
import { drizzleProvider } from 'src/drizzle/drizzle.provider'
import { EncryptionModule } from 'src/encryption/encryption.module'
import { SolanaModule } from 'src/blockchain/solana/solana.module'
import { SolanaSniperModule } from 'src/blockchain/solana/sniper/solanaSniper.module'

@Module({
   imports: [EncryptionModule, SolanaModule, forwardRef(() => SolanaSniperModule)],
   controllers: [UserController],
   providers: [UserService, ...drizzleProvider],
   exports: [UserService],
})
export class UserModule {}
