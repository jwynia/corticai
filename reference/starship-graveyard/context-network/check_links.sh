#\!/bin/bash

# Extract all wiki-style links and check if referenced files exist
grep -rn "\[\[.*\]\]" . --include="*.md" | while read -r line; do
    file=$(echo "$line" | cut -d: -f1)
    line_num=$(echo "$line" | cut -d: -f2)
    content=$(echo "$line" | cut -d: -f3-)
    
    # Extract the link text between [[ and ]]
    link=$(echo "$content" | grep -o '\[\[[^]]*\]\]' | sed 's/\[\[\(.*\)\]\]/\1/')
    
    if [ -n "$link" ]; then
        # Handle different link formats
        if [[ "$link" == *"/"* ]]; then
            # Path-style link
            target_path="$link.md"
        else
            # Simple link - search for it in common locations
            target_path="$link.md"
        fi
        
        # Check if file exists
        if [ \! -f "$target_path" ]; then
            echo "BROKEN: $file:$line_num -> [[$link]]"
        fi
    fi
done
