# Task: Migrate to Consistent ES Module System

## Source
Code Review - Low Priority Issue

## Problem Description
The codebase mixes CommonJS and ES module patterns:
- `DatabaseService.js` uses CommonJS (`require()`, `module.exports`)
- `services/index.ts` uses ES modules (`export`, `import`)
- This inconsistency can cause confusion and may have compatibility implications

## Current Mixing
- **CommonJS**: `mobile/src/services/database/DatabaseService.js`
- **ES Modules**: `mobile/src/services/index.ts`

## Acceptance Criteria
- [ ] Choose consistent module system (likely ES modules for React Native)
- [ ] Convert all service files to chosen system
- [ ] Update all imports/exports consistently
- [ ] Ensure compatibility with React Native bundler
- [ ] Update Jest configuration if needed for ES modules
- [ ] All tests continue to pass
- [ ] No breaking changes to external API

## Proposed Migration
Convert to ES modules throughout:
```javascript
// Instead of CommonJS
const SQLite = require('react-native-sqlite-storage');
module.exports = DatabaseService;

// Use ES modules
import SQLite from 'react-native-sqlite-storage';
export default DatabaseService;
```

## Dependencies
- Research React Native ES module support and best practices
- Ensure Jest/testing framework supports ES modules
- Check if any external dependencies require CommonJS
- Coordinate with any bundling/build process requirements

## Risk Level
**Low** - Modernization with clear migration path, no functional changes

## Effort Estimate
**Small** (15-30 minutes)
- Research ES module best practices for React Native: 10 min
- Convert DatabaseService and utility files: 15 min
- Update test imports if needed: 5 min

## Priority
Low - Improves consistency but doesn't affect functionality

## Implementation Strategy
1. Research current React Native ES module support
2. Update `DatabaseService.js` to use ES modules
3. Update utility files (`crypto.js`, `filesystem.js`)
4. Update test imports
5. Verify everything works in React Native environment

## Benefits
- Consistent module system throughout codebase
- Better tree-shaking support
- Modern JavaScript practices
- Improved IDE support and static analysis

## Notes
- Should be coordinated with any broader codebase modernization efforts
- May want to establish project-wide module system standards
- Consider whether this affects the larger architectural refactoring