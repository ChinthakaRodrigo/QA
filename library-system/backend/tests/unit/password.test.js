const { hashPassword, verifyPassword } = require('../../src/utils/password');

describe('password hashing', () => {
  test('a hashed password can be verified', () => {
    const hash = hashPassword('Secret123');
    expect(verifyPassword('Secret123', hash)).toBe(true);
  });

  test('a wrong password is rejected', () => {
    expect(verifyPassword('Wrong123', hashPassword('Secret123'))).toBe(false);
  });

  test('the same password gives different hashes (random salt)', () => {
    expect(hashPassword('Secret123')).not.toBe(hashPassword('Secret123'));
  });

  test('the plain password is not stored in the hash', () => {
    expect(hashPassword('Secret123')).not.toContain('Secret123');
  });

  test.each(['', 'nocolon', 'salt:', null])('a malformed stored hash %p is rejected', (stored) => {
    expect(verifyPassword('Secret123', stored)).toBe(false);
  });
});
