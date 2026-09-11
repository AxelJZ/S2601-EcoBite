// NOTE: Defines the API response envelope shape used by e2e tests.
export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
};
