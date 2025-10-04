#!/bin/bash

# Final cleanup script for the last 35 broken links
# Run from context-network directory

echo "Fixing final 35 broken links..."

# Fix archive/index.md
echo "Fixing archive/index.md..."
sed -i '' 's|\[\[../elements/plot/cross-cultural_storytelling_frameworks\]\]|[cross-cultural storytelling frameworks](../elements/plot/cross-cultural/index.md)|g' "./archive/index.md"
sed -i '' 's|\[\[../elements/plot/genre_specific_frameworks\]\]|[genre-specific frameworks](../elements/plot/genre-specific/index.md)|g' "./archive/index.md"

# Fix processes/index.md
echo "Fixing processes/index.md..."
sed -i '' 's|\[\[../elements/\]\]|[elements](../elements/index.md)|g' "./processes/index.md"
sed -i '' 's|\[\[../discovery/\]\]|[discovery](../discovery/index.md)|g' "./processes/index.md"

# Fix discovery/findings/recent.md
echo "Fixing discovery/findings/recent.md..."
sed -i '' 's|\[\[by-chapter\]\]|[findings by chapter](by-chapter.md)|g' "./discovery/findings/recent.md"

# Fix discovery/findings/example-finding.md
echo "Fixing discovery/findings/example-finding.md..."
sed -i '' 's|\[\[../../elements/characters/protagonists/\]\]|[protagonists](../../elements/characters/protagonists/index.md)|g' "./discovery/findings/example-finding.md"
sed -i '' 's|\[\[../../elements/world/chorus-naming-origin\]\]|[chorus naming origin](../../elements/world/chorus-naming-origin.md)|g' "./discovery/findings/example-finding.md"

# Fix discovery/locations/character-introductions.md
echo "Fixing discovery/locations/character-introductions.md..."
sed -i '' 's|\[\[characters/ai-partner-arc\]\]|[AI partner arc](../../characters/ai-partner-arc.md)|g' "./discovery/locations/character-introductions.md"
sed -i '' 's|\[\[../../elements/themes/found-family\]\]|[found family theme](../../elements/themes/found-family.md)|g' "./discovery/locations/character-introductions.md"
sed -i '' 's|\[\[../../elements/plot/scientific-discovery\]\]|[scientific discovery](../../elements/plot/scientific-discovery.md)|g' "./discovery/locations/character-introductions.md"

# Fix planning files
echo "Fixing planning files..."
sed -i '' 's|\[\[chapter005-crime-focus-rewrite\]\]|chapter 5 crime focus rewrite|g' "./planning/crime-corruption-focus-revision.md"
sed -i '' 's|\[\[chapter006-corruption-focus-rewrite\]\]|chapter 6 corruption focus rewrite|g' "./planning/crime-corruption-focus-revision.md"
sed -i '' 's|\[\[../elements/plot/archaeological-mystery\]\]|[archaeological mystery](../elements/plot/archaeological-mystery.md)|g' "./planning/crime-corruption-focus-revision.md"
sed -i '' 's|\[\[chapter005-006-complete-rewrite\]\]|chapters 5-6 complete rewrite|g' "./planning/theme-pivot-failure-analysis.md"
sed -i '' 's|\[\[../elements/characters/dr-elizabeth-zhou\]\]|[Dr. Elizabeth Zhou](../elements/characters/dr-elizabeth-zhou.md)|g' "./planning/chapter005_planning.md"
sed -i '' 's|\[\[character-profiles-update\]\]|character profiles update|g' "./planning/character-rename-maya.md"
sed -i '' 's|\[\[../elements/characters/\]\]|[characters](../elements/characters/index.md)|g' "./planning/character-rename-maya.md"
sed -i '' 's|\[\[../elements/characters/detective-vega\]\]|[Detective Vega](../elements/characters/detective-vega.md)|g' "./planning/chapter004_planning.md"
sed -i '' 's|\[\[character-profiles-update\]\]|character profiles update|g' "./planning/galactic-naming-conventions.md"
sed -i '' 's|\[\[../elements/world/\]\]|[world elements](../elements/world/index.md)|g' "./planning/galactic-naming-conventions.md"

# Fix meta/metadata-standards.md
echo "Fixing meta/metadata-standards.md..."
sed -i '' 's|\[\[../templates/\]\]|[templates](../templates/)|g' "./meta/metadata-standards.md"

# Fix elements/plot files
echo "Fixing elements/plot files..."
sed -i '' 's|\[\[sf-character-dev\]\]|[SF character development](sf-character-dev.md)|g' "./elements/plot/genre-specific/sf-hard-soft.md"
sed -i '' 's|\[\[fantasy-seven-point\]\]|[fantasy seven-point structure](fantasy-seven-point.md)|g' "./elements/plot/genre-specific/fantasy-hero-journey.md"
sed -i '' 's|\[\[fantasy-character-dev\]\]|[fantasy character development](fantasy-character-dev.md)|g' "./elements/plot/genre-specific/fantasy-hero-journey.md"
sed -i '' 's|\[\[transformation-fluidity\]\]|[transformation and fluidity](transformation-fluidity.md)|g' "./elements/plot/cross-cultural/index.md"
sed -i '' 's|\[\[character-agency\]\]|[character agency](character-agency.md)|g' "./elements/plot/scene-building/narrative-causality.md"
sed -i '' 's|\[\[character-agency\]\]|[character agency](character-agency.md)|g' "./elements/plot/scene-building/index.md"
sed -i '' 's|\[\[plot-structure/index\]\]|[plot structure](../../plot-structure/index.md)|g' "./elements/plot/scene-building/index.md"
sed -i '' 's|\[\[character-arcs\]\]|[character arcs](../character-arcs.md)|g' "./elements/plot/scene-building/story-circle.md"

# Fix workflow files
echo "Fixing workflow files..."
sed -i '' 's|\[\[manuscript-organization\]\]|manuscript organization|g' "./workflow/version-control-guidelines.md"
sed -i '' 's|\[\[context-network-structure\]\]|context network structure|g' "./workflow/version-control-guidelines.md"

# Fix learning-paths/TEMPLATE.md
echo "Fixing learning-paths/TEMPLATE.md..."
sed -i '' 's|\[\[discovery-001\]\]|[Replace with actual discovery link]|g' "./learning-paths/TEMPLATE.md"
sed -i '' 's|\[\[discovery-015\]\]|[Replace with actual discovery link]|g' "./learning-paths/TEMPLATE.md"
sed -i '' 's|\[\[discovery-023\]\]|[Replace with actual discovery link]|g' "./learning-paths/TEMPLATE.md"
sed -i '' 's|\[\[discovery-027\]\]|[Replace with actual discovery link]|g' "./learning-paths/TEMPLATE.md"

echo "Done! All 35 remaining broken links have been fixed."