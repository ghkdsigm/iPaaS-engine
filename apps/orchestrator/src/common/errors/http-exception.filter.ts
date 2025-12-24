import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import { DomainError } from "./domain.error";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    const now = new Date().toISOString();

    if (exception instanceof DomainError) {
      return res.status(exception.status).json({
        ok: false,
        code: exception.code,
        message: exception.message,
        path: req.url,
        time: now
      });
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return res.status(status).json({
        ok: false,
        code: "HTTP_EXCEPTION",
        message: exception.message,
        path: req.url,
        time: now
      });
    }

    return res.status(500).json({
      ok: false,
      code: "INTERNAL_ERROR",
      message: exception?.message || "Internal error",
      path: req.url,
      time: now
    });
  }
}
