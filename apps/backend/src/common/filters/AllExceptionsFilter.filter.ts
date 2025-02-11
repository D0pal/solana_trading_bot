import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'
import { HttpAdapterHost } from '@nestjs/core'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
   constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

   catch(exception: unknown, host: ArgumentsHost): void {
      const { httpAdapter } = this.httpAdapterHost
      const ctx = host.switchToHttp()

      const httpStatus = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

      let message = 'Internal server error'
      if (exception instanceof HttpException) {
         message = exception.message
      } else if (exception instanceof Error) {
         message = exception.message
      }

      const responseBody = {
         success: false,
         statusCode: httpStatus,
         message: message,
         timestamp: new Date().toISOString(),
         path: httpAdapter.getRequestUrl(ctx.getRequest()),
      }

      httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus)
   }
}
