#!/bin/bash
# remove-generic-broken-links.sh - Remove broken links that are generic framework references

echo "Removing generic broken framework links..."

# List of generic framework terms that can be safely removed
GENERIC_TERMS="scene-tension|scene-purpose|discovery-###|concept-1|concept-2|pattern-name|related-discovery-###|example-finding|narrative-progression-spectrum|modular-storytelling|rhythmic-repetition|monomyth-variations|narrative-collaboration|authorial-control|revision-checklist|scene-planning-worksheet|version-control-guidelines"

# Get all files with broken links
FILES=$(./check_links_better.sh 2>/dev/null | grep "^BROKEN:" | cut -d':' -f2 | cut -d':' -f1 | sort -u)

echo "$FILES" | while read FILE; do
    FILE=$(echo $FILE | sed 's/^[ \t]*//')
    
    if [ ! -f "$FILE" ]; then
        continue
    fi
    
    # Check if file has generic links
    if grep -qE "\[\[($GENERIC_TERMS)\]\]" "$FILE"; then
        echo "Processing $FILE..."
        
        # Create backup
        cp "$FILE" "$FILE.genericbackup"
        
        # Remove generic links
        sed -i '' -E "s/\[\[($GENERIC_TERMS)\]\]//g" "$FILE"
        
        # Clean up results
        # Remove empty list items
        sed -i '' '/^- *$/d' "$FILE"
        
        # Remove lines that are just "See also:" with nothing after
        sed -i '' '/^- See also: *$/d' "$FILE"
        sed -i '' '/^See also: *$/d' "$FILE"
        
        # Clean up multiple spaces
        sed -i '' 's/  */ /g' "$FILE"
        
        # Remove trailing spaces
        sed -i '' 's/ *$//' "$FILE"
        
        # Collapse multiple blank lines
        sed -i '' '/^$/N;/^\n$/d' "$FILE"
    fi
done

echo "Generic link cleanup complete!"
echo "Backup files created with .genericbackup extension"