# Delivery Strategies

## Purpose
This document outlines various delivery strategies and when to use each approach for optimal results.

## Classification
- **Domain:** Process
- **Stability:** Stable
- **Abstraction:** Strategic
- **Confidence:** Established

## Content

### Strategy Selection

Choose the appropriate delivery strategy based on:
- Risk tolerance
- System complexity
- User impact
- Rollback capabilities

### Phased Delivery

#### Description
[Describe the phased delivery strategy]

#### When to Use
[Describe when to use phased delivery]

#### Process
1. [Step 1]
2. [Step 2]
3. [Step 3]

#### Benefits
- [Benefit 1]
- [Benefit 2]
- [Benefit 3]

#### Challenges
- [Challenge 1]
- [Challenge 2]
- [Challenge 3]

### Full Delivery

#### Description
[Describe the full delivery strategy]

#### When to Use
[Describe when to use full delivery]

#### Process
1. [Step 1]
2. [Step 2]
3. [Step 3]

#### Benefits
- [Benefit 1]
- [Benefit 2]
- [Benefit 3]

#### Challenges
- [Challenge 1]
- [Challenge 2]
- [Challenge 3]

### Canary Delivery

#### Description
[Describe the canary delivery strategy]

#### When to Use
[Describe when to use canary delivery]

#### Process
1. [Step 1]
2. [Step 2]
3. [Step 3]

#### Benefits
- [Benefit 1]
- [Benefit 2]
- [Benefit 3]

#### Challenges
- [Challenge 1]
- [Challenge 2]
- [Challenge 3]

### Blue-Green Delivery

#### Description
Deploy to a parallel production environment and switch traffic

#### When to Use
- Zero-downtime requirements
- Complex deployments
- High-risk changes

#### Process
1. Deploy to inactive environment
2. Validate deployment
3. Switch traffic to new environment
4. Keep old environment as fallback

#### Benefits
- Instant rollback capability
- No downtime during deployment
- Full validation before switch

#### Challenges
- Requires duplicate infrastructure
- Database synchronization complexity
- Higher resource costs

### Strategy Comparison

| Strategy | Risk Level | Complexity | Rollback Speed | Best For |
|----------|------------|------------|----------------|----------|
| Phased | Low | Medium | Medium | Large user bases |
| Full | High | Low | Slow | Small systems |
| Canary | Low | High | Fast | Critical systems |
| Blue-Green | Very Low | High | Instant | Zero-downtime needs |

## Relationships
- **Parent Node:** [[delivery/index]]
- **Related Nodes:**
  - [[delivery/preparation]] - influences - Strategy influences preparation
  - [[delivery/rollback]] - determines - Strategy determines rollback approach
  - [[delivery/environments]] - requires - Strategies require specific environments

## Navigation Guidance
- **Access Context:** Use when selecting delivery approach
- **Common Next Steps:** Move to [[delivery/preparation]] after strategy selection
- **Related Tasks:** Strategy selection, risk assessment, planning
- **Update Patterns:** Update when new strategies are developed

## Metadata
- **Created:** 5/16/2025
- **Last Updated:** 5/16/2025
- **Updated By:** Context Network Update

## Change History
- 5/16/2025: Extracted from original delivery.md