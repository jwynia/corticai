# Research: Hanko Authentication Platform Compatibility with Pliers v3 Architecture

## Purpose
This research evaluates whether Hanko (https://github.com/teamhanko/hanko) would work with the Pliers v3 architecture for handling authentication in both the front-end and API layers.

## Classification
- **Domain:** Security/Authentication/Research
- **Stability:** Dynamic - research represents current understanding
- **Abstraction:** Structural - synthesized findings
- **Confidence:** High - based on detailed analysis

## Research Scope
- **Core Topic:** Hanko authentication platform integration with Pliers v3
- **Research Depth:** Comprehensive architectural analysis
- **Time Period Covered:** Current state (2025-09-23)
- **Geographic Scope:** Not applicable

## Key Questions Addressed
1. **Does Hanko's JWT implementation align with Pliers v3's JWT architecture?**
   - Finding: Yes, with some architectural adjustments needed
   - Confidence: High

2. **Can Hanko integrate with the existing API Gateway pattern?**
   - Finding: Yes, through multiple integration patterns
   - Confidence: High

3. **How would Hanko handle multi-tenant requirements?**
   - Finding: Native multi-tenant support available
   - Confidence: Medium

4. **What changes would be required for frontend integration?**
   - Finding: Minimal changes using Hanko Elements web components
   - Confidence: High

5. **Can existing security requirements be maintained?**
   - Finding: Yes, Hanko meets or exceeds current requirements
   - Confidence: High

## Executive Summary

Hanko would work well with the Pliers v3 architecture with moderate integration effort. The platform offers a modern, passkey-first authentication approach that aligns with security best practices while maintaining backward compatibility with traditional password authentication.

Key advantages include built-in WebAuthn/passkey support, privacy-first design, and flexible deployment options (self-hosted or cloud). The JWT implementation is compatible but would require configuration adjustments to match Pliers' current token structure. The API gateway integration is straightforward through multiple patterns, and the frontend can leverage Hanko's pre-built web components for rapid implementation.

The main considerations are: mapping the existing JWT claims structure, integrating session management approaches, and potentially adjusting the MFA workflow to leverage Hanko's passkey capabilities instead of traditional TOTP.

## Methodology
- Research tool: Web Search, GitHub repository analysis
- Number of queries: 5
- Sources evaluated: 10+
- Time period: 2025-09-23

## Navigation
- **Detailed Findings:** [[research/hanko-authentication/findings.md]]
- **Integration Analysis:** [[research/hanko-authentication/integration-analysis.md]]
- **Implementation Guide:** [[research/hanko-authentication/implementation.md]]
- **Architecture Comparison:** [[research/hanko-authentication/architecture-comparison.md]]
- **Open Questions:** [[research/hanko-authentication/gaps.md]]