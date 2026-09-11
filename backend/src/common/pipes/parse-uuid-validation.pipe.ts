// NOTE: Parses UUID parameters using the shared validation error format.
import { ParseUUIDPipe, type ParseUUIDPipeOptions } from '@nestjs/common';
import { validationBadRequest } from '../validation/validation-bad-request';

export class ValidationParseUUIDPipe extends ParseUUIDPipe {
  constructor(
    private readonly property: string,
    options?: Omit<ParseUUIDPipeOptions, 'exceptionFactory'>,
  ) {
    super({
      version: '4',
      ...options,
      exceptionFactory: (msg: string) =>
        validationBadRequest([{ property, messages: [msg] }]),
    });
  }
}
