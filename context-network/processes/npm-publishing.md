# NPM Publishing Process

## Purpose
This document describes how to publish the CorticAI package to GitHub Package Registry (GPR) using semantic-release for automatic versioning.

## Classification
- **Domain:** Process
- **Stability:** Semi-stable
- **Abstraction:** Procedural
- **Confidence:** Established

## Content

### Overview

CorticAI is published to GitHub Package Registry under the scoped package name `@jwynia/corticai`. Publishing is fully automated via semantic-release, which:
- Analyzes commit messages to determine version bumps
- Generates changelogs automatically
- Creates GitHub releases
- Publishes to GitHub Package Registry

### Distribution Architecture

See [[decisions/adr_006_npm_centric_distribution.md]] for the architectural decision about NPM distribution.

**Package Structure:**
- Main package name: `@jwynia/corticai`
- Registry: https://npm.pkg.github.com
- Entry points defined in `package.json` `exports` field
- Built artifacts published from `dist/` directory

### Commit Message Conventions

Semantic-release uses [Conventional Commits](https://www.conventionalcommits.org/) to determine version bumps:

#### Patch Release (0.0.X)
```
fix: correct query parsing for empty strings
fix(storage): handle null values in DuckDB adapter
```

#### Minor Release (0.X.0)
```
feat: add PostgreSQL storage adapter
feat(query): implement full-text search
```

#### Major Release (X.0.0)
```
feat!: redesign storage interface
fix!: remove deprecated query methods

BREAKING CHANGE: Storage.get() now returns Promise<T | undefined>
```

#### No Release (these don't trigger a release)
```
chore: update dependencies
docs: improve README
style: format code
refactor: simplify query builder
test: add unit tests for parser
ci: update workflow
```

### How Releases Work

#### Automatic Releases (Recommended)

1. **Write code with conventional commits:**
   ```bash
   git commit -m "feat: add vector similarity search"
   git commit -m "fix: handle connection timeout"
   ```

2. **Push to main branch:**
   ```bash
   git push origin main
   ```

3. **Semantic-release automatically:**
   - Analyzes all commits since last release
   - Determines appropriate version bump
   - Updates `package.json` version
   - Generates/updates `CHANGELOG.md`
   - Creates git tag and GitHub release
   - Publishes to GitHub Package Registry

#### Manual Trigger

You can also trigger a release manually via GitHub Actions:
1. Go to Actions → "Release and Publish"
2. Click "Run workflow"
3. Select the main branch
4. Click "Run workflow"

### Testing Releases

**In CI:** The workflow runs semantic-release which handles everything automatically.

**Locally:** To see what commits would trigger a release, check your commit history:
```bash
git log --oneline $(git describe --tags --abbrev=0)..HEAD
```

Look for `feat:` (minor bump), `fix:` (patch bump), or `BREAKING CHANGE` (major bump) prefixes.

### Prerequisites

#### For Automated Publishing (GitHub Actions)

No configuration needed - uses `GITHUB_TOKEN` automatically.

#### For Installing Published Packages

1. **Create GitHub Personal Access Token** with `read:packages` scope
2. **Configure `.npmrc`:**
   ```
   @jwynia:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=YOUR_TOKEN
   ```

3. **Install:**
   ```bash
   npm install @jwynia/corticai
   ```

### Installation and Usage

#### As a Dependent Package

```typescript
// Import from main entry point
import { contextAgents, contextTools } from '@jwynia/corticai';

// Or import from specific entry points
import { QueryBuilder } from '@jwynia/corticai/query';
import { DuckDBStorageAdapter } from '@jwynia/corticai/storage';
import { LocalStorageProvider } from '@jwynia/corticai/storage';
```

### Configuration Files

#### `.releaserc.json` (in app/)
Controls semantic-release behavior:
- Branch configuration (releases from `main`)
- Plugin configuration (changelog, npm, git, github)

#### `.github/workflows/publish-npm.yml`
GitHub Actions workflow that:
1. Runs on push to main
2. Runs tests
3. Builds the package
4. Runs semantic-release

### Troubleshooting

#### "No release published"
- Check commit messages follow conventional commit format
- Commits like `chore:`, `docs:`, `style:` don't trigger releases
- Use `feat:` or `fix:` prefixes to trigger releases

#### "Failed to publish - not authenticated"
- Workflow uses `GITHUB_TOKEN` which should be automatic
- Check repository has packages write permission enabled

#### "Package name too similar to existing package"
- GitHub Package Registry doesn't allow similar names
- Use the scoped package name `@jwynia/corticai`

#### "401 Unauthorized when installing"
- Ensure `.npmrc` has correct `read:packages` token
- Token may have expired, create a new one

### Monitoring Releases

#### View Published Versions
```bash
npm view @jwynia/corticai versions --registry https://npm.pkg.github.com
```

#### Check Package Contents
```bash
npm pack @jwynia/corticai
tar -tzf jwynia-corticai-X.Y.Z.tgz | head -20
```

#### View Changelog
Check `app/CHANGELOG.md` or the GitHub Releases page.

## Relationships
- **Parent Nodes:** [processes/index.md]
- **Child Nodes:** None
- **Related Nodes:**
  - [decisions/adr_006_npm_centric_distribution.md] - decision - NPM-centric architecture
  - [cross_cutting/package_export_patterns.md] - details - Export structure

## Navigation Guidance
- **Access Context:** Reference when understanding the release process
- **Common Next Steps:** Review commit conventions, check changelog
- **Related Tasks:** Writing conventional commits, monitoring releases
- **Update Patterns:** Update when release process changes

## Metadata
- **Created:** 2025-10-22
- **Last Updated:** 2025-12-13
- **Updated By:** Claude
- **Status:** Established

## Change History
- 2025-12-13: Updated to use semantic-release for automatic versioning
- 2025-10-22: Created NPM publishing process documentation for GitHub Package Registry
