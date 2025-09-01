#!/bin/bash

echo "=== Context Network Sync Verification Script ==="
echo "================================================"
echo ""

# Check recent git activity
echo "📝 Recent Commits (last 10):"
git log --oneline -10
echo ""

# Check build status
echo "🔨 Build Status:"
cd /workspaces/react-fluentui-base/app
npm run build 2>&1 | tail -3
echo ""

# Check test status
echo "✅ Test Status:"
npm test 2>&1 | grep -E "(passing|failing|skipped)" | tail -3
echo ""

# Check recently modified files
echo "📂 Recently Modified Files (last 15):"
find /workspaces/react-fluentui-base/app/src -type f \( -name "*.tsx" -o -name "*.ts" \) -mtime -1 -exec ls -lt {} \; | head -15
echo ""

# Check for new components
echo "🧩 Component Status:"
echo "Primitives:"
ls -1 /workspaces/react-fluentui-base/app/src/components/primitives/*.tsx 2>/dev/null | grep -v test | wc -l
echo "Navigation:"
ls -1 /workspaces/react-fluentui-base/app/src/components/navigation/*.tsx 2>/dev/null | grep -v test | wc -l
echo ""

# Check for tech debt items
echo "⚠️ Technical Debt Files:"
find /workspaces/react-fluentui-base/context-network -name "*tech-debt*" -o -name "*refactor*" | wc -l
echo ""

# Check task status files  
echo "📋 Task Files:"
find /workspaces/react-fluentui-base/context-network/tasks -type f -name "*.md" | wc -l
echo ""

echo "================================================"
echo "Sync verification complete"