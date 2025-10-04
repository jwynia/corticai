# Ready Tasks

Tasks that have been groomed and are ready for implementation.

## Critical Priority - Security Fixes
<!-- ✅ Previously listed here but completed and moved to completed.md:
     SEC-005 - Fix ReDoS Vulnerability (PR #7 merged 2025-09-25)
     SEC-008 - Fix Non-Awaited Async Operations (PR #8 merged 2025-09-25) -->

## High Priority - Core Architecture & Foundation
<!-- ✅ Previously listed here but completed and moved to completed.md:
     BUG-001 - Fix Incorrect Total Count (PR #9 merged 2025-09-25)
     TEST-001 - Define Testing Strategy and Standards (moved to in-progress 2025-01-22)
     DOC-002-8 - Create Form Engine Specification (PR #11 merged 2025-09-26)
     DOC-002-9 - Create Event Engine Specification (PR #12 merged 2025-09-26)
     DOC-008 - Create PostgreSQL Migration Guide (PR #13 merged 2025-09-26)
     INFRA-003 - Database Schema Foundation (PR #23 merged 2025-09-27) -->
<!-- 🔄 TEST-002 - Separate Integration Tests from CI Suite (MOVED TO IN-REVIEW 2025-10-01) -->
<!-- ⚠️ IMPL-003 - Authentication and Authorization System (ARCHIVED 2025-10-02 - decomposed into IMPL-003-1 through IMPL-003-7) -->
<!-- ✅ AUTH-004 - Passkey (WebAuthn) Authentication Implementation (DISCOVERED COMPLETED 2025-09-26) -->
<!-- ⚠️ AUTH-005 - Hybrid Authentication User Experience (SUPERSEDED 2025-10-01 by WEB-007 series) -->
<!-- ⚠️ AUTH-002 - Magic Link Authentication (ARCHIVED 2025-10-01 - decomposed into AUTH-002-1 through AUTH-002-4) -->

### Authentication and Authorization System (decomposed from IMPL-003)
<!-- ✅ ALL IMPL-003 subtasks COMPLETED 2025-10-02 (PRs #27-34) - moved to completed.md -->
- [INFRA-004](../tasks/INFRA-004.md) - Create Development Workflow Automation
- [INFRA-005](../tasks/INFRA-005.md) - Fix ESLint Configuration for TypeScript Monorepo
- [ERROR-001](../tasks/ERROR-001.md) - Add Comprehensive Error Handling for Database Operations
<!-- ✅ SEC-006 - Improve Type Safety in WebSocket Authentication (DISCOVERED COMPLETED 2025-09-26) -->
- [PERF-002](../tasks/PERF-002.md) - Add Event Store Indexing and Cleanup

### Passwordless Authentication - Magic Link (decomposed from AUTH-002)
- [AUTH-002-1](../tasks/AUTH-002-1.md) - Magic Link Token Infrastructure
- [AUTH-002-2](../tasks/AUTH-002-2.md) - Email Delivery and Templates
- [AUTH-002-3](../tasks/AUTH-002-3.md) - Magic Link Verification and Rate Limiting
- [AUTH-002-4](../tasks/AUTH-002-4.md) - Cleanup, Logging, and User Experience

### Web Front-End - Form Designer (decomposed from WEB-005)
<!-- ✅ WEB-005-1 - Form Designer API Foundation (COMPLETED 2025-09-30, PR #25) -->
- [WEB-005-2](../tasks/WEB-005-2.md) - Field Palette Component
- [WEB-005-3](../tasks/WEB-005-3.md) - Form Canvas and Field Management
- [WEB-005-4](../tasks/WEB-005-4.md) - Property Panel and Field Configuration
- [WEB-005-5](../tasks/WEB-005-5.md) - Conditional Logic Editor
- [WEB-005-6](../tasks/WEB-005-6.md) - Form Preview Mode
- [WEB-005-7](../tasks/WEB-005-7.md) - Undo/Redo System
- [WEB-005-8](../tasks/WEB-005-8.md) - Form Templates Library

### Web Front-End - Authentication (decomposed from WEB-007)
<!-- 🔄 WEB-007-1 - Authentication Context and Device Detection (COMPLETED 2025-10-01, PR #26) -->
<!-- ✅ WEB-007-2 - Device Capability Detection Service (COMPLETED 2025-09-30, PR #24) -->
- [WEB-007-3](../tasks/WEB-007-3.md) - Passkey Authentication Flow
- [WEB-007-4](../tasks/WEB-007-4.md) - Magic Link Authentication Flow
- [WEB-007-5](../tasks/WEB-007-5.md) - Password Authentication Flow
- [WEB-007-6](../tasks/WEB-007-6.md) - Account Management Interface
- [WEB-007-7](../tasks/WEB-007-7.md) - Security Settings and Auth Methods
- [WEB-007-8](../tasks/WEB-007-8.md) - Multi-Factor Authentication UI
- [WEB-007-9](../tasks/WEB-007-9.md) - Replace Mock Authentication with Real API Integration

## Medium Priority - Production Readiness & Performance
- [INFRA-006](../tasks/INFRA-006.md) - Fix Database Migration and Setup (BLOCKED by TEST-002)
- [SEC-011](../tasks/SEC-011.md) - Implement Secure Authentication State Storage
- [PERF-004](../tasks/PERF-004.md) - Implement Adaptive Event Batching
- [REFACTOR-004](../tasks/REFACTOR-004.md) - Add Structured Logging and Monitoring
- [PROC-001](../tasks/PROC-001.md) - Implement TDD Process Standards
- [IMPL-005](../tasks/IMPL-005.md) - Replace Mock Database Functions (for production)
- [SEC-007](../tasks/SEC-007.md) - Implement Structured Logging for WebSocket Auth
- [SEC-009](../tasks/SEC-009.md) - Implement Proper Token Revocation Storage
- [SEC-010](../tasks/SEC-010.md) - Implement getActiveSubscriptions Method
- [REFACTOR-003](../tasks/REFACTOR-003.md) - Extract Field Type Validators from Large Switch Statement
- [DOC-003-2](../tasks/DOC-003-2.md) - JSONB Schema Patterns and Validation
- [DOC-004-2](../tasks/DOC-004-2.md) - GraphQL Schema and Resolvers
- [DOC-004-3](../tasks/DOC-004-3.md) - WebSocket Real-time Communication
- [REFACTOR-002](../tasks/REFACTOR-002.md) - Split Authentication Middleware into Focused Functions
- [QUALITY-001](../tasks/QUALITY-001.md) - Standardize Error Handling Patterns Across API

### Web Front-End - Dashboard (decomposed from WEB-006)
- [WEB-006-1](../tasks/WEB-006-1.md) - Dashboard Layout Foundation
- [WEB-006-2](../tasks/WEB-006-2.md) - Widget Framework and Wrapper
- [WEB-006-3](../tasks/WEB-006-3.md) - Chart Widget Implementation
- [WEB-006-4](../tasks/WEB-006-4.md) - Metric and Progress Widgets
- [WEB-006-5](../tasks/WEB-006-5.md) - Table and List Widgets
- [WEB-006-6](../tasks/WEB-006-6.md) - Data Source Configuration
- [WEB-006-7](../tasks/WEB-006-7.md) - Real-time Widget Updates
- [WEB-006-8](../tasks/WEB-006-8.md) - Dashboard Templates

## Low Priority - Enhancements & Code Quality
- [REFACTOR-006](../tasks/REFACTOR-006.md) - Clean Up ESLint Inline Disables in Auth Provider
- [QUALITY-002](../tasks/QUALITY-002.md) - Extract Magic Numbers to Named Constants in Auth Provider
- [REFACTOR-005](../tasks/REFACTOR-005.md) - Strengthen Event Payload Type Safety
- [STYLE-001](../tasks/STYLE-001.md) - Standardize Error Messages Across Validation Engine
- [SEC-002](../tasks/SEC-002.md) - Fix JWT Token Verification (non-critical in dev)
- [FEAT-001](../tasks/FEAT-001.md) - Create Task Auto-ID Generator
- [PERF-001](../tasks/PERF-001.md) - Implement Cache Cleanup for Rate Limiter
- [REFACTOR-001](../tasks/REFACTOR-001.md) - Consolidate Phase 2 Task Specifications

## Navigation
- [Back to Status Index](../index.md)
- [Planned Tasks](./planned.md)
- [In Progress Tasks](./in-progress.md)
- [Start Implementation](/implement)

## Selection Criteria
Tasks are ready when they have:
- Clear acceptance criteria
- Effort estimation
- No blocking dependencies
- Technical approach defined
- Testing strategy documented

---
*Last Updated: 2025-10-02 (sync applied)*
*Last Groomed: 2025-10-02*
*Total Ready Tasks: 59 (11 tasks completed and moved to completed.md)*