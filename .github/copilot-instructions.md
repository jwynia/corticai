# CorticAI Development Instructions

**ALWAYS follow these instructions first and fallback to additional search and context gathering only if the information here is incomplete or found to be in error.**

CorticAI is a TypeScript context engine built with the Mastra.ai framework for creating intelligent agents with persistent memory. The project consists of a main application (`app/`) and a core library package (`packages/corticai-core/`), featuring DuckDB storage, advanced query interfaces, and TypeScript dependency analysis.

## Prerequisites

**CRITICAL**: Ensure you have Node.js 20.x or higher. The project requires Node.js >= 20.9.0.

Run: `node --version` to verify (should be v20.x.x)

## Quick Setup Commands

**ALWAYS run these commands in order for a fresh repository:**

```bash
# Install main application dependencies
cd app
npm ci  # NEVER CANCEL: Takes ~28 minutes. Set timeout to 60+ minutes.

# Install core package dependencies  
cd ../packages/corticai-core
npm ci  # Takes ~12 seconds

# Return to project root
cd ../..
```

## Build and Test Commands

### Main Application (app/)

**ALL commands must be run from the `app/` directory:**

```bash
cd app

# Build the application
npm run build  # Takes ~52 seconds. NEVER CANCEL: Set timeout to 5+ minutes.

# Run tests
npm run test   # Takes ~95 seconds. NEVER CANCEL: Set timeout to 10+ minutes.

# Run development server
npm run dev    # Starts in ~1.1 seconds. Access at http://localhost:4111/

# Generate documentation
npm run docs:build  # Takes ~4 seconds

# Run benchmarks (note: some benchmarks may fail with validation errors)
npm run benchmark:fast  # Quick benchmark run
npm run benchmark      # Full benchmark suite
```

**CRITICAL TIMEOUTS:**
- `npm ci`: NEVER CANCEL - Takes 28+ minutes, set timeout to 3600+ seconds
- `npm run build`: NEVER CANCEL - Takes 52+ seconds, set timeout to 300+ seconds  
- `npm run test`: NEVER CANCEL - Takes 95+ seconds, set timeout to 600+ seconds

### Core Package (packages/corticai-core/)

**ALL commands must be run from the `packages/corticai-core/` directory:**

```bash
cd packages/corticai-core

# Build the core package
npm run build  # Takes ~1.5 seconds

# Run tests  
npm test       # Takes ~2.5 seconds

# Lint code (has warnings about TypeScript version compatibility)
npm run lint

# Check formatting (may show formatting issues)
npm run format:check

# Fix formatting
npm run format
```

## Development Workflow

### Starting Development
1. **ALWAYS build first:** Run `cd app && npm run build` before starting development
2. **Start dev server:** Run `npm run dev` from `app/` directory
3. **Access playground:** Navigate to http://localhost:4111/ to access the Mastra playground
4. **Access API:** Navigate to http://localhost:4111/api for API endpoint

### Testing Your Changes
**ALWAYS validate functionality after making changes:**

1. **Build verification:** Run `npm run build` in both `app/` and `packages/corticai-core/`
2. **Test suite:** Run `npm test` in both directories
3. **Manual validation:** Start dev server and test key workflows:
   - Access http://localhost:4111/ and verify playground loads
   - Navigate through different sections (Agents, Networks, Tools, etc.)
   - Check API responds at http://localhost:4111/api
4. **Format check:** Run `npm run format:check` in core package (warnings are acceptable)

### CI/CD Requirements
**ALWAYS run these before committing:**

```bash
# In app/ directory
npm run build && npm run test

# In packages/corticai-core/ directory  
npm run build && npm test && npm run lint
```

## Project Structure

### Key Directories
- `app/` - Main Mastra.ai application with storage adapters, query builders, and agents
- `packages/corticai-core/` - Core context network library with Kuzu graph database
- `context-network/` - Project documentation and architecture decisions (see CLAUDE.md)
- `.github/workflows/` - CI/CD workflows for benchmarks and documentation

### Important Files
- `app/src/index.ts` - Main application entry point and exports
- `app/src/storage/` - Storage adapters (Memory, JSON, DuckDB)
- `app/src/query/` - Query builder and executor interfaces
- `app/src/context/` - Context management and agent tools
- `app/src/mastra/` - Mastra.ai framework integration
- `packages/corticai-core/src/` - Core graph database functionality

### Configuration Files
- `app/package.json` - Main application dependencies and scripts
- `packages/corticai-core/package.json` - Core package configuration
- `app/vitest.config.ts` - Test configuration
- `packages/corticai-core/.env.example` - Environment configuration template

## Common Issues and Solutions

### Network Errors (PostHog)
**Expected behavior:** You will see PostHog network errors during build and dev server startup. These are telemetry failures due to network restrictions and do NOT affect functionality. Ignore these errors.

### Benchmark Failures
**Expected behavior:** Some benchmarks may fail with "Aggregation must have an alias" validation errors. This is a known issue and does not affect core functionality.

### TypeScript Version Warnings
**Expected behavior:** ESLint shows warnings about TypeScript version compatibility (5.9.2 vs supported <5.6.0). This is acceptable and does not prevent development.

### Build Timing
**CRITICAL:** Dependencies installation takes 28+ minutes. Build processes take 1-2 minutes. Test suites take 1-2 minutes. NEVER cancel these operations. Set appropriate timeouts and wait for completion.

## Environment Variables

Copy `packages/corticai-core/.env.example` to `.env` and configure:
- `KUZU_DB_PATH` - Graph database location
- `NODE_ENV` - Development/production mode
- `LOG_LEVEL` - Logging verbosity

## Documentation

- **TypeDoc documentation:** Run `npm run docs:build` in `app/` directory
- **Context network:** See `context-network/` for architectural decisions
- **README files:** Check `README.md` in project root and `app/` directory

## Architecture Overview

CorticAI implements a dual-layer architecture:
1. **Application Layer** (`app/`) - Mastra.ai agents with multiple storage adapters
2. **Core Layer** (`packages/corticai-core/`) - Graph database and context management
3. **Query Layer** - Advanced query builders with aggregation and filtering
4. **Analysis Layer** - TypeScript dependency analysis and code intelligence

## Performance Expectations

- **Dependency installation:** 28+ minutes (app), 12 seconds (core)
- **Build time:** 52 seconds (app), 1.5 seconds (core)  
- **Test suite:** 95 seconds (app), 2.5 seconds (core)
- **Dev server startup:** 1.1 seconds
- **Documentation generation:** 4 seconds

## Working with the Codebase

### Adding New Features
1. **Check context network first:** Review `context-network/` for architectural patterns
2. **Follow existing patterns:** Examine similar implementations in `src/` directories
3. **Test thoroughly:** Run full test suites and manual validation
4. **Update documentation:** Generate new TypeDoc if interfaces change

### Debugging Issues
1. **Check dev server logs:** Look for specific error messages beyond PostHog warnings
2. **Run tests in isolation:** Use `npm test -- --reporter=verbose` for detailed output
3. **Verify builds:** Ensure both packages build successfully
4. **Check database:** Verify DuckDB/Kuzu database connectivity if storage issues occur

**Remember:** ALWAYS build and test your changes thoroughly. The benchmarking system exists but may have validation issues. Focus on core functionality validation through the development server and test suites.