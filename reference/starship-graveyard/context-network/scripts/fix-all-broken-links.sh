#!/bin/bash
# fix-all-broken-links.sh - Comprehensive broken link cleanup

echo "Starting comprehensive broken link cleanup..."

# First, get a list of all files with broken links
FILES_WITH_BROKEN=$(./check_links_better.sh 2>/dev/null | grep "^BROKEN:" | cut -d':' -f2 | cut -d':' -f1 | sort -u)

TOTAL_FILES=$(echo "$FILES_WITH_BROKEN" | wc -l)
echo "Found $TOTAL_FILES files with broken links"

# Counter for progress
CURRENT=0

# Process each file
echo "$FILES_WITH_BROKEN" | while read FILE; do
    FILE=$(echo $FILE | sed 's/^[ \t]*//')
    CURRENT=$((CURRENT + 1))
    
    if [ ! -f "$FILE" ]; then
        continue
    fi
    
    echo "[$CURRENT/$TOTAL_FILES] Processing $FILE..."
    
    # Skip template files and examples
    if [[ "$FILE" == *"TEMPLATE"* ]] || [[ "$FILE" == *"template"* ]] || [[ "$FILE" == *"example"* ]]; then
        echo "  Skipping template/example file"
        continue
    fi
    
    # Create backup
    cp "$FILE" "$FILE.brokenlinkbackup"
    
    # Get all wiki-style links in the file
    WIKI_LINKS=$(grep -o '\[\[[^]]*\]\]' "$FILE" | sort -u)
    
    if [ -z "$WIKI_LINKS" ]; then
        continue
    fi
    
    # Check each link
    echo "$WIKI_LINKS" | while read LINK; do
        # Extract the link target
        TARGET=$(echo "$LINK" | sed 's/\[\[//' | sed 's/\]\]//')
        
        # Check if this is a broken link
        if ./check_links_better.sh 2>/dev/null | grep -q "$FILE.*$LINK"; then
            # It's broken - decide what to do based on context
            
            # For index files, remove the entire line if it's just a link list
            if [[ "$FILE" == *"/index.md" ]] && grep -q "^- $LINK" "$FILE"; then
                # Remove the entire line
                sed -i '' "/^- $LINK/d" "$FILE"
            else
                # Convert to plain text for inline references
                PLAIN_TEXT=$(echo "$TARGET" | sed 's/-/ /g' | sed 's|/| |g' | sed 's/^./\U&/')
                sed -i '' "s|$LINK|$PLAIN_TEXT|g" "$FILE"
            fi
        fi
    done
    
    # Clean up empty sections in index files
    if [[ "$FILE" == *"/index.md" ]]; then
        # Remove multiple blank lines
        sed -i '' '/^$/N;/^\n$/d' "$FILE"
    fi
done

echo "Cleanup complete!"
echo "Backup files created with .brokenlinkbackup extension"
echo "Run './check_links_better.sh | grep \"^BROKEN:\" | wc -l' to see remaining broken links"