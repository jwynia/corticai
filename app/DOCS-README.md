# Documentation Location

## ⚠️ All Planning, Architecture, and Process Documentation is in the Context Network

**Do not create documentation files in `/app`** - they will be hard to discover and maintain.

### Where to Find Documentation

📂 **All documentation lives here**: [`/context-network/`](../context-network/)

**Start here**: [`/context-network/discovery.md`](../context-network/discovery.md)

### Quick Links

#### Architecture & Design
- 🏗️ [Architecture Index](../context-network/architecture/index.md)
- 🚨 [Testability Issues (Critical)](../context-network/architecture/testability-issues.md)
- 📐 [System Architecture](../context-network/architecture/corticai_architecture.md)
- 💾 [Storage Layer](../context-network/architecture/storage-layer.md)

#### Development Processes
- ⚙️ [Process Index](../context-network/processes/index.md)
- ✅ [Testing Strategy](../context-network/processes/testing-strategy.md)
- 🔍 [Code Review Workflow](../context-network/processes/code-review-workflow.md)
- 🎯 [TDD Guidelines](../context-network/processes/tdd-guidelines.md)

#### Planning & Tasks
- 📝 [Groomed Backlog](../context-network/planning/groomed-backlog.md)
- 🗺️ [Roadmap](../context-network/planning/roadmap.md)
- 📋 [Backlog](../context-network/planning/backlog.md)

#### Decisions
- 📜 [Decision Index](../context-network/decisions/index.md)
- 🎯 [Decision Template](../context-network/decisions/adr_template.md)

### What Goes Where

| Documentation Type | Location | Example |
|-------------------|----------|---------|
| Architecture | `/context-network/architecture/` | System design, patterns |
| Processes | `/context-network/processes/` | Testing, code review |
| Planning | `/context-network/planning/` | Roadmap, backlog, sprints |
| Decisions | `/context-network/decisions/` | ADRs, design decisions |
| Tasks | `/context-network/tasks/` | Task tracking, discoveries |
| API Docs | `/app/docs/` | Generated API documentation only |
| README | `/app/README.md` | Project setup, getting started |

### Why the Context Network?

1. **Discoverability** - All docs in one place with navigation
2. **Relationships** - Docs can link to related content
3. **History** - Git tracks evolution of thinking
4. **Collaboration** - Team members can find and update easily
5. **AI Navigation** - Structured for LLM context understanding

### Creating New Documentation

1. **Determine type**: Architecture? Process? Planning? Decision?
2. **Navigate to appropriate folder** in `/context-network/`
3. **Create file** using relevant template if available
4. **Update index file** in that folder to make it discoverable
5. **Link from discovery.md** if it's critical

### Common Mistakes to Avoid

❌ Creating `ARCHITECTURE.md` in `/app`
❌ Creating `TESTING-GUIDE.md` in `/app`
❌ Creating planning docs in `/app`
❌ Scattered documentation across the codebase

✅ All non-code documentation goes in `/context-network/`
✅ Update index files for discoverability
✅ Link related documents

---

**Remember**: If you're writing about "how" or "why" rather than implementing code, it probably belongs in the context network.
