# Task: Add Database Indexes to Improve Query Performance

## Context
The DuckDB storage table only has a primary key index on the 'key' column. Additional indexes could improve query performance for common patterns.

## Original Recommendation
From code review on 2025-09-09:
- Missing indexes for common query patterns
- Could improve performance for analytical queries

## Requirements

### Acceptance Criteria
- [ ] Analyze common query patterns in the application
- [ ] Add appropriate indexes for those patterns
- [ ] Benchmark performance improvements
- [ ] Document index strategy
- [ ] Consider index maintenance overhead

### Suggested Indexes
```sql
-- For timestamp-based queries
CREATE INDEX IF NOT EXISTS idx_created_at ON storage(created_at);
CREATE INDEX IF NOT EXISTS idx_updated_at ON storage(updated_at);

-- For JSON field queries (if DuckDB supports)
-- CREATE INDEX IF NOT EXISTS idx_value_type ON storage((value->>'type'));

-- Consider composite indexes for common filter combinations
```

### Implementation Location
In `createTableIfNeeded()` method after table creation:
```typescript
// Create performance indexes
await connection.run(`
  CREATE INDEX IF NOT EXISTS idx_updated_at 
  ON ${tableName}(updated_at)
`)

await connection.run(`
  CREATE INDEX IF NOT EXISTS idx_created_at 
  ON ${tableName}(created_at)
`)
```

## Performance Testing
- Measure query performance before/after indexes
- Test with different data volumes
- Monitor index size overhead
- Check impact on write performance

## Effort Estimate
- **Size**: Small (1 hour including testing)
- **Complexity**: Low
- **Risk**: Low

## Benefits
- Faster analytical queries
- Better performance for time-based queries
- Improved scalability

## Priority
**Low** - Performance optimization, not critical for current usage