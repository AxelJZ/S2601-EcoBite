// NOTE: Prepares the Jest runtime environment for unit tests.
jest.mock('bcryptjs', () => {
  const compare = jest.fn();
  const hash = jest.fn(() => Promise.resolve('hashed-password'));
  return {
    __esModule: true,
    compare,
    hash,
    default: { compare, hash },
  };
});
