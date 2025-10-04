# Architecture Decision Record: Frontend Technology Stack

## Status
Accepted

## Context
The Whereness project needs to deliver city guide websites that serve multiple audience types (tourists, new residents, locals, search visitors) with different navigation needs and mental models. The sites must be:
- Fast-loading and SEO-friendly (static generation)
- Interactive and responsive (SPA-like features)
- Print-friendly (for offline use)
- Maintainable across multiple city subdomains

## Decision
We will use the following technology stack:

### CSS Framework: Bootstrap 5
- **Rationale**: Mature, well-documented, responsive grid system, extensive component library
- **Usage**: Primary layout and responsive components
- **Version**: 5.3.x (latest stable)

### Print Styles: Gutenberg CSS
- **Rationale**: Purpose-built for web-to-print, handles page breaks properly, multiple themes
- **Usage**: Print stylesheets with media="print"
- **Repository**: https://github.com/BafS/Gutenberg

### JavaScript: Lightweight SPA Router
- **Initial**: Vanilla JavaScript with hash-based routing
- **Enhancement**: Optional Alpine.js for reactive UI components
- **Rationale**: Minimal overhead, no build step required, progressive enhancement

### Data Layer: Static JSON
- **Structure**: Pre-generated JSON files per city
- **Files**: places.json, neighborhoods.json, categories.json, search-index.json
- **Rationale**: Enables client-side search/filter without API calls

## Consequences

### Positive
- No framework lock-in (vanilla JS base)
- Fast initial page loads (static HTML)
- Works without JavaScript (progressive enhancement)
- Print-friendly without additional work
- Easy to deploy (static files only)
- Good SEO (server-rendered content)

### Negative
- More manual work than using a full framework
- Need to maintain routing logic
- Limited to client-side state management
- Search limited to pre-indexed content

### Neutral
- Learning curve for Gutenberg CSS (print-specific)
- Bootstrap adds ~60KB CSS (but well-cached)
- Need to coordinate between static generation and SPA features

## Implementation Plan

### Phase 1: Static Foundation
1. Set up Bootstrap 5 base layout
2. Create responsive navigation structure
3. Implement Gutenberg print styles
4. Generate static HTML with all content

### Phase 2: SPA Enhancement
1. Build vanilla JS router
2. Implement JSON-powered search
3. Add persona mode switching
4. Store preferences in localStorage

### Phase 3: Advanced Features
1. Add Alpine.js for reactive components
2. Implement service worker for offline
3. Create city-specific themes
4. Add analytics and monitoring

## Alternatives Considered

### Full SPA Frameworks (React/Vue/Svelte)
- **Rejected**: Too heavy for our needs, requires build step, overkill for mostly-static content

### HTMX + Alpine.js
- **Rejected**: Requires server-side rendering, we want pure static deployment

### Tailwind CSS
- **Rejected**: Bootstrap provides more out-of-box components, better for rapid prototyping

### Custom Print Styles
- **Rejected**: Gutenberg handles edge cases we'd likely miss

## References
- Bootstrap 5 Documentation: https://getbootstrap.com/docs/5.3/
- Gutenberg CSS: https://github.com/BafS/Gutenberg
- Alpine.js: https://alpinejs.dev/
- SPA Router Patterns: https://jsdev.space/spa-vanilla-js/

## Review
- Date: 2024-11-15
- Reviewers: System Architect
- Next Review: After Phase 2 implementation