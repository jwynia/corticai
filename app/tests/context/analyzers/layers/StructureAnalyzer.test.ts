import { describe, it, expect, beforeEach } from 'vitest';
import { StructureAnalyzer } from '../../../../src/context/analyzers/layers/StructureAnalyzer';
import { FileInfo } from '../../../../src/context/analyzers/types';

describe('StructureAnalyzer', () => {
  let analyzer: StructureAnalyzer;

  beforeEach(() => {
    analyzer = new StructureAnalyzer();
  });

  describe('analyze', () => {
    describe('TypeScript/JavaScript structure analysis', () => {
      it('should detect identical structure', async () => {
        const file1: FileInfo = {
          path: '/project/Button1.tsx',
          name: 'Button1.tsx',
          extension: '.tsx',
          content: `import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
}

export const Button: React.FC<ButtonProps> = ({ label, onClick }) => {
  return <button onClick={onClick}>{label}</button>;
};`,
          size: 200,
        };

        const file2: FileInfo = {
          path: '/project/Button2.tsx',
          name: 'Button2.tsx',
          extension: '.tsx',
          content: `import React from 'react';

interface ButtonProps {
  text: string;
  handleClick: () => void;
}

export const Button: React.FC<ButtonProps> = ({ text, handleClick }) => {
  return <button onClick={handleClick}>{text}</button>;
};`,
          size: 210,
        };

        const score = await analyzer.analyze(file1, file2);
        expect(score).toBeGreaterThan(0.8); // Very similar structure
      });

      it('should detect class vs function component differences', async () => {
        const classComponent: FileInfo = {
          path: '/project/ClassButton.tsx',
          name: 'ClassButton.tsx',
          extension: '.tsx',
          content: `import React, { Component } from 'react';

class Button extends Component {
  render() {
    return <button>{this.props.label}</button>;
  }
}

export default Button;`,
          size: 150,
        };

        const funcComponent: FileInfo = {
          path: '/project/FuncButton.tsx',
          name: 'FuncButton.tsx',
          extension: '.tsx',
          content: `import React from 'react';

const Button = ({ label }) => {
  return <button>{label}</button>;
};

export default Button;`,
          size: 100,
        };

        const score = await analyzer.analyze(classComponent, funcComponent);
        expect(score).toBeGreaterThan(0.4); // Some similarity
        expect(score).toBeLessThan(0.7); // But different patterns
      });

      it('should detect similar import patterns', async () => {
        const file1: FileInfo = {
          path: '/project/file1.ts',
          name: 'file1.ts',
          extension: '.ts',
          content: `import { useState, useEffect } from 'react';
import axios from 'axios';
import { User } from './types';`,
          size: 100,
        };

        const file2: FileInfo = {
          path: '/project/file2.ts',
          name: 'file2.ts',
          extension: '.ts',
          content: `import { useState, useCallback } from 'react';
import axios from 'axios';
import { Product } from './types';`,
          size: 105,
        };

        const score = await analyzer.analyze(file1, file2);
        expect(score).toBeGreaterThan(0.7); // Similar import structure
      });
    });

    describe('Markdown structure analysis', () => {
      it('should detect similar markdown structure', async () => {
        const file1: FileInfo = {
          path: '/docs/guide1.md',
          name: 'guide1.md',
          extension: '.md',
          content: `# Main Title

## Introduction
Some intro text.

## Installation
\`\`\`bash
npm install package
\`\`\`

## Usage
Example usage here.

## API Reference
- Method 1
- Method 2`,
          size: 200,
        };

        const file2: FileInfo = {
          path: '/docs/guide2.md',
          name: 'guide2.md',
          extension: '.md',
          content: `# Different Title

## Introduction
Different intro.

## Installation
\`\`\`bash
yarn add package
\`\`\`

## Usage
Different examples.

## API Reference
- Function A
- Function B`,
          size: 210,
        };

        const score = await analyzer.analyze(file1, file2);
        expect(score).toBeGreaterThan(0.8); // Same heading structure
      });

      it('should detect different heading hierarchies', async () => {
        const file1: FileInfo = {
          path: '/docs/doc1.md',
          name: 'doc1.md',
          extension: '.md',
          content: `# Title
## Section 1
### Subsection 1.1
### Subsection 1.2
## Section 2`,
          size: 100,
        };

        const file2: FileInfo = {
          path: '/docs/doc2.md',
          name: 'doc2.md',
          extension: '.md',
          content: `# Title
Content without sections`,
          size: 50,
        };

        const score = await analyzer.analyze(file1, file2);
        expect(score).toBeLessThan(0.4); // Very different structure
      });
    });

    describe('JSON structure analysis', () => {
      it('should detect similar JSON structure', async () => {
        const file1: FileInfo = {
          path: '/config/config1.json',
          name: 'config1.json',
          extension: '.json',
          content: JSON.stringify({
            name: 'app1',
            version: '1.0.0',
            dependencies: {
              react: '^17.0.0',
              typescript: '^4.0.0',
            },
            scripts: {
              start: 'node index.js',
              test: 'jest',
            },
          }, null, 2),
          size: 200,
        };

        const file2: FileInfo = {
          path: '/config/config2.json',
          name: 'config2.json',
          extension: '.json',
          content: JSON.stringify({
            name: 'app2',
            version: '2.0.0',
            dependencies: {
              react: '^18.0.0',
              typescript: '^5.0.0',
            },
            scripts: {
              start: 'node app.js',
              test: 'vitest',
            },
          }, null, 2),
          size: 200,
        };

        const score = await analyzer.analyze(file1, file2);
        expect(score).toBeGreaterThan(0.9); // Same JSON structure
      });

      it('should detect different JSON structures', async () => {
        const file1: FileInfo = {
          path: '/config/package.json',
          name: 'package.json',
          extension: '.json',
          content: JSON.stringify({
            name: 'app',
            version: '1.0.0',
            dependencies: {},
          }),
          size: 100,
        };

        const file2: FileInfo = {
          path: '/config/tsconfig.json',
          name: 'tsconfig.json',
          extension: '.json',
          content: JSON.stringify({
            compilerOptions: {
              target: 'ES2020',
              module: 'commonjs',
            },
            include: ['src/**/*'],
          }),
          size: 120,
        };

        const score = await analyzer.analyze(file1, file2);
        expect(score).toBeLessThan(0.3); // Different JSON structure
      });
    });

    describe('YAML structure analysis', () => {
      it('should detect similar YAML structure', async () => {
        const file1: FileInfo = {
          path: '/config/config1.yml',
          name: 'config1.yml',
          extension: '.yml',
          content: `name: app1
version: 1.0.0
services:
  - web
  - api
  - database
settings:
  debug: true
  port: 3000`,
          size: 100,
        };

        const file2: FileInfo = {
          path: '/config/config2.yml',
          name: 'config2.yml',
          extension: '.yml',
          content: `name: app2
version: 2.0.0
services:
  - frontend
  - backend
  - cache
settings:
  debug: false
  port: 8080`,
          size: 110,
        };

        const score = await analyzer.analyze(file1, file2);
        expect(score).toBeGreaterThan(0.8); // Similar YAML structure
      });
    });

    describe('edge cases', () => {
      it('should handle empty files', async () => {
        const emptyFile1: FileInfo = {
          path: '/empty1.txt',
          name: 'empty1.txt',
          extension: '.txt',
          content: '',
          size: 0,
        };

        const emptyFile2: FileInfo = {
          path: '/empty2.txt',
          name: 'empty2.txt',
          extension: '.txt',
          content: '',
          size: 0,
        };

        const score = await analyzer.analyze(emptyFile1, emptyFile2);
        expect(score).toBe(1.0); // Both empty = identical structure
      });

      it('should handle whitespace-only files', async () => {
        const file1: FileInfo = {
          path: '/space.txt',
          name: 'space.txt',
          extension: '.txt',
          content: '   \n  \t  \n   ',
          size: 10,
        };

        const file2: FileInfo = {
          path: '/tabs.txt',
          name: 'tabs.txt',
          extension: '.txt',
          content: '\t\t\t\n\n',
          size: 5,
        };

        const score = await analyzer.analyze(file1, file2);
        expect(score).toBeGreaterThan(0.8); // Both essentially empty
      });

      it('should handle malformed JSON gracefully', async () => {
        const file1: FileInfo = {
          path: '/bad.json',
          name: 'bad.json',
          extension: '.json',
          content: '{ invalid json }',
          size: 16,
        };

        const file2: FileInfo = {
          path: '/good.json',
          name: 'good.json',
          extension: '.json',
          content: '{"valid": "json"}',
          size: 17,
        };

        const score = await analyzer.analyze(file1, file2);
        expect(score).toBeDefined();
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });

      it('should handle very long lines', async () => {
        const file1: FileInfo = {
          path: '/long1.txt',
          name: 'long1.txt',
          extension: '.txt',
          content: 'a'.repeat(10000),
          size: 10000,
        };

        const file2: FileInfo = {
          path: '/long2.txt',
          name: 'long2.txt',
          extension: '.txt',
          content: 'b'.repeat(10000),
          size: 10000,
        };

        const score = await analyzer.analyze(file1, file2);
        expect(score).toBeGreaterThan(0.5); // Similar structure (one long line)
      });
    });

    it('should return structure details', () => {
      const details = analyzer.getDetails();
      expect(details).toBeDefined();
      expect(details.commonStructures).toBeDefined();
    });
  });
});