# NPM Publishing Process

## Purpose
This document describes how to publish the CorticAI package to GitHub Package Registry (GPR) and manage versions.

## Classification
- **Domain:** Process
- **Stability:** Semi-stable
- **Abstraction:** Procedural
- **Confidence:** Established

## Content

### Overview

CorticAI is published to GitHub Package Registry under the scoped package name `@corticai/corticai`. This approach provides:
- Organization-scoped packages (prevents name conflicts)
- Access control via GitHub permissions
- Integration with GitHub's package management
- Automated publishing via GitHub Actions

### Distribution Architecture

See [[decisions/adr_006_npm_centric_distribution.md]] for the architectural decision about NPM distribution.

**Package Structure:**
- Main package name: `@corticai/corticai`
- Registry: https://npm.pkg.github.com
- Entry points defined in `package.json` `exports` field
- Built artifacts published from `dist/` directory

### Prerequisites

#### For Manual Publishing

1. **GitHub Account** with access to the CorticAI repository
2. **Personal Access Token (PAT)** created on GitHub with:
   - `read:packages` scope (to install packages)
   - `write:packages` scope (to publish packages)
   - `repo` scope (for release management)

3. **Local Configuration:**
   - Node.js 20+ installed
   - `.npmrc` configured with GitHub token

#### For Automated Publishing (GitHub Actions)

1. **Repository secrets** configured (handled by GitHub automatically)
2. **Workflow file** present at `.github/workflows/publish-npm.yml`
3. **GitHub token** available (provided by GitHub Actions automatically)

### Publishing Methods

#### Method 1: Automated Publishing (Recommended)

**Trigger:** Create a GitHub release

**Process:**
1. Determine new version number following semver
2. Update `app/package.json` version field
3. Commit changes: `git commit -m "chore: bump version to X.Y.Z"`
4. Create git tag: `git tag vX.Y.Z`
5. Push to GitHub: `git push origin main --tags`
6. Create GitHub Release matching the tag
   - Go to Releases → Draft a new release
   - Select the tag you created
   - Add release notes describing changes
   - Publish the release
7. GitHub Actions automatically:
   - Checks out code
   - Installs dependencies
   - Runs tests
   - Builds the package
   - Publishes to GitHub Package Registry

**Advantages:**
- Automated, consistent process
- Tests run before publishing (safety gate)
- Release notes tied to package version
- No local configuration needed (uses GITHUB_TOKEN)

**Workflow Location:** `.github/workflows/publish-npm.yml`

#### Method 2: Manual Publishing

**Prerequisites:**
1. GitHub Personal Access Token (PAT) with `write:packages` scope
2. Configure local `.npmrc` in `app/` directory:
   ```
   @corticai:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=YOUR_TOKEN_HERE
   ```

**Process:**
1. Update version in `app/package.json`
2. From the `app/` directory:
   ```bash
   npm install
   npm test
   npm run build
   npm publish
   ```

**Disadvantages:**
- Requires local GitHub token
- No automated testing gate
- Manual version management
- Requires credentials on local machine

### Installation and Usage

#### As a Dependent Package

To use `@corticai/corticai` in another project:

1. **Create or use existing GitHub Personal Access Token** with `read:packages` scope
2. **Configure `.npmrc` in your project root:**
   ```
   @corticai:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=YOUR_TOKEN
   ```

3. **Install the package:**
   ```bash
   npm install @corticai/corticai
   ```

4. **Import from CorticAI:**
   ```typescript
   // Import from main entry point
   import { contextAgents, contextTools } from '@corticai/corticai';

   // Or import from specific entry points
   import { QueryBuilder } from '@corticai/corticai/query';
   import { StorageAdapter } from '@corticai/corticai/storage';
   ```

### Version Management

#### Semantic Versioning

CorticAI follows semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking API changes
  - Example: Removing an exported function, changing function signature
  - Increment: 1.0.0 → 2.0.0

- **MINOR**: New features, backward compatible
  - Example: Adding new agents, tools, or storage adapters
  - Increment: 1.0.0 → 1.1.0

- **PATCH**: Bug fixes, backward compatible
  - Example: Fixing a bug in query logic, improving performance
  - Increment: 1.0.0 → 1.0.1

#### Version Consistency

All packages in the monorepo must maintain consistent versioning:
- Main package version: `app/package.json`
- This is the source of truth for all releases

### Setting Up Local GitHub Token

For manual publishing or private package installation:

1. **Create GitHub Personal Access Token:**
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Create new token with:
     - `read:packages` (to install private packages)
     - `write:packages` (to publish packages)
   - Copy the token (you won't see it again)

2. **Configure for your machine:**
   ```bash
   # Set as environment variable (temporary)
   export NPM_TOKEN=your_token_here

   # Or add to ~/.npmrc (permanent, be careful with permissions)
   echo "//npm.pkg.github.com/:_authToken=your_token_here" >> ~/.npmrc
   chmod 600 ~/.npmrc
   ```

3. **Test the configuration:**
   ```bash
   npm login --registry https://npm.pkg.github.com --scope @corticai
   ```

### Troubleshooting

#### "Failed to publish - not authenticated"
- Verify GitHub token has `write:packages` scope
- Check `.npmrc` configuration has correct registry and token
- Verify token is not expired

#### "Package name too similar to existing package"
- GitHub Package Registry doesn't allow similar names across organizations
- Use the scoped package name `@corticai/corticai`

#### "401 Unauthorized when installing"
- Ensure `.npmrc` has correct `read:packages` token
- Token may have expired, create a new one

#### "Cannot find module '@corticai/corticai' when importing"
- Check package is installed: `npm list @corticai/corticai`
- Verify TypeScript/build is using correct entry points
- Ensure `.npmrc` is configured for `@corticai` scope

### CI/CD Integration

#### GitHub Actions Workflow

The automated publishing workflow:
1. **Triggered on:** GitHub releases (publish event)
2. **Or manually:** Via workflow_dispatch input
3. **Steps:**
   - Checkout code
   - Setup Node.js with GitHub registry authentication
   - Install dependencies
   - Run tests (gates publishing on test success)
   - Build the package
   - Publish to GitHub Package Registry
   - Optionally attach dist/ to release assets

#### Workflow File
Location: `.github/workflows/publish-npm.yml`

See the file for complete workflow details.

### Monitoring and Verification

#### Verify Published Package

After publishing, verify the package is available:

```bash
# List package versions in GitHub Package Registry
npm view @corticai/corticai versions --registry https://npm.pkg.github.com

# Install the newly published version
npm install @corticai/corticai@latest
```

#### Check Package Contents

Ensure the package contains expected files:

```bash
# View package contents
npm pack @corticai/corticai

# Extract and inspect the tarball
tar -tzf corticai-corticai-X.Y.Z.tgz | head -20
```

### Common Issues and Solutions

#### Issue: Multiple exports not working
**Solution:** Verify all exports in `package.json` have corresponding built files:
```json
"exports": {
  ".": "./dist/index.js",
  "./context": "./dist/context/index.js"
}
```
Ensure `npm run build` creates these files before publishing.

#### Issue: Package installation fails with 404
**Solution:** Verify:
1. You have GitHub token with `read:packages` scope
2. `.npmrc` points to https://npm.pkg.github.com
3. Repository is set to allow package access (Settings → Packages)

#### Issue: Tests fail in GitHub Actions but pass locally
**Solution:**
1. Check Node.js version (workflow uses 20, ensure local matches)
2. Verify all dependencies are installed
3. Check for environment-specific issues (Windows vs Linux)

## Relationships
- **Parent Nodes:** [processes/index.md]
- **Child Nodes:** None
- **Related Nodes:**
  - [decisions/adr_006_npm_centric_distribution.md] - decision - NPM-centric architecture
  - [cross_cutting/package_export_patterns.md] - details - Export structure
  - [cross_cutting/wrapper_architecture_guide.md] - guides - Wrapper patterns

## Navigation Guidance
- **Access Context:** Reference when publishing new versions or setting up local development
- **Common Next Steps:** Review export patterns, understand wrapper architecture
- **Related Tasks:** Version management, CI/CD setup, package maintenance
- **Update Patterns:** Update when publishing process changes or new issues are discovered

## Metadata
- **Created:** 2025-10-22
- **Last Updated:** 2025-10-22
- **Updated By:** Claude
- **Status:** Established

## Change History
- 2025-10-22: Created NPM publishing process documentation for GitHub Package Registry
