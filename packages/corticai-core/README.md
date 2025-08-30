# CorticAI Core

A three-tier memory system for code intelligence and knowledge management, inspired by cognitive neuroscience.

## Features

- 🧠 **Three-tier memory architecture** - Hot cache, warm storage, and cold archive
- 🌳 **Tree-sitter parsing** - Fast, incremental parsing with error recovery
- 📊 **Graph-based storage** - Efficient relationship modeling with KuzuDB
- 🔍 **Advanced dependency analysis** - Track imports, calls, and references
- ⚡ **Sub-100ms queries** - Optimized for real-time code navigation
- 🔄 **Incremental updates** - Efficient file watching and updating

## Installation

```bash
npm install @corticai/core
```

## Usage

```typescript
import { CorticAI } from '@corticai/core';

const corticai = new CorticAI();

// Initialize the system
await corticai.init();

// Index a TypeScript project
await corticai.indexDirectory('./src');

// Query for symbol definition
const definition = await corticai.findDefinition('MyClass');

// Find all references
const references = await corticai.findReferences('myFunction');

// Get file dependencies
const deps = await corticai.getDependencies('./src/index.ts');

// Shutdown when done
await corticai.shutdown();
```

## Development

### Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Lint code
- `npm run format` - Format code
- `npm run typecheck` - Type check without building

## Architecture

CorticAI implements a cognitive-inspired three-tier memory system:

1. **Hot Cache** (Working Memory) - In-memory storage for active queries
2. **Warm Storage** (Hippocampus) - Recent changes and consolidation
3. **Cold Archive** (Neocortex) - Long-term graph storage in KuzuDB

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0.0

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## License

MIT