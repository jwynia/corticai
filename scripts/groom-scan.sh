#!/bin/bash

echo "=== Task Grooming Scanner ==="
echo "============================="
echo ""

# Phase 1: Task Inventory
echo "📋 TASK INVENTORY"
echo "-----------------"

# Check planning directory
echo "Planning Tasks:"
if [ -d "/workspaces/react-fluentui-base/context-network/planning" ]; then
    echo "  Sprint files:"
    ls -1 /workspaces/react-fluentui-base/context-network/planning/sprint-*.md 2>/dev/null | wc -l
    echo "  Backlog exists:"
    [ -f "/workspaces/react-fluentui-base/context-network/planning/backlog.md" ] && echo "  ✓" || echo "  ✗"
    echo "  Groomed backlog exists:"
    [ -f "/workspaces/react-fluentui-base/context-network/planning/groomed-backlog.md" ] && echo "  ✓" || echo "  ✗"
fi
echo ""

# Check tasks directory
echo "Task Files:"
if [ -d "/workspaces/react-fluentui-base/context-network/tasks" ]; then
    find /workspaces/react-fluentui-base/context-network/tasks -type f -name "*.md" 2>/dev/null | wc -l
    echo "  By category:"
    for dir in /workspaces/react-fluentui-base/context-network/tasks/*/; do
        if [ -d "$dir" ]; then
            dirname=$(basename "$dir")
            count=$(find "$dir" -name "*.md" 2>/dev/null | wc -l)
            [ $count -gt 0 ] && echo "    - $dirname: $count"
        fi
    done
fi
echo ""

# Check for TODO markers in code
echo "TODO Markers in Code:"
echo "  TypeScript/React files:"
grep -r "TODO:\|FIXME:\|HACK:" /workspaces/react-fluentui-base/app/src --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l
echo "  Context network files:"
grep -r "TODO:\|NEXT:\|PLANNED:" /workspaces/react-fluentui-base/context-network --include="*.md" 2>/dev/null | wc -l
echo ""

# Phase 2: Implementation Status Check
echo "🔍 IMPLEMENTATION STATUS"
echo "------------------------"

# Check component implementation
echo "Component Implementation:"
echo "  Primitives implemented:"
ls -1 /workspaces/react-fluentui-base/app/src/components/primitives/*.tsx 2>/dev/null | grep -v test | wc -l
echo "  Navigation components:"
ls -1 /workspaces/react-fluentui-base/app/src/components/navigation/*.tsx 2>/dev/null | grep -v test | wc -l
echo "  Total components:"
find /workspaces/react-fluentui-base/app/src/components -name "*.tsx" -not -path "*/tests/*" 2>/dev/null | wc -l
echo ""

# Check test coverage
echo "Test Coverage:"
echo "  Test files:"
find /workspaces/react-fluentui-base/app/src -name "*.test.tsx" -o -name "*.test.ts" 2>/dev/null | wc -l
echo "  Components with tests:"
for component in /workspaces/react-fluentui-base/app/src/components/**/*.tsx; do
    if [ -f "$component" ] && [ ! -z "$(basename $component | grep -v test)" ]; then
        testfile="${component%.tsx}.test.tsx"
        [ -f "$testfile" ] && echo -n "✓" || echo -n "✗"
    fi
done 2>/dev/null | grep -o "✓" | wc -l
echo ""

# Phase 3: Recent Activity
echo "📊 RECENT ACTIVITY"
echo "------------------"

echo "Files modified in last 24 hours:"
find /workspaces/react-fluentui-base/app/src -type f \( -name "*.tsx" -o -name "*.ts" \) -mtime -1 2>/dev/null | wc -l

echo "Files modified in last 7 days:"
find /workspaces/react-fluentui-base/app/src -type f \( -name "*.tsx" -o -name "*.ts" \) -mtime -7 2>/dev/null | wc -l

echo ""
echo "Recent commits (last 5):"
git log --oneline -5 2>/dev/null || echo "  Not a git repository"
echo ""

# Phase 4: Build and Test Status
echo "⚙️ BUILD & TEST STATUS"
echo "----------------------"

cd /workspaces/react-fluentui-base/app 2>/dev/null

# Quick build check (non-blocking)
echo "Build status:"
timeout 5 npm run build 2>&1 | grep -E "(ERROR|WARNING|Success|Failed)" | head -3 || echo "  Build check timed out (normal for large builds)"

echo ""
echo "TypeScript errors:"
npx tsc --noEmit 2>&1 | grep -E "error TS" | wc -l || echo "  0"

echo ""
echo "Linting issues:"
npm run lint 2>&1 | grep -E "(error|warning)" | wc -l || echo "  0"

echo ""

# Phase 5: Task Blockers Detection
echo "🚧 POTENTIAL BLOCKERS"
echo "--------------------"

echo "Missing dependencies:"
grep "Cannot find module\|Module not found" /workspaces/react-fluentui-base/app/src/**/*.tsx 2>/dev/null | wc -l || echo "  0"

echo "Unresolved imports:"
grep "import.*from.*['\"]\\./.*['\"]" /workspaces/react-fluentui-base/app/src/**/*.tsx 2>/dev/null | grep -v "node_modules" | xargs -I {} sh -c 'test -f {} || echo {}' 2>/dev/null | wc -l || echo "  0"

echo "Type errors in components:"
find /workspaces/react-fluentui-base/app/src/components -name "*.tsx" -exec grep -l "@ts-ignore\|@ts-expect-error\|any" {} \; 2>/dev/null | wc -l || echo "  0"

echo ""

# Phase 6: Quick Summary
echo "📈 GROOMING SUMMARY"
echo "-------------------"
total_tasks=$(find /workspaces/react-fluentui-base/context-network/tasks -name "*.md" 2>/dev/null | wc -l)
total_todos=$(grep -r "TODO:\|FIXME:" /workspaces/react-fluentui-base/app/src --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
total_components=$(find /workspaces/react-fluentui-base/app/src/components -name "*.tsx" -not -path "*/tests/*" 2>/dev/null | wc -l)
recent_activity=$(find /workspaces/react-fluentui-base/app/src -type f \( -name "*.tsx" -o -name "*.ts" \) -mtime -1 2>/dev/null | wc -l)

echo "• Task files to review: $total_tasks"
echo "• TODO markers in code: $total_todos"
echo "• Components implemented: $total_components"
echo "• Files changed today: $recent_activity"
echo ""

# Recommendations
echo "🎯 QUICK RECOMMENDATIONS"
echo "------------------------"
if [ $total_todos -gt 10 ]; then
    echo "⚠️ High number of TODOs in code - needs grooming"
fi

if [ $recent_activity -eq 0 ]; then
    echo "ℹ️ No recent activity - check if tasks are blocked"
fi

if [ ! -f "/workspaces/react-fluentui-base/context-network/planning/groomed-backlog.md" ]; then
    echo "⚠️ No groomed backlog found - needs initial grooming"
fi

echo ""
echo "============================="
echo "Scan complete. Run full /groom for detailed analysis."