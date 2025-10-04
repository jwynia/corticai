# Chapter Renumbering Plan

## Current Problematic Structure

### Identified Files:
- 000-Introduction.md
- 001-TheNatureOfWisdom.md
- 002-WisdomTraditionsAroundTheWorld.md
- 003-TheEvolutionOfWisdom.md
- 004-HeartAndMind.md
- 005-IndividualAndCollective.md (should be 004?)
- 006-ActionAndNonAction.md
- 007-KnowledgeAndMystery.md
- 008-ChangeAndStability.md (DUPLICATE NUMBER)
- 008-SimplicityAndComplexity.md (DUPLICATE NUMBER)
- 009-AmbitionAndContentment.md
- 010-ConnectionAndDetachment.md
- 011-JusticeAndCompassion.md
- 012-NavigatingLifesContradictions.md
- 013-WisdomOfBalance.md
- 014-Conclusion.md

### Problems:
1. Missing Chapter 4 if IndividualAndCollective should be 4
2. Two Chapter 8s
3. Unclear if current numbering reflects intended reading order

## Proposed New Structure

Based on thematic flow and the three-part structure mentioned in analysis:

### Part I: Foundations of Wisdom (Chapters 1-3)
- 000-Introduction.md → Keep as 000
- 001-TheNatureOfWisdom.md → Keep as 001
- 002-WisdomTraditionsAroundTheWorld.md → Keep as 002
- 003-TheEvolutionOfWisdom.md → Keep as 003

### Part II: The Paradoxes of Wisdom (Chapters 4-11)
- 004-HeartAndMind.md → Keep as 004
- 005-IndividualAndCollective.md → Keep as 005
- 006-ActionAndNonAction.md → Keep as 006
- 007-KnowledgeAndMystery.md → Keep as 007
- 008-ChangeAndStability.md → Keep as 008
- 008-SimplicityAndComplexity.md → **RENAME to 009**
- 009-AmbitionAndContentment.md → **RENAME to 010**
- 010-ConnectionAndDetachment.md → **RENAME to 011**
- 011-JusticeAndCompassion.md → **RENAME to 012**

### Part III: Living with Wisdom (Chapters 12-14)
- 012-NavigatingLifesContradictions.md → **RENAME to 013**
- 013-WisdomOfBalance.md → **RENAME to 014**
- 014-Conclusion.md → **RENAME to 015**

## File Renaming Commands

```bash
# Create backup first
cp -r manuscript/ manuscript-backup-$(date +%Y%m%d)/

# Rename files (in reverse order to avoid conflicts)
mv manuscript/014-Conclusion.md manuscript/015-Conclusion.md
mv manuscript/013-WisdomOfBalance.md manuscript/014-WisdomOfBalance.md
mv manuscript/012-NavigatingLifesContradictions.md manuscript/013-NavigatingLifesContradictions.md
mv manuscript/011-JusticeAndCompassion.md manuscript/012-JusticeAndCompassion.md
mv manuscript/010-ConnectionAndDetachment.md manuscript/011-ConnectionAndDetachment.md
mv manuscript/009-AmbitionAndContentment.md manuscript/010-AmbitionAndContentment.md
mv manuscript/008-SimplicityAndComplexity.md manuscript/009-SimplicityAndComplexity.md
# 008-ChangeAndStability.md stays as is
```

## Cross-Reference Updates Needed

After renaming, need to update:
1. Any "Chapter X" references in all files
2. Navigation links between chapters
3. Table of contents
4. Index references
5. Appendix references to chapters

## Verification Steps

1. Confirm no duplicate numbers
2. Check all cross-references updated
3. Verify thematic flow makes sense
4. Update any automated build scripts