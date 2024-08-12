import { Module } from '@nestjs/common'
import { EncryptionService } from './encryption.service'

@Module({
   providers: [EncryptionService],
   exports: [EncryptionService], // Export so it can be imported by other modules
})
export class EncryptionModule {}
