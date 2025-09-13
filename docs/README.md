# Documentation Directory

This directory contains the generated documentation for the CorticAI project.

## How it Works

1. **TypeDoc Generation**: Documentation is generated from TypeScript source code in `../app/src/` using TypeDoc
2. **CI/CD Pipeline**: The GitHub Actions workflow automatically builds and copies documentation here
3. **GitHub Pages**: This directory is served by GitHub Pages with Jekyll disabled via `.nojekyll`

## Local Development

To generate documentation locally:

```bash
cd app
npm run docs:build
cp -r ./docs/* ../docs/
```

## Files

- `.nojekyll` - Disables Jekyll processing for GitHub Pages
- Generated files (HTML, CSS, JS) are created by the CI/CD pipeline and not tracked in git

## Note

The generated documentation files are not tracked in version control as they are automatically built and deployed by GitHub Actions.