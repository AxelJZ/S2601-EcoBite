// NOTE: Flattens nested class-validator errors into API validation issues.
import { ValidationError } from 'class-validator';
import type { ValidationIssue } from './validation.types';
function flattenValidationErrorsRecursive(
  errors: ValidationError[],
  parentPath: string,
): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  for (const err of errors) {
    const prop = parentPath ? `${parentPath}.${err.property}` : err.property;
    if (err.constraints) {
      out.push({
        property: prop,
        messages: Object.values(err.constraints),
      });
    }
    if (err.children?.length) {
      out.push(...flattenValidationErrorsRecursive(err.children, prop));
    }
  }
  return out;
}

export function flattenValidationErrors(
  errors: ValidationError[],
): ValidationIssue[] {
  return flattenValidationErrorsRecursive(errors, '');
}
