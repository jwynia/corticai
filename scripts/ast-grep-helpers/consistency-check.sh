#!/bin/bash
# Check code consistency across the project

echo "=== Code Consistency Check ==="
echo ""

cd /workspaces/corticai/app || exit 1

echo "## Storage Adapter Compliance:"
echo "------------------------------"

# Find all storage adapters
ADAPTERS=$(ast-grep run --pattern 'class $NAME extends BaseStorageAdapter' --lang typescript -l 2>/dev/null)

if [ -z "$ADAPTERS" ]; then
  echo "No storage adapters found"
else
  for adapter in $ADAPTERS; do
    echo ""
    echo "Checking: $(basename "$adapter")"
    
    # Required methods
    REQUIRED_METHODS=("set" "get" "delete" "query" "clear" "exists" "keys")
    
    for method in "${REQUIRED_METHODS[@]}"; do
      if ast-grep run --pattern "async $method(" --lang typescript "$adapter" > /dev/null 2>&1; then
        echo "  ✓ $method() implemented"
      else
        echo "  ✗ $method() MISSING"
      fi
    done
  done
fi

echo ""
echo "## Error Handling Patterns:"
echo "--------------------------"

# Check for consistent error types
echo "Error types used:"
ast-grep run --pattern 'throw new $ERROR($$$)' --lang typescript src/ 2>/dev/null | \
  grep -o 'new [A-Za-z]*Error' | sort | uniq -c | sort -rn

echo ""
echo "## Async Functions Without Try-Catch:"
echo "------------------------------------"

ASYNC_NO_TRY=$(ast-grep run --pattern 'async $FUNC($$$) {
  $$$
}' --lang typescript src/ 2>/dev/null | \
  while read -r line; do
    file=$(echo "$line" | cut -d: -f1)
    if ! grep -A 10 "$line" "$file" 2>/dev/null | grep -q "try\|catch"; then
      echo "$line"
    fi
  done | head -10)

if [ -z "$ASYNC_NO_TRY" ]; then
  echo "All async functions have error handling ✓"
else
  echo "$ASYNC_NO_TRY"
fi

echo ""
echo "## Import Consistency:"
echo "--------------------"

# Check for different import styles
echo "Import styles found:"
echo "  ES6 imports: $(grep -c "^import .* from" src/**/*.ts 2>/dev/null | paste -sd+ | bc)"
echo "  Require statements: $(grep -c "require(" src/**/*.ts 2>/dev/null | paste -sd+ | bc)"

echo ""
echo "## Naming Convention Check:"
echo "--------------------------"

# Check for inconsistent class naming
echo "Class naming patterns:"
ast-grep run --pattern 'class $NAME' --lang typescript src/ 2>/dev/null | \
  grep -o 'class [A-Za-z]*' | sed 's/class //' | \
  while read -r name; do
    if [[ ! "$name" =~ ^[A-Z][a-zA-Z0-9]*$ ]]; then
      echo "  ⚠ $name - doesn't follow PascalCase"
    fi
  done

# Check for inconsistent interface naming
echo ""
echo "Interface naming patterns:"
ast-grep run --pattern 'interface $NAME' --lang typescript src/ 2>/dev/null | \
  grep -o 'interface [A-Za-z]*' | sed 's/interface //' | \
  while read -r name; do
    if [[ ! "$name" =~ ^[A-Z][a-zA-Z0-9]*$ ]]; then
      echo "  ⚠ $name - doesn't follow PascalCase"
    fi
  done

echo ""
echo "## File Size Analysis:"
echo "--------------------"

# Find large files that might need splitting
echo "Files over 500 lines:"
find src -name "*.ts" -exec wc -l {} \; 2>/dev/null | \
  while read -r lines file; do
    if [ "$lines" -gt 500 ]; then
      echo "  $file: $lines lines"
    fi
  done | sort -rn -k2

echo ""
echo "## Potential Issues:"
echo "-------------------"

# Check for console.log statements
CONSOLE_LOGS=$(ast-grep run --pattern 'console.log($$$)' --lang typescript src/ 2>/dev/null | wc -l)
if [ "$CONSOLE_LOGS" -gt 0 ]; then
  echo "  ⚠ Found $CONSOLE_LOGS console.log statements in source"
fi

# Check for Date.now() usage
DATE_NOW=$(ast-grep run --pattern 'Date.now()' --lang typescript src/ 2>/dev/null | wc -l)
if [ "$DATE_NOW" -gt 0 ]; then
  echo "  ⚠ Found $DATE_NOW Date.now() usages (consider crypto.randomUUID())"
fi

# Check for any TypeScript errors
echo ""
echo "## TypeScript Compilation:"
echo "------------------------"
if npx tsc --noEmit 2>&1 | grep -q "error"; then
  echo "  ✗ TypeScript compilation errors found"
  npx tsc --noEmit 2>&1 | grep "error" | head -5
else
  echo "  ✓ TypeScript compilation successful"
fi

echo ""
echo "## Quick Actions:"
echo "----------------"
echo "To auto-fix some issues:"
echo "  ast-grep scan --fix"
echo ""
echo "To run project-specific rules:"
echo "  ast-grep scan --rule storage-adapter-compliance"
echo "  ast-grep scan --rule async-error-handling"
echo "  ast-grep scan --rule require-jsdoc"