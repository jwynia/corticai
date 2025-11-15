# Add Input Validation for Quality Weights

**Status**: ✅ COMPLETE (2025-11-15)
**Priority**: Medium
**Effort**: Trivial (10-15 min) - Actual: 15 min
**Type**: Defensive Programming / Validation

## Context

From code review on 2025-11-15: The `calculateOverallQuality` method in QualityMetrics doesn't validate that weight parameters sum to 1.0, which could lead to incorrect quality scores.

**File**: `src/semantic/maintenance/QualityMetrics.ts:353`

## Current Implementation

```typescript
async calculateOverallQuality(config: QualityConfig = {}): Promise<OverallQuality> {
  const weights = {
    embeddingQuality: config.weights?.embeddingQuality ?? 0.4,  // ❌ No validation
    relationshipQuality: config.weights?.relationshipQuality ?? 0.4,
    orphanPenalty: config.weights?.orphanPenalty ?? 0.2,
  }
  // ...
}
```

## Problem

- Weights could sum to != 1.0, giving incorrect scores
- No feedback to caller about invalid configuration
- Silent miscalculation could mislead quality monitoring

## Acceptance Criteria

- [x] Validate weights sum to approximately 1.0 (within tolerance)
- [x] Throw descriptive error if validation fails
- [x] Use reasonable tolerance (e.g., 0.01) for floating point
- [x] Add test cases for invalid weight configurations
- [x] Add test case for boundary tolerance
- [x] Update JSDoc to document validation behavior

## Completion Summary

**Completed**: 2025-11-15
**Implementation**: `app/src/semantic/maintenance/QualityMetrics.ts:359-382`
**Tests**: `app/tests/unit/semantic/maintenance/QualityMetrics.test.ts:378-426`
**Test Results**: 3 new tests added, all passing (22/22 total)

**Changes Made**:
- Added weight sum validation with 0.01 tolerance
- Added non-negative weight validation
- Throws descriptive errors with exact sum value
- Added JSDoc @throws documentation
- Test coverage: invalid sum, negative weights, valid within tolerance

## Recommended Implementation

```typescript
async calculateOverallQuality(config: QualityConfig = {}): Promise<OverallQuality> {
  // Validate weights sum to approximately 1.0
  if (config.weights) {
    const sum =
      (config.weights.embeddingQuality ?? 0) +
      (config.weights.relationshipQuality ?? 0) +
      (config.weights.orphanPenalty ?? 0)

    const tolerance = 0.01
    if (Math.abs(sum - 1.0) > tolerance) {
      throw new Error(
        `Quality weights must sum to 1.0 (within ${tolerance}), got ${sum.toFixed(3)}`
      )
    }

    // Additional validation: all weights should be >= 0
    if (
      (config.weights.embeddingQuality ?? 0) < 0 ||
      (config.weights.relationshipQuality ?? 0) < 0 ||
      (config.weights.orphanPenalty ?? 0) < 0
    ) {
      throw new Error('Quality weights must be non-negative')
    }
  }

  const weights = {
    embeddingQuality: config.weights?.embeddingQuality ?? 0.4,
    relationshipQuality: config.weights?.relationshipQuality ?? 0.4,
    orphanPenalty: config.weights?.orphanPenalty ?? 0.2,
  }
  // ...
}
```

## Test Cases to Add

```typescript
it('should reject weights that do not sum to 1.0', async () => {
  await expect(
    metrics.calculateOverallQuality({
      weights: {
        embeddingQuality: 0.5,
        relationshipQuality: 0.3,
        orphanPenalty: 0.1, // Sum = 0.9
      }
    })
  ).rejects.toThrow('must sum to 1.0')
})

it('should reject negative weights', async () => {
  await expect(
    metrics.calculateOverallQuality({
      weights: {
        embeddingQuality: 1.2,
        relationshipQuality: -0.2,
        orphanPenalty: 0.0,
      }
    })
  ).rejects.toThrow('must be non-negative')
})

it('should accept weights within tolerance', async () => {
  // Sum = 1.001, within 0.01 tolerance
  const result = await metrics.calculateOverallQuality({
    weights: {
      embeddingQuality: 0.334,
      relationshipQuality: 0.333,
      orphanPenalty: 0.334,
    }
  })
  expect(result.overallScore).toBeGreaterThanOrEqual(0)
})
```

## Dependencies

- None

## Related

- Consider similar validation for other weighted scoring systems
- Part of broader input validation improvements

## Effort Justification

- Trivial: 10-15 minutes
  - 5 min: Add validation logic
  - 5 min: Add test cases
  - 5 min: Update documentation
