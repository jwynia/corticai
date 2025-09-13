# GitHub Pages Deployment Configuration

## Setup Instructions

### 1. Enable GitHub Pages
1. Go to your repository settings on GitHub
2. Navigate to "Pages" in the left sidebar
3. Under "Source", select "GitHub Actions"
4. The documentation will be automatically deployed when you push to the main branch

### 2. Repository Settings
Ensure your repository has the following settings:
- Actions permissions: "Allow all actions and reusable workflows"
- Pages deployment source: "GitHub Actions"

### 3. Branch Protection (Recommended)
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Include the "build" job from the docs workflow in required status checks

### 4. Environment Variables (Optional)
If you want to customize the deployment:
- `CNAME`: Custom domain for your documentation
- `GA_TRACKING_ID`: Google Analytics tracking ID

## Manual Deployment

If you need to deploy manually:

```bash
# Build and deploy documentation
npm run docs:deploy
```

This will:
1. Clean any existing docs
2. Generate fresh documentation
3. Deploy to GitHub Pages using gh-pages

## Local Testing

To test the documentation locally:

```bash
# Generate documentation
npm run docs

# Serve documentation locally
npm run docs:serve
```

Then open http://localhost:8080 to view the documentation.

## Automatic Updates

The documentation is automatically updated when:
- Code is pushed to the main branch
- A pull request is merged into main
- JSDoc comments are added or updated
- TypeScript interfaces or types are modified

## URLs

Once deployed, your documentation will be available at:
- https://[username].github.io/[repository-name]/ (if using GitHub Pages default domain)
- https://your-custom-domain.com/ (if using custom CNAME)

## Troubleshooting

### Build Failures
- Check that all TypeScript files compile successfully
- Verify all imports are resolvable
- Review the Actions log for specific error messages

### Missing Documentation
- Ensure files are included in the `entryPoints` array in `typedoc.json`
- Add JSDoc comments to functions and classes you want documented
- Check that files are not excluded by the `exclude` patterns

### Deployment Issues
- Verify GitHub Pages is enabled in repository settings
- Check Actions permissions are set correctly
- Ensure the workflow has write permissions to the Pages environment