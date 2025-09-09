import { describe, it, expect } from 'vitest';

describe('Test Infrastructure', () => {
  it('should have test environment configured', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});