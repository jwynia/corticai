import { describe, it, expect, beforeEach } from 'vitest';
import { SemanticAnalyzer } from '../../../../src/context/analyzers/layers/SemanticAnalyzer';
import { FileInfo } from '../../../../src/context/analyzers/types';

describe('SemanticAnalyzer', () => {
  let analyzer: SemanticAnalyzer;

  beforeEach(() => {
    analyzer = new SemanticAnalyzer();
  });

  describe('analyze', () => {
    describe('keyword extraction and comparison', () => {
      it('should detect high similarity for identical content', async () => {
        const file1: FileInfo = {
          path: '/file1.txt',
          name: 'file1.txt',
          extension: '.txt',
          content: 'The quick brown fox jumps over the lazy dog.',
          size: 45,
        };

        const file2: FileInfo = {
          path: '/file2.txt',
          name: 'file2.txt',
          extension: '.txt',
          content: 'The quick brown fox jumps over the lazy dog.',
          size: 45,
        };

        const score = await analyzer.analyze(file1, file2);
        expect(score).toBe(1.0);
      });

      it('should detect high similarity for semantically similar content', async () => {
        const file1: FileInfo = {
          path: '/auth1.ts',
          name: 'auth1.ts',
          extension: '.ts',
          content: `function authenticateUser(username: string, password: string) {
  // Check user credentials
  // Validate password
  // Create session token
  // Return authentication result
}`,
          size: 150,
        };

        const file2: FileInfo = {
          path: '/auth2.ts',
          name: 'auth2.ts',
          extension: '.ts',
          content: `function loginUser(user: string, pass: string) {
  // Verify user credentials
  // Check password validity
  // Generate session token
  // Send authentication response
}`,
          size: 160,
        };

        const score = await analyzer.analyze(file1, file2);
        expect(score).toBeGreaterThan(0.6); // Similar semantic meaning
      });

      it('should extract and compare technical keywords', async () => {
        const file1: FileInfo = {
          path: '/component1.tsx',
          name: 'component1.tsx',
          extension: '.tsx',
          content: `import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UserProfile = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    axios.get('/api/user').then(response => setUser(response.data));
  }, []);

  return <div>{user?.name}</div>;
};`,
          size: 250,
        };

        const file2: FileInfo = {
          path: '/component2.tsx',
          name: 'component2.tsx',
          extension: '.tsx',
          content: `import React, { useState, useEffect } from 'react';
import fetch from 'node-fetch';

const ProfileComponent = () => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    fetch('/api/profile').then(res => res.json()).then(setUserData);
  }, []);

  return <div>{userData?.username}</div>;
};`,
          size: 270,
        };

        const score = await analyzer.analyze(file1, file2);
        expect(score).toBeGreaterThan(0.5); // Share React hooks and patterns

        const details = analyzer.getDetails();
        expect(details.sharedKeywords).toContain('React');
        expect(details.sharedKeywords).toContain('useState');
        expect(details.sharedKeywords).toContain('useEffect');
      });
    });

    describe('code-specific semantic analysis', () => {
      it('should detect similar function purposes', async () => {
        const file1: FileInfo = {
          path: '/validators1.ts',
          name: 'validators1.ts',
          extension: '.ts',
          content: `export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone);
}`,
          size: 200,
        };

        const file2: FileInfo = {
          path: '/validators2.ts',
          name: 'validators2.ts',
          extension: '.ts',
          content: `export function isValidEmail(emailAddress: string): boolean {
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return pattern.test(emailAddress);
}

export function isValidPhoneNumber(phoneNum: string): boolean {
  const pattern = /^[0-9]{10}$/;
  return pattern.test(phoneNum);
}`,
          size: 230,
        };

        const score = await analyzer.analyze(file1, file2);
        expect(score).toBeGreaterThan(0.7); // Very similar validation logic
      });

      it('should detect similar error handling patterns', async () => {
        const file1: FileInfo = {
          path: '/error1.ts',
          name: 'error1.ts',
          extension: '.ts',
          content: `try {
  const result = await fetchData();
  processData(result);
} catch (error) {
  console.error('Failed to fetch data:', error);
  throw new Error('Data fetch failed');
}`,
          size: 150,
        };

        const file2: FileInfo = {
          path: '/error2.ts',
          name: 'error2.ts',
          extension: '.ts',
          content: `try {
  const data = await getData();
  handleData(data);
} catch (err) {
  console.error('Error getting data:', err);
  throw new Error('Failed to get data');
}`,
          size: 140,
        };

        const score = await analyzer.analyze(file1, file2);
        expect(score).toBeGreaterThan(0.6); // Similar error handling pattern
      });
    });

    describe('documentation and comment analysis', () => {
      it('should detect similar documentation patterns', async () => {
        const file1: FileInfo = {
          path: '/doc1.ts',
          name: 'doc1.ts',
          extension: '.ts',
          content: `/**
 * Calculates the sum of two numbers
 * @param a First number
 * @param b Second number
 * @returns The sum of a and b
 */
function add(a: number, b: number): number {
  return a + b;
}`,
          size: 150,
        };

        const file2: FileInfo = {
          path: '/doc2.ts',
          name: 'doc2.ts',
          extension: '.ts',
          content: `/**
 * Adds two numbers together
 * @param x First number
 * @param y Second number
 * @returns The sum of x and y
 */
function sum(x: number, y: number): number {
  return x + y;
}`,
          size: 145,
        };

        const score = await analyzer.analyze(file1, file2);
        expect(score).toBeGreaterThan(0.8); // Very similar documentation and purpose
      });

      it('should extract TODO and FIXME comments', async () => {
        const file1: FileInfo = {
          path: '/todo1.ts',
          name: 'todo1.ts',
          extension: '.ts',
          content: `// TODO: Implement caching
// FIXME: Handle edge case for null values
function processData(data: any) {
  // TODO: Add validation
  return data;
}`,
          size: 120,
        };

        const file2: FileInfo = {
          path: '/todo2.ts',
          name: 'todo2.ts',
          extension: '.ts',
          content: `// TODO: Add caching mechanism
// FIXME: Fix null pointer issue
function handleData(input: any) {
  // TODO: Validate input
  return input;
}`,
          size: 125,
        };

        const score = await analyzer.analyze(file1, file2);
        expect(score).toBeGreaterThan(0.6); // Similar TODOs and structure

        const details = analyzer.getDetails();
        expect(details.sharedKeywords).toContain('TODO');
        expect(details.sharedKeywords).toContain('FIXME');
      });
    });

    describe('different content types', () => {
      it('should handle markdown semantic content', async () => {
        const file1: FileInfo = {
          path: '/readme1.md',
          name: 'readme1.md',
          extension: '.md',
          content: `# User Authentication System

This module handles user login, registration, and session management.
It includes password hashing, token generation, and security features.`,
          size: 150,
        };

        const file2: FileInfo = {
          path: '/readme2.md',
          name: 'readme2.md',
          extension: '.md',
          content: `# Authentication Module

Manages user sign-in, sign-up, and session handling.
Features include password encryption, JWT tokens, and security measures.`,
          size: 140,
        };

        const score = await analyzer.analyze(file1, file2);
        expect(score).toBeGreaterThan(0.7); // Similar authentication concepts
      });

      it('should handle configuration file semantics', async () => {
        const file1: FileInfo = {
          path: '/config1.json',
          name: 'config1.json',
          extension: '.json',
          content: JSON.stringify({
            database: {
              host: 'localhost',
              port: 5432,
              username: 'admin',
              password: 'secret',
            },
            cache: {
              enabled: true,
              ttl: 3600,
            },
          }),
          size: 150,
        };

        const file2: FileInfo = {
          path: '/config2.json',
          name: 'config2.json',
          extension: '.json',
          content: JSON.stringify({
            db: {
              hostname: '127.0.0.1',
              port: 5432,
              user: 'root',
              pass: 'password',
            },
            caching: {
              active: true,
              expiry: 3600,
            },
          }),
          size: 145,
        };

        const score = await analyzer.analyze(file1, file2);
        expect(score).toBeGreaterThan(0.5); // Similar configuration concepts
      });
    });

    describe('edge cases', () => {
      it('should handle empty content', async () => {
        const file1: FileInfo = {
          path: '/empty1.txt',
          name: 'empty1.txt',
          extension: '.txt',
          content: '',
          size: 0,
        };

        const file2: FileInfo = {
          path: '/empty2.txt',
          name: 'empty2.txt',
          extension: '.txt',
          content: '',
          size: 0,
        };

        const score = await analyzer.analyze(file1, file2);
        expect(score).toBe(1.0); // Both empty = identical
      });

      it('should handle single word content', async () => {
        const file1: FileInfo = {
          path: '/word1.txt',
          name: 'word1.txt',
          extension: '.txt',
          content: 'hello',
          size: 5,
        };

        const file2: FileInfo = {
          path: '/word2.txt',
          name: 'word2.txt',
          extension: '.txt',
          content: 'hello',
          size: 5,
        };

        const score = await analyzer.analyze(file1, file2);
        expect(score).toBe(1.0);
      });

      it('should handle special characters and emojis', async () => {
        const file1: FileInfo = {
          path: '/special1.txt',
          name: 'special1.txt',
          extension: '.txt',
          content: '🚀 Launch the app! @#$%^&*()',
          size: 30,
        };

        const file2: FileInfo = {
          path: '/special2.txt',
          name: 'special2.txt',
          extension: '.txt',
          content: '🎯 Start the application! @#$%',
          size: 28,
        };

        const score = await analyzer.analyze(file1, file2);
        expect(score).toBeGreaterThan(0.3); // Some similarity in concept
      });

      it('should handle very long content efficiently', async () => {
        const longText1 = 'Lorem ipsum dolor sit amet '.repeat(1000);
        const longText2 = 'Lorem ipsum dolor sit amet '.repeat(1000);

        const file1: FileInfo = {
          path: '/long1.txt',
          name: 'long1.txt',
          extension: '.txt',
          content: longText1,
          size: longText1.length,
        };

        const file2: FileInfo = {
          path: '/long2.txt',
          name: 'long2.txt',
          extension: '.txt',
          content: longText2,
          size: longText2.length,
        };

        const startTime = Date.now();
        const score = await analyzer.analyze(file1, file2);
        const elapsed = Date.now() - startTime;

        expect(score).toBe(1.0); // Identical content
        expect(elapsed).toBeLessThan(50); // Should be fast
      });

      it('should handle completely different content', async () => {
        const file1: FileInfo = {
          path: '/math.ts',
          name: 'math.ts',
          extension: '.ts',
          content: 'function calculatePi() { return 3.14159; }',
          size: 40,
        };

        const file2: FileInfo = {
          path: '/string.ts',
          name: 'string.ts',
          extension: '.ts',
          content: 'function reverseString(s: string) { return s.split("").reverse().join(""); }',
          size: 75,
        };

        const score = await analyzer.analyze(file1, file2);
        expect(score).toBeLessThan(0.3); // Very different purposes
      });
    });

    it('should return semantic details', () => {
      const details = analyzer.getDetails();
      expect(details).toBeDefined();
      expect(details.sharedKeywords).toBeDefined();
    });
  });
});