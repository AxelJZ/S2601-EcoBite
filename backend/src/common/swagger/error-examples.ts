// NOTE: Defines reusable OpenAPI examples for error responses.
export const validationErrorExample = {
  success: false,
  statusCode: 400,
  statusText: 'Bad Request',
  timestamp: '2026-04-29T18:00:00.000Z',
  path: '/users',
  message: 'Validation error',
  code: 'VALIDATION_ERROR',
  errors: [
    {
      property: 'email',
      messages: ['email must be an email'],
    },
  ],
};

export const invalidJsonExample = {
  success: false,
  statusCode: 400,
  statusText: 'Bad Request',
  timestamp: '2026-04-29T18:00:00.000Z',
  path: '/users',
  message: 'The request body is not valid JSON',
  code: 'INVALID_JSON',
  errors: [
    {
      property: 'body',
      messages: ['The request body is not valid JSON'],
    },
  ],
};

export const orderNotFoundExample = {
  success: false,
  statusCode: 404,
  statusText: 'Not Found',
  timestamp: '2026-04-29T18:00:00.000Z',
  path: '/orders/00000000-0000-4000-8000-000000000000',
  message: 'Order not found',
  code: 'ORD_NOT_FOUND',
};

export const userNotFoundExample = {
  success: false,
  statusCode: 404,
  statusText: 'Not Found',
  timestamp: '2026-04-29T18:00:00.000Z',
  path: '/users/00000000-0000-4000-8000-000000000000',
  message: 'User not found',
  code: 'USR_NOT_FOUND',
};

export const emailTakenExample = {
  success: false,
  statusCode: 409,
  statusText: 'Conflict',
  timestamp: '2026-04-29T18:00:00.000Z',
  path: '/users',
  message: 'A user with that email already exists',
  code: 'USR_EMAIL_TAKEN',
};
