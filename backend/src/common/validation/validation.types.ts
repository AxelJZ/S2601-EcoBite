// NOTE: Defines shared validation error response types.
export interface ValidationIssue {
  property: string;
  messages: string[];
}
