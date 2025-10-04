# Research: Passkey Auth + Email Magic Link Authentication for Platform

## Purpose
This research investigates implementing passwordless authentication for the Pliers platform using passkeys (WebAuthn/FIDO2) and email magic links as alternatives to traditional passwords, evaluating security, user experience, and implementation requirements.

## Classification
- **Domain:** Authentication/Security
- **Stability:** Dynamic - evolving technology landscape
- **Abstraction:** Structural - synthesized findings across multiple approaches
- **Confidence:** High - strong consensus from authoritative sources

## Research Scope
- **Core Topic:** Passkey authentication + email magic link implementation
- **Research Depth:** Comprehensive - covering technical, security, and UX aspects
- **Time Period Covered:** Current state as of 2024-2025
- **Geographic Scope:** Global standards and implementations

## Key Questions Addressed

1. **What are the core technical components of WebAuthn/FIDO2 passkeys?**
   - Finding: FIDO2 = WebAuthn API + CTAP (Client to Authenticator Protocol)
   - Confidence: High

2. **How do passkeys compare to passwords in security and UX?**
   - Finding: Significantly more secure (phishing-resistant, no shared secrets) with better UX
   - Confidence: High

3. **What is the current adoption rate of passkeys in 2024?**
   - Finding: Doubled in 2024, 15+ billion accounts support passkeys, 20% of top 100 websites
   - Confidence: High

4. **What are implementation requirements for magic link authentication?**
   - Finding: Token generation, secure email delivery, time-limited URLs, verification endpoints
   - Confidence: High

5. **What are the security vulnerabilities of magic links?**
   - Finding: Email account compromise, MITM attacks, open redirects, token interception
   - Confidence: High

## Executive Summary

**Passkeys represent the future of authentication** with strong industry backing from major platforms (Apple, Google, Microsoft) and growing adoption (550% increase in 2024). They offer superior security through cryptographic key pairs and eliminate password-related vulnerabilities.

**Magic links provide a user-friendly passwordless alternative** but come with security trade-offs, primarily dependence on email security. They're easier to implement than passkeys but less secure.

**For the Pliers platform:** A hybrid approach implementing both methods would provide optimal coverage - passkeys for security-conscious users and modern devices, magic links for broader compatibility and easier onboarding.

## Methodology
- Research tool: Research MCP Server (Tavily + Brave Search)
- Number of queries: 10 comprehensive queries
- Sources evaluated: 50+ authoritative sources
- Time period: December 2025

## Navigation
- **Detailed Findings:** [[Research/passwordless-auth-passkeys-magic-links/findings]]
- **Source Analysis:** [[Research/passwordless-auth-passkeys-magic-links/sources]]
- **Implementation Guide:** [[Research/passwordless-auth-passkeys-magic-links/implementation]]
- **Open Questions:** [[Research/passwordless-auth-passkeys-magic-links/gaps]]