// NOTE: Verifies flattening of nested validation errors.
import { ValidationError } from 'class-validator';
import { flattenValidationErrors } from './flatten-validation-errors';

describe('flattenValidationErrors', () => {
  it('flatten nested children paths', () => {
    const root = new ValidationError();
    root.property = 'body';
    const child = new ValidationError();
    child.property = 'email';
    child.constraints = { isEmail: 'must be email' };

    root.children = [child];

    const out = flattenValidationErrors([root]);
    expect(out).toEqual([
      {
        property: 'body.email',
        messages: ['must be email'],
      },
    ]);
  });

  it('handles top-level constraint only', () => {
    const e = new ValidationError();
    e.property = 'name';
    e.constraints = { minLength: 'too short' };
    expect(flattenValidationErrors([e])).toEqual([
      { property: 'name', messages: ['too short'] },
    ]);
  });

  it('returns empty messages array when constraint missing but children present', () => {
    const e = new ValidationError();
    e.property = 'root';
    const c = new ValidationError();
    c.property = 'x';
    c.constraints = { isInt: 'not int' };
    e.children = [c];
    expect(flattenValidationErrors([e])).toEqual([
      { property: 'root.x', messages: ['not int'] },
    ]);
  });
});
