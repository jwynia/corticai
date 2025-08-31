// Test setup file for Vitest
// Add any global test configuration here

import { expect } from 'vitest';
import '@testing-library/jest-dom';

// Example: Add custom matchers if needed
// expect.extend({
//   toBeValidEntity(received) {
//     const pass = received && 
//                  typeof received.type === 'string' && 
//                  typeof received.name === 'string';
//     
//     return {
//       pass,
//       message: () => pass 
//         ? `Expected ${received} not to be a valid entity`
//         : `Expected ${received} to be a valid entity with type and name`
//     };
//   }
// });

// Set up any test environment variables
process.env.NODE_ENV = 'test';