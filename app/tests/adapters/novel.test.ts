import { describe, it, expect, beforeEach } from 'vitest';
import { NovelAdapter } from '../../src/adapters/NovelAdapter';
import type { Entity, FileMetadata, Relationship } from '../../src/types/entity';

describe('NovelAdapter', () => {
  let adapter: NovelAdapter;

  beforeEach(() => {
    adapter = new NovelAdapter();
  });

  describe('Basic Functionality', () => {
    it('should be instantiable', () => {
      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(NovelAdapter);
    });

    it('should have an extract method', () => {
      expect(adapter.extract).toBeDefined();
      expect(typeof adapter.extract).toBe('function');
    });

    it('should extend UniversalFallbackAdapter functionality', () => {
      const content = 'Simple text content';
      const metadata: FileMetadata = {
        path: '/test/novel.txt',
        filename: 'novel.txt',
        extension: '.txt'
      };

      const result = adapter.extract(content, metadata);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Should have at least a document entity like the base adapter
      const documentEntity = result.find(e => e.type === 'document');
      expect(documentEntity).toBeDefined();
      expect(documentEntity?.name).toBe('novel.txt');
    });
  });

  describe('Character Detection', () => {
    it('should identify character names in dialogue', () => {
      const content = `"Hello, Sarah," said John. "How are you today?"

Sarah smiled back at him. "I'm doing well, thank you."`;

      const metadata: FileMetadata = {
        path: '/test/story.txt',
        filename: 'story.txt',
        extension: '.txt'
      };

      const result = adapter.extract(content, metadata);

      // Should identify characters from dialogue and narrative
      const entities = result.filter(e => e.metadata?.entityType === 'character');
      expect(entities.length).toBeGreaterThan(0);

      // Should find John and Sarah
      const characterNames = entities.map(e => e.name);
      expect(characterNames).toContain('John');
      expect(characterNames).toContain('Sarah');
    });

    it('should identify character names in narrative text', () => {
      const content = `Elizabeth walked down the cobblestone street, her mind racing with thoughts of Mr. Darcy.
      She had seen him at the ball last night, and his penetrating gaze had left her unsettled.

      Meanwhile, Darcy sat in his study, contemplating his encounter with Miss Bennet.`;

      const metadata: FileMetadata = {
        path: '/test/pride.txt',
        filename: 'pride.txt',
        extension: '.txt'
      };

      const result = adapter.extract(content, metadata);

      const characterEntities = result.filter(e => e.metadata?.entityType === 'character');
      const characterNames = characterEntities.map(e => e.name);

      expect(characterNames).toContain('Elizabeth');
      expect(characterNames).toContain('Mr. Darcy');
      expect(characterNames).toContain('Darcy');
      expect(characterNames).toContain('Miss Bennet');
    });

    it('should handle character titles and honorifics', () => {
      const content = `Lady Catherine de Bourgh entered the room with her usual imperious manner.
      "Mr. Collins," she declared, "you must attend to this matter immediately."

      Dr. Watson observed Holmes carefully as he examined the evidence.`;

      const metadata: FileMetadata = {
        path: '/test/characters.txt',
        filename: 'characters.txt',
        extension: '.txt'
      };

      const result = adapter.extract(content, metadata);
      const characterEntities = result.filter(e => e.metadata?.entityType === 'character');
      const characterNames = characterEntities.map(e => e.name);

      expect(characterNames).toContain('Lady Catherine de Bourgh');
      expect(characterNames).toContain('Mr. Collins');
      expect(characterNames).toContain('Dr. Watson');
      expect(characterNames).toContain('Holmes');
    });

    it('should not identify common words as character names', () => {
      const content = `The sun was shining brightly. It was a beautiful day.
      Many people were walking in the park. They seemed happy.`;

      const metadata: FileMetadata = {
        path: '/test/description.txt',
        filename: 'description.txt',
        extension: '.txt'
      };

      const result = adapter.extract(content, metadata);
      const characterEntities = result.filter(e => e.metadata?.entityType === 'character');

      // Should not identify common words as characters
      const characterNames = characterEntities.map(e => e.name.toLowerCase());
      expect(characterNames).not.toContain('the');
      expect(characterNames).not.toContain('sun');
      expect(characterNames).not.toContain('day');
      expect(characterNames).not.toContain('people');
    });
  });

  describe('Scene Detection', () => {
    it('should identify scene breaks with explicit markers', () => {
      const content = `Chapter 1: The Beginning

John walked into the room.

* * *

Sarah was waiting for him in the garden.

---

The next morning, they met for breakfast.`;

      const metadata: FileMetadata = {
        path: '/test/scenes.txt',
        filename: 'scenes.txt',
        extension: '.txt'
      };

      const result = adapter.extract(content, metadata);
      const sceneEntities = result.filter(e => e.metadata?.entityType === 'scene');

      expect(sceneEntities.length).toBeGreaterThan(0);

      // Should identify scene breaks
      const sceneNames = sceneEntities.map(e => e.name);
      expect(sceneNames.some(name => name.includes('Scene'))).toBe(true);
    });

    it('should identify chapters as major scene divisions', () => {
      const content = `Chapter 1: The Adventure Begins

Once upon a time, there was a brave knight.

Chapter 2: The Quest

The knight set out on his journey.`;

      const metadata: FileMetadata = {
        path: '/test/chapters.txt',
        filename: 'chapters.txt',
        extension: '.txt'
      };

      const result = adapter.extract(content, metadata);

      // Should identify chapters
      const chapterEntities = result.filter(e =>
        e.type === 'section' && e.name.toLowerCase().includes('chapter')
      );

      expect(chapterEntities.length).toBe(2);
      expect(chapterEntities[0].name).toContain('Chapter 1');
      expect(chapterEntities[1].name).toContain('Chapter 2');
    });

    it('should detect time transitions as scene indicators', () => {
      const content = `John woke up early that morning.

Later that day, he met Sarah at the cafe.

The next evening, they attended a concert together.

Three days later, everything changed.`;

      const metadata: FileMetadata = {
        path: '/test/time.txt',
        filename: 'time.txt',
        extension: '.txt'
      };

      const result = adapter.extract(content, metadata);
      const timeEntities = result.filter(e => e.metadata?.entityType === 'time_marker');

      expect(timeEntities.length).toBeGreaterThan(0);

      const timeNames = timeEntities.map(e => e.name);
      expect(timeNames).toContain('Later that day');
      expect(timeNames).toContain('The next evening');
      expect(timeNames).toContain('Three days later');
    });
  });

  describe('Location Detection', () => {
    it('should identify explicit locations', () => {
      const content = `Elizabeth visited London last week. She stayed at the Grand Hotel.

      The next day, she took a train to Paris and explored the Eiffel Tower.

      From there, she traveled to New York City and saw the Statue of Liberty.`;

      const metadata: FileMetadata = {
        path: '/test/locations.txt',
        filename: 'locations.txt',
        extension: '.txt'
      };

      const result = adapter.extract(content, metadata);
      const locationEntities = result.filter(e => e.metadata?.entityType === 'location');

      expect(locationEntities.length).toBeGreaterThan(0);

      const locationNames = locationEntities.map(e => e.name);
      expect(locationNames).toContain('London');
      expect(locationNames).toContain('Grand Hotel');
      expect(locationNames).toContain('Paris');
      expect(locationNames).toContain('Eiffel Tower');
      expect(locationNames).toContain('New York City');
      expect(locationNames).toContain('Statue of Liberty');
    });

    it('should identify generic location types', () => {
      const content = `They met at the restaurant for dinner.

      Later, they walked through the park and sat on a bench.

      He drove her home to her apartment building.`;

      const metadata: FileMetadata = {
        path: '/test/generic_locations.txt',
        filename: 'generic_locations.txt',
        extension: '.txt'
      };

      const result = adapter.extract(content, metadata);
      const locationEntities = result.filter(e => e.metadata?.entityType === 'location');

      const locationNames = locationEntities.map(e => e.name);
      expect(locationNames).toContain('restaurant');
      expect(locationNames).toContain('park');
      expect(locationNames).toContain('apartment building');
    });
  });

  describe('Narrative Structure Analysis', () => {
    it('should identify dialogue sections', () => {
      const content = `"Hello there," John said cheerfully.

      "Good morning," Sarah replied with a smile.

      "How has your day been?"

      "Quite wonderful, thank you for asking."`;

      const metadata: FileMetadata = {
        path: '/test/dialogue.txt',
        filename: 'dialogue.txt',
        extension: '.txt'
      };

      const result = adapter.extract(content, metadata);
      const dialogueEntities = result.filter(e => e.metadata?.entityType === 'dialogue');

      expect(dialogueEntities.length).toBeGreaterThan(0);

      // Each dialogue line should be identified
      expect(dialogueEntities.length).toBe(4);
    });

    it('should identify narrative description vs dialogue', () => {
      const content = `The morning sun cast long shadows across the meadow.

      "What a beautiful day," Mary exclaimed.

      She walked slowly through the tall grass, enjoying the peaceful silence.

      "I could stay here forever," she whispered to herself.`;

      const metadata: FileMetadata = {
        path: '/test/mixed.txt',
        filename: 'mixed.txt',
        extension: '.txt'
      };

      const result = adapter.extract(content, metadata);

      const dialogueEntities = result.filter(e => e.metadata?.entityType === 'dialogue');
      const narrativeEntities = result.filter(e => e.metadata?.entityType === 'narrative');

      expect(dialogueEntities.length).toBe(2); // Two dialogue lines
      expect(narrativeEntities.length).toBeGreaterThan(0); // Narrative sections
    });
  });

  describe('Character Relationships', () => {
    it('should detect relationships from dialogue patterns', () => {
      const content = `"Good morning, Mom," Sarah said as she entered the kitchen.

      "Hello, dear," her mother replied warmly.

      Dr. Smith examined the patient carefully while Nurse Johnson took notes.`;

      const metadata: FileMetadata = {
        path: '/test/relationships.txt',
        filename: 'relationships.txt',
        extension: '.txt'
      };

      const result = adapter.extract(content, metadata);
      const entities = result;

      // Should have relationship detection method
      if (adapter.detectRelationships) {
        const relationships = adapter.detectRelationships(entities);
        expect(relationships).toBeDefined();
        expect(Array.isArray(relationships)).toBe(true);

        // Should detect family relationship
        const familyRel = relationships.find(r =>
          r.metadata && r.metadata.relationshipType === 'family'
        );
        expect(familyRel).toBeDefined();

        // Should detect professional relationship
        const professionalRel = relationships.find(r =>
          r.metadata && r.metadata.relationshipType === 'professional'
        );
        expect(professionalRel).toBeDefined();
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should process large novels efficiently', () => {
      // Create a large novel-like text (approximately 50KB)
      const largeContent = Array(5000).fill(
        'Elizabeth walked through the garden, thinking of Mr. Darcy. ' +
        '"What a lovely morning," she said to herself. ' +
        'The roses were in full bloom, and the birds sang sweetly. ' +
        'She remembered their conversation from the previous evening. '
      ).join('\n');

      const metadata: FileMetadata = {
        path: '/test/large_novel.txt',
        filename: 'large_novel.txt',
        extension: '.txt'
      };

      const startTime = Date.now();
      const result = adapter.extract(largeContent, metadata);
      const endTime = Date.now();

      const processingTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(processingTime).toBeLessThan(2000); // Should process in under 2 seconds
    });
  });

  describe('Error Handling', () => {
    it('should handle empty content gracefully', () => {
      const content = '';
      const metadata: FileMetadata = {
        path: '/test/empty.txt',
        filename: 'empty.txt',
        extension: '.txt'
      };

      const result = adapter.extract(content, metadata);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // Should still have document entity even for empty content
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle malformed content gracefully', () => {
      const content = '\x00\x01\x02 Some text with binary \xff\xfe data';
      const metadata: FileMetadata = {
        path: '/test/malformed.txt',
        filename: 'malformed.txt',
        extension: '.txt'
      };

      expect(() => {
        const result = adapter.extract(content, metadata);
        expect(result).toBeDefined();
      }).not.toThrow();
    });
  });
});