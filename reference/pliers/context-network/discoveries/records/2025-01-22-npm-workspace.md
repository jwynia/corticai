# Discovery: npm workspaces require * not workspace:* for local packages

## Context
**Task:** INFRA-001 - Setting up monorepo structure with npm workspaces
**Date:** 2025-01-22
**Time spent:** 15 minutes debugging

## The Problem
When setting up the monorepo structure with npm workspaces, I configured package dependencies using the `workspace:*` protocol, which is standard in other package managers like pnpm and Yarn 2+.

Running `npm install` resulted in:
```
npm ERR! Unsupported URL Type "workspace:": workspace:*
```

## The Solution
npm workspaces use a simpler syntax - just `*` for workspace dependencies:

```json
// ❌ WRONG - Works in pnpm/Yarn but not npm
{
  "dependencies": {
    "@pliers/shared": "workspace:*"
  }
}

// ✅ CORRECT - npm workspace syntax
{
  "dependencies": {
    "@pliers/shared": "*"
  }
}
```

npm automatically resolves `*` to workspace packages when they exist in the monorepo.

## Why It Matters
- Anyone migrating from pnpm or Yarn workspaces will hit this
- The error message doesn't clearly indicate the fix
- Documentation often shows `workspace:*` syntax without noting it's pnpm/Yarn specific
- This saves 15+ minutes of debugging for each developer

## Failed Attempts (save others time!)
```bash
# Tried adding workspace protocol to .npmrc
echo "workspace-protocol=true" >> .npmrc
```
**Why it failed:** npm doesn't support this configuration option

```bash
# Tried using version ranges
"@pliers/shared": "^1.0.0"
```
**Why it failed:** npm looks for published packages, not local workspaces

## Keywords for Search
npm workspace protocol error, Unsupported URL Type workspace, npm monorepo dependencies, workspace:* npm error, npm workspaces vs pnpm

## Files to Update
- [x] Updated all package.json files in apps/* and packages/*
- [x] Documented in INFRA-001 task completion notes
- [x] Created this discovery record
- [ ] Consider adding to DEVELOPMENT.md troubleshooting section

## Related
- [INFRA-001 Task](../../backlog/tasks/INFRA-001.md) - Where this was discovered
- [npm workspaces docs](https://docs.npmjs.com/cli/v7/using-npm/workspaces)