# Research: React Form Builder Frameworks with JSON Schema Support

## Purpose
This research investigates existing React form builder frameworks that create standards-based JSON form schemas for use in front-end applications. The focus is on libraries that support JSON Schema, OpenAPI schema generation, and visual form building capabilities suitable for integrating with the existing Pliers Form Engine.

## Classification
- **Domain:** Frontend/React/Form Management
- **Stability:** Dynamic - research represents current understanding as of 2025-09-23
- **Abstraction:** Structural - synthesized findings
- **Confidence:** High (82% based on multiple authoritative sources)

## Research Scope
- **Core Topic:** React form builder frameworks with JSON Schema support
- **Research Depth:** Comprehensive
- **Time Period Covered:** 2021-2025 (with focus on current state)
- **Geographic Scope:** Global open-source ecosystem

## Key Questions Addressed

1. **What are the leading React form builders supporting JSON Schema?**
   - Finding: React JSON Schema Form (RJSF), JSON Forms, Formik with schema plugins, Uniforms, and SurveyJS lead the space
   - Confidence: High

2. **How do they compare in validation and schema generation?**
   - Finding: RJSF offers most comprehensive JSON Schema support; JSON Forms provides dual schema approach; others vary in implementation
   - Confidence: High

3. **What are OpenAPI integration requirements?**
   - Finding: OpenAPI generators can produce TypeScript types; form generation requires transformation layer
   - Confidence: Medium-High

4. **Which visual form building features are essential?**
   - Finding: Drag-and-drop, real-time preview, schema validation, and conditional logic are critical
   - Confidence: High

5. **What are performance implications?**
   - Finding: Complex schemas can cause performance issues; optimization strategies needed for large forms
   - Confidence: Medium

## Executive Summary

The React ecosystem offers several mature form builder frameworks that support JSON Schema, with React JSON Schema Form (RJSF) being the most widely adopted and feature-complete solution. For Pliers' Form Engine integration, RJSF provides the strongest foundation due to its comprehensive JSON Schema Draft 2020-12 support, extensive plugin ecosystem, and active maintenance.

Key frameworks identified include:
- **RJSF (react-jsonschema-form):** Gold standard for JSON Schema forms with extensive customization
- **JSON Forms:** Dual-schema approach (data + UI schema) offering fine-grained control
- **Uniforms:** Multi-schema support including JSON Schema, GraphQL, and Zod
- **SurveyJS:** Commercial solution with excellent visual builder
- **Form.io:** Enterprise-focused with drag-and-drop builder and JSON output

## Methodology
- Research tool: Research MCP Server with Tavily, Brave, and SerpAPI providers
- Number of queries: 5 targeted research questions
- Sources evaluated: 50+ including GitHub repos, documentation, developer forums
- Time period: 2025-09-23
- Confidence threshold: 80%

## Navigation
- **Detailed Findings:** [[research/react-form-builders-json-schema/findings.md]]
- **Source Analysis:** [[research/react-form-builders-json-schema/sources.md]]
- **Implementation Guide:** [[research/react-form-builders-json-schema/implementation.md]]
- **Framework Comparison:** [[research/react-form-builders-json-schema/comparison.md]]
- **Open Questions:** [[research/react-form-builders-json-schema/gaps.md]]