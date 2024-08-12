/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common'
import { PassportSerializer } from '@nestjs/passport'
import { SelectUser } from 'src/drizzle/schema'
import { UserService } from 'src/user/user.service'

@Injectable()
export class SessionSerializer extends PassportSerializer {
   constructor(private userService: UserService) {
      super()
   }
   serializeUser(user: SelectUser, done: (err, user: SelectUser) => void) {
      console.log('serializeUser', user)
      done(null, user)
   }

   async deserializeUser(user: SelectUser, done: (err, user: SelectUser) => void) {
      const userDB = await this.userService.findById(user.id)
      // console.log('deserializeUser', userDB)
      return userDB ? done(null, userDB) : done(null, null)
   }
}
