// NOTE: Builds OpenAPI schemas for enveloped successful responses.
import { getSchemaPath } from '@nestjs/swagger';
import type { Type } from '@nestjs/common';

export function wrappedSuccessSchema(
  dataModel: Type<unknown>,
  options: {
    isArray?: boolean;
    statusCode?: number;
    statusText?: string;
    pathExample?: string;
  } = {},
): Record<string, unknown> {
  const {
    isArray = false,
    statusCode = 200,
    statusText = 'OK',
    pathExample = '/users',
  } = options;

  const dataSchema = isArray
    ? {
        type: 'array',
        items: { $ref: getSchemaPath(dataModel) },
      }
    : { $ref: getSchemaPath(dataModel) };

  return {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      statusCode: { type: 'number', example: statusCode },
      statusText: { type: 'string', example: statusText },
      timestamp: { type: 'string', format: 'date-time' },
      path: { type: 'string', example: pathExample },
      data: dataSchema,
    },
  };
}
