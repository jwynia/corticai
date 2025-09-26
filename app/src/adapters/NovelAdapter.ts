import { UniversalFallbackAdapter } from './UniversalFallbackAdapter';
import type {
  DomainAdapter,
  Entity,
  FileMetadata,
  Relationship,
  EntityMetadata
} from '../types/entity';

/**
 * Novel Adapter - Specialized for narrative content analysis
 *
 * Extends the Universal Fallback Adapter to provide enhanced analysis
 * for novels and narrative content, including:
 * - Character detection and tracking
 * - Scene identification
 * - Location extraction
 * - Dialogue vs narrative classification
 * - Character relationship detection
 */
export class NovelAdapter extends UniversalFallbackAdapter implements DomainAdapter {
  private characterNames = new Set<string>();
  private locations = new Set<string>();

  /**
   * Main extraction method - processes narrative content and returns enhanced entities
   */
  extract(content: string, metadata: FileMetadata): Entity[] {
    // First, get the base entities from the Universal Fallback Adapter
    const baseEntities = super.extract(content, metadata);

    // Reset collections for each extraction
    this.characterNames.clear();
    this.locations.clear();

    // Enhance with novel-specific entities
    const novelEntities = this.extractNovelEntities(content, metadata);

    // Combine and return all entities
    return [...baseEntities, ...novelEntities];
  }

  /**
   * Extract novel-specific entities (characters, scenes, locations, etc.)
   */
  private extractNovelEntities(content: string, metadata: FileMetadata): Entity[] {
    const entities: Entity[] = [];
    const lines = content.split('\n');

    // Extract characters
    entities.push(...this.extractCharacters(content, metadata));

    // Extract scenes and time markers
    entities.push(...this.extractScenes(lines, metadata));

    // Extract locations
    entities.push(...this.extractLocations(content, metadata));

    // Extract dialogue vs narrative
    entities.push(...this.extractDialogueAndNarrative(lines, metadata));

    return entities;
  }

  /**
   * Extract character names from dialogue and narrative
   */
  private extractCharacters(content: string, metadata: FileMetadata): Entity[] {
    const characters: Entity[] = [];

    // Look for character names in dialogue tags first
    const dialogueTagPattern = /(?:"[^"]*",?\s*)?(\w+(?:\s+\w+)*)\s+(?:said|replied|exclaimed|whispered|declared|observed|asked|answered)/gi;

    let match;
    while ((match = dialogueTagPattern.exec(content)) !== null) {
      const name = match[1].trim();
      if (this.isValidCharacterName(name)) {
        this.characterNames.add(name);
      }
    }

    // Look for titles and professional names (including complex multi-word titles)
    const titlePattern = /\b((?:Mr|Mrs|Ms|Dr|Lady|Lord|Sir|Captain|Professor|Nurse)\.?\s+[A-Z][a-z]+(?:\s+(?:de\s+)?[A-Z][a-z]+)*)\b/g;
    while ((match = titlePattern.exec(content)) !== null) {
      const name = match[1].trim();
      if (this.isValidCharacterName(name)) {
        this.characterNames.add(name);
      }
    }

    // Look for proper nouns that might be character names (including compound names)
    const characterPattern = /\b[A-Z][a-z]+(?:\s+(?:de\s+)?[A-Z][a-z]+)*\b/g;
    while ((match = characterPattern.exec(content)) !== null) {
      const name = match[0].trim();
      if (this.isValidCharacterName(name)) {
        this.characterNames.add(name);
      }
    }

    // Create character entities
    let entityId = 1;
    for (const name of this.characterNames) {
      characters.push({
        id: `novel_character_${entityId++}_${Date.now()}`,
        type: 'reference',
        name: name,
        content: name,
        metadata: {
          filename: metadata.filename,
          entityType: 'character',
          format: metadata.extension
        }
      });
    }

    return characters;
  }

  /**
   * Determine if a name is likely a character name
   */
  private isValidCharacterName(name: string): boolean {
    // Filter out common words and very short names
    if (name.length < 2) return false;

    // Always allow names with titles
    if (/^(Mr|Mrs|Ms|Dr|Lady|Lord|Sir|Captain|Professor|Nurse)\.?\s/i.test(name)) {
      return true;
    }

    const commonWords = new Set([
      'The', 'A', 'An', 'This', 'That', 'These', 'Those', 'He', 'She', 'It', 'They',
      'His', 'Her', 'Their', 'My', 'Your', 'Our', 'I', 'You', 'We', 'Me', 'Him', 'Them',
      'And', 'Or', 'But', 'So', 'Yet', 'For', 'Nor', 'As', 'If', 'When', 'Where', 'Why',
      'How', 'What', 'Who', 'Which', 'That', 'This', 'Here', 'There', 'Now', 'Then',
      'Today', 'Tomorrow', 'Yesterday', 'Morning', 'Evening', 'Night', 'Day', 'Week', 'Month', 'Year',
      'Good', 'Bad', 'Great', 'Small', 'Large', 'Big', 'Little', 'New', 'Old', 'Young',
      'Happy', 'Sad', 'Angry', 'Excited', 'Worried', 'Calm', 'Peaceful', 'Quiet', 'Loud',
      'Beautiful', 'Wonderful', 'Terrible', 'Amazing', 'Incredible', 'Simple', 'Complex',
      'Chapter', 'Scene', 'Part', 'Book', 'Page', 'Line', 'Word', 'Story', 'Tale', 'Novel',
      'Hello', 'Dear', 'Kitchen', 'Patient', 'Notes'
    ]);

    return !commonWords.has(name);
  }

  /**
   * Extract scene markers and time transitions
   */
  private extractScenes(lines: string[], metadata: FileMetadata): Entity[] {
    const scenes: Entity[] = [];
    let entityId = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Chapter markers
      if (/^Chapter\s+\d+/i.test(line)) {
        scenes.push({
          id: `novel_chapter_${entityId++}_${Date.now()}`,
          type: 'section',
          name: line,
          content: line,
          metadata: {
            filename: metadata.filename,
            lineNumbers: [i + 1, i + 1],
            entityType: 'chapter',
            format: metadata.extension
          }
        });
      }

      // Scene break markers
      if (/^\s*[\*\-]{3,}\s*$/.test(line)) {
        scenes.push({
          id: `novel_scene_${entityId++}_${Date.now()}`,
          type: 'container',
          name: `Scene Break ${entityId}`,
          content: line,
          metadata: {
            filename: metadata.filename,
            lineNumbers: [i + 1, i + 1],
            entityType: 'scene',
            format: metadata.extension
          }
        });
      }

      // Time markers
      const timeMarkers = [
        'Later that day', 'The next day', 'The following morning', 'That evening',
        'The next morning', 'The next evening', 'Three days later', 'A week later',
        'The following week', 'Later that evening', 'Meanwhile'
      ];

      for (const marker of timeMarkers) {
        if (line.includes(marker)) {
          scenes.push({
            id: `novel_time_${entityId++}_${Date.now()}`,
            type: 'reference',
            name: marker,
            content: marker,
            metadata: {
              filename: metadata.filename,
              lineNumbers: [i + 1, i + 1],
              entityType: 'time_marker',
              format: metadata.extension
            }
          });
          break;
        }
      }
    }

    return scenes;
  }

  /**
   * Extract location references
   */
  private extractLocations(content: string, metadata: FileMetadata): Entity[] {
    const locations: Entity[] = [];
    let entityId = 1;

    // Multi-word locations and compound phrases (must come first for priority)
    const multiWordLocations = [
      'New York City', 'New York', 'apartment building', 'Eiffel Tower', 'Big Ben', 'Tower Bridge',
      'Buckingham Palace', 'Westminster Abbey', 'Notre Dame', 'Statue of Liberty', 'Times Square',
      'Central Park', 'Hyde Park', 'Regent\'s Park', 'Greenwich Park', 'Grand Hotel', 'Royal Hotel',
      'Park Hotel', 'Crown Hotel', 'Victoria Hotel', 'Station Hotel', 'Manor Hotel', 'Castle Hotel'
    ];

    // Check for multi-word locations first
    for (const location of multiWordLocations) {
      const regex = new RegExp(`\\b${location.replace(/'/g, "\\'")}\\b`, 'gi');
      let match;
      while ((match = regex.exec(content)) !== null) {
        const foundLocation = match[0];
        if (!this.locations.has(foundLocation)) {
          this.locations.add(foundLocation);

          locations.push({
            id: `novel_location_${entityId++}_${Date.now()}`,
            type: 'reference',
            name: foundLocation,
            content: foundLocation,
            metadata: {
              filename: metadata.filename,
              entityType: 'location',
              format: metadata.extension
            }
          });
        }
      }
    }

    // Single word locations and generic types
    const singleWordPatterns = [
      // Specific places
      /\b(?:London|Paris|Tokyo|Rome|Berlin|Madrid|Barcelona|Amsterdam|Dublin|Edinburgh|Glasgow|Manchester|Birmingham|Liverpool|Bristol|Leeds|Sheffield|Cardiff|Belfast|Cork|Galway)\b/gi,

      // Generic location types
      /\b(?:restaurant|cafe|park|hotel|apartment|building|house|home|office|shop|store|market|church|hospital|school|university|library|museum|theater|cinema|station|airport|harbor|port|bridge|street|road|avenue|square|plaza|garden|meadow|forest|woods|mountains|hills|beach|lake|river|valley|village|town|city|country|nation|kingdom|empire)\b/gi
    ];

    for (const pattern of singleWordPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const location = match[0];
        // Only add if we haven't already found it as part of a multi-word location
        const isPartOfMultiWord = Array.from(this.locations).some(existing =>
          existing.toLowerCase().includes(location.toLowerCase()) && existing.toLowerCase() !== location.toLowerCase()
        );

        if (!this.locations.has(location) && !isPartOfMultiWord) {
          this.locations.add(location);

          locations.push({
            id: `novel_location_${entityId++}_${Date.now()}`,
            type: 'reference',
            name: location,
            content: location,
            metadata: {
              filename: metadata.filename,
              entityType: 'location',
              format: metadata.extension
            }
          });
        }
      }
    }

    return locations;
  }

  /**
   * Extract dialogue and narrative sections
   */
  private extractDialogueAndNarrative(lines: string[], metadata: FileMetadata): Entity[] {
    const entities: Entity[] = [];
    let entityId = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Dialogue detection (lines starting with quotes)
      if (/^["']/.test(line)) {
        entities.push({
          id: `novel_dialogue_${entityId++}_${Date.now()}`,
          type: 'paragraph',
          name: `Dialogue Line ${entityId}`,
          content: line,
          metadata: {
            filename: metadata.filename,
            lineNumbers: [i + 1, i + 1],
            entityType: 'dialogue',
            format: metadata.extension
          }
        });
      } else {
        // Narrative text
        entities.push({
          id: `novel_narrative_${entityId++}_${Date.now()}`,
          type: 'paragraph',
          name: `Narrative Line ${entityId}`,
          content: line,
          metadata: {
            filename: metadata.filename,
            lineNumbers: [i + 1, i + 1],
            entityType: 'narrative',
            format: metadata.extension
          }
        });
      }
    }

    return entities;
  }

  /**
   * Detect relationships between characters and other entities
   */
  detectRelationships(entities: Entity[]): Relationship[] {
    const relationships: Relationship[] = [];

    const characterEntities = entities.filter(e => e.metadata?.entityType === 'character');
    const textEntities = entities.filter(e =>
      e.metadata?.entityType === 'dialogue' || e.metadata?.entityType === 'narrative'
    );

    // Detect family relationships from context
    for (const textEntity of textEntities) {
      const content = textEntity.content?.toLowerCase() || '';

      // Family relationship indicators
      if (content.includes('mom') || content.includes('mother')) {
        // Find characters mentioned in the same context
        for (const char1 of characterEntities) {
          for (const char2 of characterEntities) {
            if (char1.id !== char2.id) {
              // Check if both characters are referenced in family context
              const content1 = content.includes(char1.name.toLowerCase());
              const content2 = content.includes(char2.name.toLowerCase());
              const familyContext = content.includes('mom') || content.includes('mother');

              if (familyContext && (content1 || content2)) {
                relationships.push({
                  type: 'references',
                  target: char2.id,
                  metadata: {
                    relationshipType: 'family',
                    relationshipSubtype: 'parent-child',
                    source: char1.id,
                    context: textEntity.metadata?.entityType || 'text'
                  }
                });
                // Only add one relationship per text entity to avoid duplicates
                break;
              }
            }
          }
        }
      }

      // Professional relationships
      if (content.includes('dr.') || content.includes('doctor') || content.includes('nurse')) {
        for (const char1 of characterEntities) {
          for (const char2 of characterEntities) {
            if (char1.id !== char2.id) {
              const isProfessional1 = char1.name.toLowerCase().includes('dr.') ||
                char1.name.toLowerCase().includes('doctor') ||
                char1.name.toLowerCase().includes('nurse');
              const isProfessional2 = char2.name.toLowerCase().includes('dr.') ||
                char2.name.toLowerCase().includes('doctor') ||
                char2.name.toLowerCase().includes('nurse');

              if (isProfessional1 || isProfessional2) {
                relationships.push({
                  type: 'references',
                  target: char2.id,
                  metadata: {
                    relationshipType: 'professional',
                    relationshipSubtype: 'medical',
                    source: char1.id,
                    context: 'medical professional'
                  }
                });
                // Only add one relationship per text entity to avoid duplicates
                break;
              }
            }
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Find the speaker for a dialogue line
   */
  private findSpeakerForDialogue(dialogue: Entity, entities: Entity[]): Entity | undefined {
    const characterEntities = entities.filter(e => e.metadata?.entityType === 'character');
    const dialogueContent = dialogue.content || '';

    // Look for dialogue tags that indicate the speaker
    const speakerPattern = /(?:"[^"]*",?\s*)?(\w+(?:\s+\w+)*)\s+(?:said|replied|exclaimed|whispered|declared|observed|asked|answered)/i;
    const match = dialogueContent.match(speakerPattern);

    if (match) {
      const speakerName = match[1];
      return characterEntities.find(c =>
        c.name.toLowerCase().includes(speakerName.toLowerCase()) ||
        speakerName.toLowerCase().includes(c.name.toLowerCase())
      );
    }

    return undefined;
  }
}