#!/bin/bash
# Helper script for refactoring tasks

echo "=== Refactoring Helper ==="
echo ""

cd /workspaces/corticai/app || exit 1

show_menu() {
  echo "Select refactoring task:"
  echo "1. Find and replace Date.now() with crypto.randomUUID()"
  echo "2. Find large files that need splitting"
  echo "3. Find deeply nested code"
  echo "4. Find long methods"
  echo "5. Find duplicate patterns"
  echo "6. Remove console.log statements"
  echo "7. Add missing JSDoc comments"
  echo "8. Exit"
  echo ""
  echo -n "Enter choice [1-8]: "
}

find_date_now() {
  echo "## Finding Date.now() usage:"
  echo "--------------------------"
  ast-grep run --pattern 'Date.now()' --lang typescript src/ 2>/dev/null
  
  echo ""
  echo "To replace all instances with crypto.randomUUID():"
  echo "  ast-grep run --pattern 'Date.now()' --rewrite 'crypto.randomUUID()' --lang typescript src/"
  echo ""
  echo "Note: Review changes before committing!"
}

find_large_files() {
  echo "## Files that may need splitting:"
  echo "--------------------------------"
  
  for file in src/**/*.ts; do
    if [ -f "$file" ]; then
      lines=$(wc -l < "$file")
      if [ "$lines" -gt 500 ]; then
        echo ""
        echo "$file: $lines lines"
        
        # Show class/function count
        classes=$(ast-grep run --pattern 'class $NAME' --lang typescript "$file" 2>/dev/null | wc -l)
        functions=$(ast-grep run --pattern 'function $NAME' --lang typescript "$file" 2>/dev/null | wc -l)
        methods=$(ast-grep run --pattern 'async $NAME($$$)' --lang typescript "$file" 2>/dev/null | wc -l)
        
        echo "  Classes: $classes"
        echo "  Functions: $functions"
        echo "  Async methods: $methods"
        
        if [ "$lines" -gt 800 ]; then
          echo "  Priority: HIGH ⚠️"
        else
          echo "  Priority: Medium"
        fi
      fi
    fi
  done
}

find_nested_code() {
  echo "## Deeply nested code (3+ levels):"
  echo "---------------------------------"
  
  # Find triple-nested if statements
  ast-grep run --pattern 'if ($$$) {
    $$$
    if ($$$) {
      $$$
      if ($$$) {
        $$$
      }
    }
  }' --lang typescript src/ 2>/dev/null | head -10
  
  echo ""
  echo "Consider refactoring nested conditions into:"
  echo "  - Early returns"
  echo "  - Guard clauses"
  echo "  - Extract method"
  echo "  - Strategy pattern"
}

find_long_methods() {
  echo "## Long methods (potential refactoring targets):"
  echo "-----------------------------------------------"
  
  # This is approximate - counts lines between method start and next method/end of class
  ast-grep run --pattern 'async $METHOD($$$) {
    $$$
  }' --lang typescript src/ 2>/dev/null | \
  while IFS=: read -r file line content; do
    # Get method end line (approximate)
    method_name=$(echo "$content" | grep -o 'async [^(]*' | sed 's/async //')
    if [ ! -z "$method_name" ]; then
      end_line=$(awk "/async $method_name/,/^  \}$/" "$file" 2>/dev/null | wc -l)
      if [ "$end_line" -gt 50 ]; then
        echo "$file:$line - $method_name (~$end_line lines)"
      fi
    fi
  done | head -10
}

find_duplicates() {
  echo "## Potential duplicate patterns:"
  echo "-------------------------------"
  
  echo ""
  echo "Similar error handling patterns:"
  ast-grep run --pattern 'catch ($ERR) {
    $$$
  }' --lang typescript src/ 2>/dev/null | \
    grep -o 'catch.*{' | sort | uniq -c | sort -rn | head -5
  
  echo ""
  echo "Similar validation patterns:"
  ast-grep run --pattern 'if (!$VAR) {
    throw new $ERROR($$$)
  }' --lang typescript src/ 2>/dev/null | wc -l
  echo " validation patterns found"
  
  echo ""
  echo "To find exact duplicates, consider using:"
  echo "  jscpd src/ --min-lines 5 --min-tokens 50"
}

remove_console_logs() {
  echo "## Finding console.log statements:"
  echo "---------------------------------"
  
  LOGS=$(ast-grep run --pattern 'console.log($$$)' --lang typescript src/ 2>/dev/null)
  
  if [ -z "$LOGS" ]; then
    echo "No console.log statements found ✓"
  else
    echo "$LOGS"
    echo ""
    echo "To remove all console.log statements:"
    echo "  ast-grep run --pattern 'console.log(\$\$\$);' --rewrite '' --lang typescript src/"
    echo ""
    echo "To replace with proper logging:"
    echo "  ast-grep run --pattern 'console.log(\$MSG)' --rewrite 'logger.debug(\$MSG)' --lang typescript src/"
  fi
}

add_jsdoc() {
  echo "## Public methods missing JSDoc:"
  echo "-------------------------------"
  
  # Find public methods without preceding JSDoc
  ast-grep run --pattern 'public $METHOD($$$) {
    $$$
  }' --lang typescript src/ 2>/dev/null | \
  while IFS=: read -r file line content; do
    # Check if previous lines contain /**
    if ! head -n $((line - 1)) "$file" | tail -n 5 | grep -q '/\*\*'; then
      echo "$file:$line - $content" | head -c 80
      echo "..."
    fi
  done | head -10
  
  echo ""
  echo "To add JSDoc stubs:"
  echo "  Run 'ast-grep scan --rule require-jsdoc' for detailed report"
}

# Main menu loop
while true; do
  show_menu
  read -r choice
  
  case $choice in
    1) find_date_now ;;
    2) find_large_files ;;
    3) find_nested_code ;;
    4) find_long_methods ;;
    5) find_duplicates ;;
    6) remove_console_logs ;;
    7) add_jsdoc ;;
    8) echo "Exiting..."; exit 0 ;;
    *) echo "Invalid choice. Please try again." ;;
  esac
  
  echo ""
  echo "Press Enter to continue..."
  read -r
  clear
done