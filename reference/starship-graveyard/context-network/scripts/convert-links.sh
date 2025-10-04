#!/bin/bash
# convert-links.sh - Convert wiki-style links to markdown format

# This script helps convert [[wiki-style]] links to [markdown](links.md) format
# Usage: ./convert-links.sh [file.md]

if [ $# -eq 0 ]; then
    echo "Usage: $0 <markdown-file>"
    echo "This script converts wiki-style links [[link]] to markdown format"
    exit 1
fi

FILE=$1

if [ ! -f "$FILE" ]; then
    echo "Error: File '$FILE' not found"
    exit 1
fi

# Create backup
cp "$FILE" "$FILE.bak"
echo "Created backup: $FILE.bak"

# Count wiki-style links
WIKI_COUNT=$(grep -o '\[\[[^]]*\]\]' "$FILE" | wc -l)
echo "Found $WIKI_COUNT wiki-style links in $FILE"

# Common conversions based on context network structure
# This is a basic implementation - extend as needed
sed -i '' \
    -e 's/\[\[marcus-voice-guide\]\]/[marcus-voice-guide](protagonists\/marcus-voice-guide.md)/g' \
    -e 's/\[\[rhea-voice-guide\]\]/[rhea-voice-guide](protagonists\/rhea-voice-guide.md)/g' \
    -e 's/\[\[current_status\]\]/[current_status](current_status.md)/g' \
    -e 's/\[\[chapter\([0-9]\{3\}\)_planning\]\]/[chapter\1_planning](chapter\1_planning.md)/g' \
    "$FILE"

# For remaining wiki links, convert to basic markdown format
# This assumes the link text and filename are the same
sed -i '' 's/\[\[\([^]]*\)\]\]/[\1](\1.md)/g' "$FILE"

# Count remaining wiki-style links
REMAINING=$(grep -o '\[\[[^]]*\]\]' "$FILE" | wc -l)
echo "Converted $(($WIKI_COUNT - $REMAINING)) links"

if [ $REMAINING -gt 0 ]; then
    echo "Warning: $REMAINING wiki-style links could not be converted automatically"
    echo "Please review and update manually"
fi

echo "Conversion complete. Review changes and delete backup when satisfied."