// NOTE: Parses integer parameters using the shared validation error format.
import { ParseIntPipe } from '@nestjs/common';
import { validationBadRequest } from '../validation/validation-bad-request';

export class ValidationParseIntPipe extends ParseIntPipe {
  constructor(private readonly property: string) {
    super({
      exceptionFactory: (msg: string) =>
        validationBadRequest([{ property, messages: [msg] }]),
    });
  }
}
