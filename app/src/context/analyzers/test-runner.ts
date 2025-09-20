#!/usr/bin/env tsx

/**
 * Simple test runner to verify SimilarityAnalyzer implementation
 */

import { SimilarityAnalyzer } from './SimilarityAnalyzer';
import { FileInfo } from './types';

async function runTests() {
  console.log('🧪 Testing SimilarityAnalyzer Implementation\n');

  const analyzer = new SimilarityAnalyzer();

  // Test 1: Identical files should return 1.0
  console.log('Test 1: Identical files');
  const file1: FileInfo = {
    path: '/test/file1.ts',
    name: 'file1.ts',
    extension: '.ts',
    content: 'const x = 42;',
    size: 13,
  };

  const result1 = await analyzer.analyzeSimilarity(file1, file1);
  console.log(`  Score: ${result1.overallScore} (expected: 1.0)`);
  console.log(`  ✅ Test 1 ${result1.overallScore === 1.0 ? 'PASSED' : 'FAILED'}\n`);

  // Test 2: Very similar files
  console.log('Test 2: Similar TypeScript files');
  const file2a: FileInfo = {
    path: '/test/Button.tsx',
    name: 'Button.tsx',
    extension: '.tsx',
    content: `import React from 'react';
export const Button = ({ label }) => <button>{label}</button>;`,
    size: 100,
  };

  const file2b: FileInfo = {
    path: '/test/ButtonNew.tsx',
    name: 'ButtonNew.tsx',
    extension: '.tsx',
    content: `import React from 'react';
export const Button = ({ text }) => <button>{text}</button>;`,
    size: 98,
  };

  const result2 = await analyzer.analyzeSimilarity(file2a, file2b);
  console.log(`  Filename Score: ${result2.layerScores.filename}`);
  console.log(`  Structure Score: ${result2.layerScores.structure}`);
  console.log(`  Semantic Score: ${result2.layerScores.semantic}`);
  console.log(`  Overall Score: ${result2.overallScore}`);
  console.log(`  ✅ Test 2 ${result2.overallScore > 0.6 ? 'PASSED' : 'FAILED'} (expected > 0.6)\n`);

  // Test 3: Different files
  console.log('Test 3: Different files');
  const file3a: FileInfo = {
    path: '/test/math.ts',
    name: 'math.ts',
    extension: '.ts',
    content: 'export function add(a: number, b: number) { return a + b; }',
    size: 60,
  };

  const file3b: FileInfo = {
    path: '/test/logger.ts',
    name: 'logger.ts',
    extension: '.ts',
    content: 'export class Logger { log(msg: string) { console.log(msg); } }',
    size: 63,
  };

  const result3 = await analyzer.analyzeSimilarity(file3a, file3b);
  console.log(`  Overall Score: ${result3.overallScore}`);
  console.log(`  ✅ Test 3 ${result3.overallScore < 0.3 ? 'PASSED' : 'FAILED'} (expected < 0.3)\n`);

  // Test 4: Batch analysis
  console.log('Test 4: Batch analysis');
  const newFile: FileInfo = {
    path: '/test/ButtonCopy.tsx',
    name: 'ButtonCopy.tsx',
    extension: '.tsx',
    content: `import React from 'react';
export const Button = ({ label }) => <button>{label}</button>;`,
    size: 100,
  };

  const existingFiles = [file2a, file3a, file3b];
  const batchResult = await analyzer.analyzeBatch(newFile, existingFiles);

  console.log(`  Files analyzed: ${batchResult.similarities.length}`);
  console.log(`  Best match: ${batchResult.bestMatch?.targetFile} (score: ${batchResult.bestMatch?.overallScore})`);
  console.log(`  Potential duplicates: ${batchResult.potentialDuplicates.length}`);
  console.log(`  ✅ Test 4 ${batchResult.bestMatch?.targetFile === file2a.path ? 'PASSED' : 'FAILED'}\n`);

  // Test 5: Empty files
  console.log('Test 5: Empty files');
  const emptyFile1: FileInfo = {
    path: '/test/empty1.txt',
    name: 'empty1.txt',
    extension: '.txt',
    content: '',
    size: 0,
  };

  const emptyFile2: FileInfo = {
    path: '/test/empty2.txt',
    name: 'empty2.txt',
    extension: '.txt',
    content: '',
    size: 0,
  };

  const result5 = await analyzer.analyzeSimilarity(emptyFile1, emptyFile2);
  console.log(`  Score: ${result5.overallScore} (expected: 1.0)`);
  console.log(`  Confidence: ${result5.confidence} (expected < 0.5)`);
  console.log(`  ✅ Test 5 ${result5.overallScore === 1.0 && result5.confidence < 0.5 ? 'PASSED' : 'FAILED'}\n`);

  // Test 6: Filename patterns
  console.log('Test 6: Filename patterns');
  const versionFile1: FileInfo = {
    path: '/test/config.json',
    name: 'config.json',
    extension: '.json',
    content: '{"version": "1.0"}',
    size: 18,
  };

  const versionFile2: FileInfo = {
    path: '/test/config.v2.json',
    name: 'config.v2.json',
    extension: '.json',
    content: '{"version": "2.0"}',
    size: 18,
  };

  const result6 = await analyzer.analyzeSimilarity(versionFile1, versionFile2);
  console.log(`  Filename Score: ${result6.layerScores.filename}`);
  console.log(`  Details: ${JSON.stringify(result6.details.filenamePatterns)}`);
  console.log(`  ✅ Test 6 ${result6.layerScores.filename > 0.7 ? 'PASSED' : 'FAILED'} (expected > 0.7)\n`);

  console.log('✅ All tests completed!');
}

// Run tests
runTests().catch(console.error);