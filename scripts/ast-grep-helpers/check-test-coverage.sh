#!/bin/bash
# Find public methods without corresponding tests

echo "=== Checking Test Coverage Patterns ==="
echo ""

cd /workspaces/corticai/app || exit 1

echo "## Public Methods in Source Code:"
echo "---------------------------------"

# Find all public methods
PUBLIC_METHODS=$(ast-grep run --pattern 'public $METHOD($$$)' --lang typescript src/ 2>/dev/null | grep -o 'public [^(]*' | sed 's/public //' | sort -u)

if [ -z "$PUBLIC_METHODS" ]; then
  echo "No public methods found or ast-grep pattern needs adjustment"
else
  echo "Found $(echo "$PUBLIC_METHODS" | wc -l) public methods"
  echo ""
  
  echo "## Checking Test Coverage:"
  echo "-------------------------"
  
  TESTED=0
  UNTESTED=0
  UNTESTED_METHODS=""
  
  for method in $PUBLIC_METHODS; do
    # Check if method is referenced in tests
    if rg "\b$method\b" tests/ --type ts -q 2>/dev/null; then
      TESTED=$((TESTED + 1))
      echo "✓ $method - has tests"
    else
      UNTESTED=$((UNTESTED + 1))
      UNTESTED_METHODS="$UNTESTED_METHODS\n  ✗ $method"
    fi
  done
  
  echo ""
  echo "## Summary:"
  echo "----------"
  echo "Total public methods: $(echo "$PUBLIC_METHODS" | wc -l)"
  echo "Methods with tests: $TESTED"
  echo "Methods without tests: $UNTESTED"
  echo "Coverage rate: $(( TESTED * 100 / (TESTED + UNTESTED) ))%"
  
  if [ $UNTESTED -gt 0 ]; then
    echo ""
    echo "## Untested Methods:"
    echo "-------------------"
    echo -e "$UNTESTED_METHODS"
  fi
fi

echo ""
echo "## Test Suites Overview:"
echo "-----------------------"

# Count test suites and test cases
SUITES=$(ast-grep run --pattern 'describe($DESC, $$$)' --lang typescript tests/ 2>/dev/null | wc -l)
TESTS=$(ast-grep run --pattern 'it($DESC, $$$)' --lang typescript tests/ 2>/dev/null | wc -l)

echo "Test suites: $SUITES"
echo "Test cases: $TESTS"

echo ""
echo "## Test Files Missing Cleanup:"
echo "-----------------------------"

for test_file in tests/**/*.test.ts; do
  if [ -f "$test_file" ]; then
    # Check for afterEach or afterAll cleanup
    if ! ast-grep run --pattern 'afterEach($$$)' --lang typescript "$test_file" > /dev/null 2>&1 && \
       ! ast-grep run --pattern 'afterAll($$$)' --lang typescript "$test_file" > /dev/null 2>&1; then
      echo "  ⚠ $(basename "$test_file") - No cleanup hooks"
    fi
  fi
done

echo ""
echo "## Quick Actions:"
echo "----------------"
echo "To generate test stubs for untested methods:"
echo "  ast-grep run --pattern 'public \$METHOD(\$\$\$)' --lang typescript src/ | generate-test-stubs"
echo ""
echo "To find methods with complex logic needing more tests:"
echo "  ast-grep run --pattern 'if (\$\$\$) { \$\$\$ if (\$\$\$) { \$\$\$ } }' --lang typescript src/"