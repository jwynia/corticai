#\!/bin/bash

# Function to check if a file exists in the context network
check_file_exists() {
    local link="$1"
    local current_dir="$2"
    
    # Try different possible paths
    local paths_to_try=(
        "$link.md"
        "./$link.md"
        "$current_dir/$link.md"
        "./elements/$link.md"
        "./planning/$link.md"
        "./discovery/$link.md"
        "./discovery/locations/$link.md"
        "./discovery/findings/$link.md"
        "./archive/$link.md"
        "./worldbuilding/$link.md"
        "./elements/plot/$link.md"
        "./elements/characters/$link.md"
        "./elements/world/$link.md"
    )
    
    for path in "${paths_to_try[@]}"; do
        if [ -f "$path" ]; then
            return 0  # File exists
        fi
    done
    
    return 1  # File not found
}

# Extract all wiki-style links and check if referenced files exist
grep -rn "\[\[.*\]\]" . --include="*.md" | while read -r line; do
    file=$(echo "$line" | cut -d: -f1)
    line_num=$(echo "$line" | cut -d: -f2)
    content=$(echo "$line" | cut -d: -f3-)
    current_dir=$(dirname "$file")
    
    # Extract all links from the line (there might be multiple)
    echo "$content" | grep -o '\[\[[^]]*\]\]' | while read -r full_link; do
        link=$(echo "$full_link" | sed 's/\[\[\(.*\)\]\]/\1/')
        
        if [ -n "$link" ]; then
            # Check if file exists
            if ! check_file_exists "$link" "$current_dir"; then
                echo "BROKEN: $file:$line_num -> [[$link]]"
            fi
        fi
    done
done
