#!/bin/bash
# Find all TODO and FIXME comments in the codebase

echo "=== Finding TODO/FIXME Comments ==="
echo ""

# Change to project root
cd /workspaces/corticai/app || exit 1

echo "## TODO Comments:"
echo "----------------"
# Using ripgrep for comment text (more reliable for comments)
rg "TODO:|FIXME:|HACK:|XXX:" --type ts --type tsx -n 2>/dev/null | grep -v node_modules | head -20

echo ""
echo "## Statistics:"
echo "-------------"
TODO_COUNT=$(rg "TODO:" --type ts -c 2>/dev/null | grep -v node_modules | wc -l)
FIXME_COUNT=$(rg "FIXME:" --type ts -c 2>/dev/null | grep -v node_modules | wc -l)
HACK_COUNT=$(rg "HACK:" --type ts -c 2>/dev/null | grep -v node_modules | wc -l)

echo "TODO comments: $TODO_COUNT"
echo "FIXME comments: $FIXME_COUNT"
echo "HACK comments: $HACK_COUNT"

echo ""
echo "## Files with most TODOs:"
echo "------------------------"
rg "TODO:|FIXME:" --type ts -c 2>/dev/null | grep -v node_modules | sort -t: -k2 -rn | head -5

echo ""
echo "## Quick Actions:"
echo "----------------"
echo "To see all TODOs in detail:"
echo "  rg 'TODO:' --type ts -A 2 -B 2"
echo ""
echo "To find specific types of TODOs:"
echo "  rg 'TODO:.*implement' --type ts"
echo "  rg 'TODO:.*test' --type ts"
echo "  rg 'TODO:.*optimize' --type ts"