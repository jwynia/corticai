/**
 * Example integration between UniversalFallbackAdapter and AttributeIndex
 * This demonstrates how to extract entities from files and index them for querying
 */

import { UniversalFallbackAdapter } from '../src/adapters/UniversalFallbackAdapter';
import { AttributeIndex } from '../src/indexes/AttributeIndex';
import type { Entity, FileMetadata } from '../src/types/entity';

async function demonstrateIntegration() {
  // Initialize components
  const adapter = new UniversalFallbackAdapter();
  const index = new AttributeIndex();

  // Sample markdown content
  const markdownContent = `
# Project Documentation

## Installation
To install this project, run:
\`\`\`bash
npm install
\`\`\`

## Features
- Fast performance
- Easy to use
- Well documented

## API Reference
See the [API docs](./api.md) for details.

### Authentication
The system uses JWT tokens for authentication.

### Database
We use PostgreSQL for data storage.
  `;

  // Extract entities using the adapter
  const metadata: FileMetadata = {
    path: '/docs/README.md',
    filename: 'README.md',
    extension: '.md'
  };
  
  const entities = adapter.extract(markdownContent, metadata);
  console.log(`Extracted ${entities.length} entities from the document\n`);

  // Index the entities
  entities.forEach(entity => {
    // Index basic properties
    index.addAttribute(entity.id, 'type', entity.type);
    index.addAttribute(entity.id, 'name', entity.name);
    
    // Index metadata
    if (entity.metadata) {
      Object.entries(entity.metadata).forEach(([key, value]) => {
        if (value !== undefined) {
          index.addAttribute(entity.id, key, value);
        }
      });
    }
    
    // Index content length as a derived attribute
    if (entity.content) {
      index.addAttribute(entity.id, 'contentLength', entity.content.length);
      
      // Index whether it contains code
      if (entity.content.includes('```')) {
        index.addAttribute(entity.id, 'hasCode', true);
      }
      
      // Index references
      const urlPattern = /https?:\/\/[^\s]+/g;
      const urls = entity.content.match(urlPattern);
      if (urls) {
        urls.forEach(url => {
          index.addAttribute(entity.id, 'references', url);
        });
      }
    }
  });

  // Demonstrate querying capabilities
  console.log('=== Query Examples ===\n');

  // Find all sections
  const sections = index.findByAttribute('type', 'section');
  console.log(`Found ${sections.size} sections:`);
  sections.forEach(id => {
    const entity = entities.find(e => e.id === id);
    console.log(`  - ${entity?.name}`);
  });
  console.log();

  // Find all level 2 headers
  const level2Headers = index.findByAttribute('level', 2);
  console.log(`Found ${level2Headers.size} level 2 headers\n`);

  // Find entities with code blocks
  const withCode = index.findByAttribute('hasCode', true);
  console.log(`Found ${withCode.size} entities containing code\n`);

  // Complex query: Find sections that are level 2
  const level2Sections = index.findByAttributes([
    { attribute: 'type', value: 'section', operator: 'equals' },
    { attribute: 'level', value: 2, operator: 'equals' }
  ], 'AND');
  console.log(`Found ${level2Sections.size} level 2 sections\n`);

  // Find all entities that reference external URLs
  const withReferences = index.findByAttribute('references');
  console.log(`Found ${withReferences.size} entities with external references\n`);

  // Get statistics
  const stats = index.getStatistics();
  console.log('=== Index Statistics ===');
  console.log(`Total entities: ${stats.totalEntities}`);
  console.log(`Total attributes: ${stats.totalAttributes}`);
  console.log(`Total values: ${stats.totalValues}`);
  console.log(`Average attributes per entity: ${stats.averageAttributesPerEntity.toFixed(2)}\n`);

  // Save the index
  await index.save('./data/index.json');
  console.log('Index saved to ./data/index.json');
}

// Run the demonstration
if (require.main === module) {
  demonstrateIntegration().catch(console.error);
}

export { demonstrateIntegration };