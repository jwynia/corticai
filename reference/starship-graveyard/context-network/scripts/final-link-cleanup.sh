#!/bin/bash
# final-link-cleanup.sh - Final cleanup of all remaining broken links

echo "Final broken link cleanup..."

# Process specific files with known issues

# Fix chorus-naming-origin.md
if [ -f "./worldbuilding/chorus-naming-origin.md" ]; then
    echo "Fixing worldbuilding/chorus-naming-origin.md..."
    sed -i '' 's|\[\[elements/world/index\]\]|[world elements](../elements/world/)|g' "./worldbuilding/chorus-naming-origin.md"
    sed -i '' 's|\[\[elements/worldbuilding/chorus-technology\]\]|Chorus technology|g' "./worldbuilding/chorus-naming-origin.md"
    sed -i '' 's|\[\[elements/themes/lost-civilizations\]\]|lost civilizations theme|g' "./worldbuilding/chorus-naming-origin.md"
fi

# Fix discovery records
echo "Fixing discovery records..."
sed -i '' 's|\[\[like-this\]\]|like-this|g' "./discoveries/records/2025-01-17-002.md" 2>/dev/null
sed -i '' 's|\[\[navigation-patterns\]\]|navigation patterns|g' "./discoveries/records/2025-01-17-002.md" 2>/dev/null
sed -i '' 's|\[\[link-formats\]\]|link formats|g' "./discoveries/records/2025-01-17-002.md" 2>/dev/null
sed -i '' 's|\[\[discovery-layer-benefits\]\]|discovery layer benefits|g' "./discoveries/records/2025-01-17-002.md" 2>/dev/null
sed -i '' 's|\[\[character-consistency\]\]|character consistency|g' "./discoveries/records/2025-01-17-001.md" 2>/dev/null
sed -i '' 's|\[\[name-decisions\]\]|[name decisions](../../decisions/character_name_changes.md)|g' "./discoveries/records/2025-01-17-001.md" 2>/dev/null

# Fix process index
if [ -f "./processes/index.md" ]; then
    echo "Fixing processes/index.md..."
    sed -i '' '/\[\[revision\]\]/d' "./processes/index.md"
    sed -i '' '/\[\[discovery_workflow\]\]/d' "./processes/index.md"
    sed -i '' '/\[\[framework_application\]\]/d' "./processes/index.md"
    sed -i '' '/\[\[network_maintenance\]\]/d' "./processes/index.md"
    sed -i '' '/\[\[link_management\]\]/d' "./processes/index.md"
fi

# Fix validation.md directory links
if [ -f "./processes/validation.md" ]; then
    echo "Fixing processes/validation.md..."
    sed -i '' 's|\[\[../elements/world/\]\]|[world elements](../elements/world/)|g' "./processes/validation.md"
    sed -i '' 's|\[\[../elements/characters/\]\]|[character elements](../elements/characters/)|g' "./processes/validation.md"
    sed -i '' 's|\[\[../planning/\]\]|[planning documents](../planning/)|g' "./processes/validation.md"
    sed -i '' 's|\[\[../elements/themes/\]\]|[theme elements](../elements/themes/)|g' "./processes/validation.md"
fi

# Remove all remaining wiki-style links that point to non-existent files
echo "Removing remaining broken wiki-style links..."

# Get all remaining broken links
./check_links_better.sh 2>/dev/null | grep "^BROKEN:" | while read LINE; do
    FILE=$(echo "$LINE" | cut -d':' -f2 | sed 's/^[ \t]*//')
    LINK=$(echo "$LINE" | grep -o '\[\[[^]]*\]\]')
    
    if [ -f "$FILE" ] && [ ! -z "$LINK" ]; then
        # Extract just the text from the link
        TEXT=$(echo "$LINK" | sed 's/\[\[//' | sed 's/\]\]//' | sed 's|.*/||' | sed 's/-/ /g')
        
        # Replace the broken link with plain text
        sed -i '' "s|$LINK|$TEXT|g" "$FILE" 2>/dev/null
    fi
done

# Clean up any empty lines or formatting issues
find . -name "*.md" -type f | while read FILE; do
    # Remove lines that are just "- " with nothing after
    sed -i '' '/^- *$/d' "$FILE" 2>/dev/null
    
    # Collapse multiple blank lines
    sed -i '' '/^$/N;/^\n$/d' "$FILE" 2>/dev/null
done

echo "Final cleanup complete!"
echo "Running final broken link check..."

FINAL_COUNT=$(./check_links_better.sh 2>/dev/null | grep "^BROKEN:" | wc -l)
echo "Remaining broken links: $FINAL_COUNT"