import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import 'dotenv/config'
import * as session from 'express-session'
import * as passport from 'passport'

async function bootstrap() {
   const app = await NestFactory.create(AppModule)
   app.use(
      session({
         secret: 'my-secret',
         resave: false,
         saveUninitialized: false,
         cookie: {
            httpOnly: true,
            maxAge: 3600000,
            secure: false, // Set to true if you are using HTTPS
            sameSite: 'lax',
         },
      }),
   )
   app.use(passport.initialize())
   app.use(passport.session())

   app.enableCors({
      origin: 'http://example.com', // Adjust the origin according to where your front-end is hosted
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      allowedHeaders: 'Content-Type, Accept',
      credentials: true,
   })
   await app.listen(3000)
}
bootstrap()
