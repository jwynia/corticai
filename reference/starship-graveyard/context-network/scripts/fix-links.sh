#!/bin/bash
# fix-links.sh - Helper script for link maintenance

# Function to convert wiki-style links to markdown
convert_wiki_to_markdown() {
    # This is a placeholder - would need proper implementation
    echo "Converting [[wiki-links]] to [markdown](links.md)..."
}

# Function to update links after file move
update_moved_file() {
    old_path=$1
    new_path=$2
    echo "Updating references from $old_path to $new_path..."
    grep -r "\[$old_path\]" . --include="*.md" -l | while read file; do
        sed -i.bak "s|$old_path|$new_path|g" "$file"
    done
}

# Function to find orphaned links
find_orphaned_links() {
    echo "Finding links that point to non-existent files..."
    grep -r "\[\[.*\]\]" . --include="*.md" | while read line; do
        # Extract link target and check if file exists
        # This is simplified - real implementation would be more robust
        echo "$line"
    done
}

echo "Link maintenance helper - choose an option:"
echo "1. Convert wiki links to markdown"
echo "2. Update links after file move"
echo "3. Find orphaned links"
echo "4. Generate link report"