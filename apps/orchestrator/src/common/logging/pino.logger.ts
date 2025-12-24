import { Injectable } from "@nestjs/common";

@Injectable()
export class PinoLogger {
  info(obj: any, msg?: string) {
    // eslint-disable-next-line no-console
    console.log(msg || "", obj);
  }
  error(obj: any, msg?: string) {
    // eslint-disable-next-line no-console
    console.error(msg || "", obj);
  }
}
