// NOTE: Configures request DTO validation and transformation.
import { ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { flattenValidationErrors } from '../validation/flatten-validation-errors';
import { validationBadRequest } from '../validation/validation-bad-request';

export class CustomValidationPipe extends ValidationPipe {
  constructor() {
    super({
      // NOTE: Only allows properties defined in DTOs; extra properties are stripped.
      whitelist: true,
      // NOTE: Throws when the received object contains properties outside the whitelist.
      forbidNonWhitelisted: true,
      // NOTE: Transforms the received payload into the data type specified by the DTO.
      transform: true,
      exceptionFactory: (errors: ValidationError[]) =>
        validationBadRequest(flattenValidationErrors(errors)),
    });
  }
}
