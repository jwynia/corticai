#!/bin/bash
# remove-broken-links.sh - Remove or convert broken wiki-style links

# This script helps clean up broken wiki-style links by:
# 1. Finding all broken links
# 2. Converting them to plain text or removing them
# 3. Creating a report of changes

if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Usage: $0 [--dry-run] [--convert-to-text]"
    echo "  --dry-run: Show what would be changed without making changes"
    echo "  --convert-to-text: Convert [[broken-link]] to 'broken-link' instead of removing"
    exit 0
fi

DRY_RUN=false
CONVERT_TO_TEXT=false

for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            ;;
        --convert-to-text)
            CONVERT_TO_TEXT=true
            ;;
    esac
done

echo "Finding broken wiki-style links..."

# Get list of broken links
BROKEN_LINKS=$(./check_links_better.sh 2>/dev/null | grep "^BROKEN:")

if [ -z "$BROKEN_LINKS" ]; then
    echo "No broken links found!"
    exit 0
fi

# Count broken links
TOTAL=$(echo "$BROKEN_LINKS" | wc -l)
echo "Found $TOTAL broken links"

# Process each file with broken links
echo "$BROKEN_LINKS" | cut -d':' -f2 | cut -d':' -f1 | sort -u | while read FILE; do
    FILE=$(echo $FILE | sed 's/^[ \t]*//')
    
    if [ ! -f "$FILE" ]; then
        continue
    fi
    
    echo "Processing $FILE..."
    
    # Get broken links in this file
    FILE_LINKS=$(echo "$BROKEN_LINKS" | grep "$FILE" | sed 's/.*-> //' | sort -u)
    
    if [ "$DRY_RUN" == "true" ]; then
        echo "  Would process $(echo "$FILE_LINKS" | wc -l) broken links"
        continue
    fi
    
    # Create backup
    cp "$FILE" "$FILE.bak"
    
    # Process each broken link in the file
    echo "$FILE_LINKS" | while read LINK; do
        if [ "$CONVERT_TO_TEXT" == "true" ]; then
            # Convert [[link]] to 'link'
            LINK_TEXT=$(echo "$LINK" | sed 's/\[\[//' | sed 's/\]\]//')
            sed -i '' "s|$LINK|'$LINK_TEXT'|g" "$FILE"
        else
            # Remove the link entirely
            sed -i '' "s|$LINK||g" "$FILE"
        fi
    done
    
    # Clean up multiple spaces
    sed -i '' 's/  */ /g' "$FILE"
    
    # Count changes
    CHANGES=$(diff "$FILE.bak" "$FILE" | grep "^[<>]" | wc -l)
    echo "  Made $CHANGES changes"
done

echo "Done! Backups created with .bak extension"