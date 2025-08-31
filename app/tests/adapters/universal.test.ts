import { describe, it, expect, beforeEach } from 'vitest';
import { UniversalFallbackAdapter } from '../../src/adapters/UniversalFallbackAdapter';
import type { Entity, FileMetadata, Relationship } from '../../src/types/entity';

describe('UniversalFallbackAdapter', () => {
  let adapter: UniversalFallbackAdapter;
  
  beforeEach(() => {
    adapter = new UniversalFallbackAdapter();
  });

  describe('Basic Functionality', () => {
    it('should be instantiable', () => {
      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(UniversalFallbackAdapter);
    });

    it('should have an extract method', () => {
      expect(adapter.extract).toBeDefined();
      expect(typeof adapter.extract).toBe('function');
    });
  });

  describe('Document Entity Extraction', () => {
    it('should create a document entity for any file', () => {
      const content = 'Simple text content';
      const metadata: FileMetadata = {
        path: '/test/file.txt',
        filename: 'file.txt',
        extension: '.txt'
      };

      const entities = adapter.extract(content, metadata);
      
      expect(entities).toHaveLength(2); // document + paragraph
      const docEntity = entities.find(e => e.type === 'document');
      expect(docEntity).toBeDefined();
      expect(docEntity?.name).toBe('file.txt');
      expect(docEntity?.type).toBe('document');
      expect(docEntity?.id).toBeDefined();
      expect(docEntity?.metadata?.filename).toBe('file.txt');
      expect(docEntity?.metadata?.format).toBe('.txt');
    });

    it('should handle empty content', () => {
      const content = '';
      const metadata: FileMetadata = {
        path: '/test/empty.txt',
        filename: 'empty.txt',
        extension: '.txt'
      };

      const entities = adapter.extract(content, metadata);
      
      expect(entities).toHaveLength(1);
      expect(entities[0].type).toBe('document');
      expect(entities[0].content).toBe('');
    });

    it('should handle content with only whitespace', () => {
      const content = '   \n\n  \t  \n  ';
      const metadata: FileMetadata = {
        path: '/test/whitespace.txt',
        filename: 'whitespace.txt',
        extension: '.txt'
      };

      const entities = adapter.extract(content, metadata);
      
      expect(entities).toHaveLength(1);
      expect(entities[0].type).toBe('document');
    });
  });

  describe('Paragraph Extraction', () => {
    it('should extract single paragraph', () => {
      const content = 'This is a single paragraph of text.';
      const metadata: FileMetadata = {
        path: '/test/single.txt',
        filename: 'single.txt',
        extension: '.txt'
      };

      const entities = adapter.extract(content, metadata);
      const paragraphs = entities.filter(e => e.type === 'paragraph');
      
      expect(paragraphs).toHaveLength(1);
      expect(paragraphs[0].content).toBe('This is a single paragraph of text.');
    });

    it('should extract multiple paragraphs separated by double newlines', () => {
      const content = `First paragraph here.

Second paragraph here.

Third paragraph here.`;
      
      const metadata: FileMetadata = {
        path: '/test/multi.txt',
        filename: 'multi.txt',
        extension: '.txt'
      };

      const entities = adapter.extract(content, metadata);
      const paragraphs = entities.filter(e => e.type === 'paragraph');
      
      expect(paragraphs).toHaveLength(3);
      expect(paragraphs[0].content).toBe('First paragraph here.');
      expect(paragraphs[1].content).toBe('Second paragraph here.');
      expect(paragraphs[2].content).toBe('Third paragraph here.');
    });

    it('should track line numbers for paragraphs', () => {
      const content = `Line 1
Line 2

Line 4
Line 5`;
      
      const metadata: FileMetadata = {
        path: '/test/lines.txt',
        filename: 'lines.txt',
        extension: '.txt'
      };

      const entities = adapter.extract(content, metadata);
      const paragraphs = entities.filter(e => e.type === 'paragraph');
      
      expect(paragraphs[0].metadata?.lineNumbers).toEqual([1, 2]);
      expect(paragraphs[1].metadata?.lineNumbers).toEqual([4, 5]);
    });
  });

  describe('Markdown Structure Extraction', () => {
    it('should extract markdown headers as sections', () => {
      const content = `# Main Title

Some content here.

## Subsection

More content.

### Sub-subsection

Even more content.`;

      const metadata: FileMetadata = {
        path: '/test/doc.md',
        filename: 'doc.md',
        extension: '.md'
      };

      const entities = adapter.extract(content, metadata);
      const sections = entities.filter(e => e.type === 'section');
      
      expect(sections).toHaveLength(3);
      expect(sections[0].name).toBe('Main Title');
      expect(sections[0].metadata?.level).toBe(1);
      expect(sections[1].name).toBe('Subsection');
      expect(sections[1].metadata?.level).toBe(2);
      expect(sections[2].name).toBe('Sub-subsection');
      expect(sections[2].metadata?.level).toBe(3);
    });

    it('should handle headers with special characters', () => {
      const content = `# Title with "quotes" and 'apostrophes'
## Title with special chars: @#$%^&*()`;

      const metadata: FileMetadata = {
        path: '/test/special.md',
        filename: 'special.md',
        extension: '.md'
      };

      const entities = adapter.extract(content, metadata);
      const sections = entities.filter(e => e.type === 'section');
      
      expect(sections[0].name).toBe('Title with "quotes" and \'apostrophes\'');
      expect(sections[1].name).toBe('Title with special chars: @#$%^&*()');
    });
  });

  describe('List Extraction', () => {
    it('should extract unordered lists', () => {
      const content = `Some text

- First item
- Second item
- Third item

More text`;

      const metadata: FileMetadata = {
        path: '/test/list.md',
        filename: 'list.md',
        extension: '.md'
      };

      const entities = adapter.extract(content, metadata);
      const lists = entities.filter(e => e.type === 'list');
      const listItems = entities.filter(e => e.type === 'list-item');
      
      expect(lists).toHaveLength(1);
      expect(listItems).toHaveLength(3);
      expect(listItems[0].content).toBe('First item');
      expect(listItems[1].content).toBe('Second item');
      expect(listItems[2].content).toBe('Third item');
    });

    it('should extract ordered lists', () => {
      const content = `1. First step
2. Second step
3. Third step`;

      const metadata: FileMetadata = {
        path: '/test/ordered.md',
        filename: 'ordered.md',
        extension: '.md'
      };

      const entities = adapter.extract(content, metadata);
      const listItems = entities.filter(e => e.type === 'list-item');
      
      expect(listItems).toHaveLength(3);
      expect(listItems[0].content).toBe('First step');
    });

    it('should handle nested lists', () => {
      const content = `- Parent item
  - Nested item 1
  - Nested item 2
- Another parent`;

      const metadata: FileMetadata = {
        path: '/test/nested.md',
        filename: 'nested.md',
        extension: '.md'
      };

      const entities = adapter.extract(content, metadata);
      const listItems = entities.filter(e => e.type === 'list-item');
      
      expect(listItems.length).toBeGreaterThan(0);
    });
  });

  describe('Reference Extraction', () => {
    it('should extract URLs as references', () => {
      const content = `Check out https://example.com for more info.
Also see http://test.org and www.sample.com`;

      const metadata: FileMetadata = {
        path: '/test/urls.txt',
        filename: 'urls.txt',
        extension: '.txt'
      };

      const entities = adapter.extract(content, metadata);
      const references = entities.filter(e => e.type === 'reference');
      
      expect(references.length).toBeGreaterThanOrEqual(2);
      expect(references[0].name).toContain('example.com');
      expect(references[0].metadata?.url).toBe('https://example.com');
    });

    it('should extract file paths as references', () => {
      const content = `See the file at /usr/local/bin/script.sh
Or check ./relative/path.txt
Windows path: C:\\Users\\test\\file.doc`;

      const metadata: FileMetadata = {
        path: '/test/paths.txt',
        filename: 'paths.txt',
        extension: '.txt'
      };

      const entities = adapter.extract(content, metadata);
      const references = entities.filter(e => e.type === 'reference');
      
      expect(references.length).toBeGreaterThanOrEqual(2);
      const filePaths = references.filter(r => r.metadata?.referenceType === 'file');
      expect(filePaths.length).toBeGreaterThan(0);
    });

    it('should extract markdown links', () => {
      const content = `Here is a [link to Google](https://google.com).
And an [internal link](./docs/readme.md).`;

      const metadata: FileMetadata = {
        path: '/test/links.md',
        filename: 'links.md',
        extension: '.md'
      };

      const entities = adapter.extract(content, metadata);
      const references = entities.filter(e => e.type === 'reference');
      
      expect(references.length).toBeGreaterThanOrEqual(2);
      expect(references.find(r => r.name === 'link to Google')).toBeDefined();
      expect(references.find(r => r.metadata?.url === 'https://google.com')).toBeDefined();
    });
  });

  describe('Relationship Detection', () => {
    it('should create contains relationships between document and content', () => {
      const content = `# Title

Paragraph content.`;

      const metadata: FileMetadata = {
        path: '/test/rel.md',
        filename: 'rel.md',
        extension: '.md'
      };

      const entities = adapter.extract(content, metadata);
      const document = entities.find(e => e.type === 'document');
      
      expect(document?.relationships).toBeDefined();
      const containsRels = document?.relationships?.filter(r => r.type === 'contains');
      expect(containsRels?.length).toBeGreaterThan(0);
    });

    it('should create part-of relationships from content to document', () => {
      const content = 'Simple paragraph.';
      const metadata: FileMetadata = {
        path: '/test/part.txt',
        filename: 'part.txt',
        extension: '.txt'
      };

      const entities = adapter.extract(content, metadata);
      const paragraph = entities.find(e => e.type === 'paragraph');
      
      expect(paragraph?.relationships).toBeDefined();
      const partOfRels = paragraph?.relationships?.filter(r => r.type === 'part-of');
      expect(partOfRels?.length).toBe(1);
    });

    it('should create follows/precedes relationships between sequential elements', () => {
      const content = `First paragraph.

Second paragraph.`;

      const metadata: FileMetadata = {
        path: '/test/seq.txt',
        filename: 'seq.txt',
        extension: '.txt'
      };

      const entities = adapter.extract(content, metadata);
      const paragraphs = entities.filter(e => e.type === 'paragraph');
      
      expect(paragraphs[0].relationships?.some(r => 
        r.type === 'follows' && r.target === paragraphs[1].id
      )).toBe(false); // First doesn't follow second
      
      expect(paragraphs[1].relationships?.some(r => 
        r.type === 'follows' && r.target === paragraphs[0].id
      )).toBe(true); // Second follows first
    });

    it('should link list items to their parent list', () => {
      const content = `- Item 1
- Item 2`;

      const metadata: FileMetadata = {
        path: '/test/list-rel.md',
        filename: 'list-rel.md',
        extension: '.md'
      };

      const entities = adapter.extract(content, metadata);
      const list = entities.find(e => e.type === 'list');
      const items = entities.filter(e => e.type === 'list-item');
      
      expect(list?.relationships?.filter(r => r.type === 'contains').length).toBe(2);
      items.forEach(item => {
        expect(item.relationships?.some(r => 
          r.type === 'part-of' && r.target === list?.id
        )).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large content (performance test)', () => {
      const largeContent = 'Lorem ipsum '.repeat(10000); // ~120KB
      const metadata: FileMetadata = {
        path: '/test/large.txt',
        filename: 'large.txt',
        extension: '.txt'
      };

      const startTime = Date.now();
      const entities = adapter.extract(largeContent, metadata);
      const duration = Date.now() - startTime;
      
      expect(entities).toBeDefined();
      expect(duration).toBeLessThan(100); // Should process in under 100ms
    });

    it('should handle binary-like content gracefully', () => {
      const binaryLike = '\x00\x01\x02\xFF\xFE\xFD' + 'Some text' + '\x00\x00';
      const metadata: FileMetadata = {
        path: '/test/binary.bin',
        filename: 'binary.bin',
        extension: '.bin'
      };

      const entities = adapter.extract(binaryLike, metadata);
      
      expect(entities).toBeDefined();
      expect(entities.length).toBeGreaterThanOrEqual(1); // At least document entity
      // Should not throw errors
    });

    it('should handle mixed line endings', () => {
      const content = 'Line 1\rLine 2\nLine 3\r\nLine 4';
      const metadata: FileMetadata = {
        path: '/test/mixed.txt',
        filename: 'mixed.txt',
        extension: '.txt'
      };

      const entities = adapter.extract(content, metadata);
      
      expect(entities).toBeDefined();
      // Should normalize line endings properly
    });

    it('should handle Unicode content', () => {
      const content = `# 你好世界 🌍
      
这是中文段落。

## Émojis 😀🎉🚀

Unicode: αβγδ ΑΒΓΔ`;

      const metadata: FileMetadata = {
        path: '/test/unicode.md',
        filename: 'unicode.md',
        extension: '.md'
      };

      const entities = adapter.extract(content, metadata);
      const sections = entities.filter(e => e.type === 'section');
      
      expect(sections[0].name).toBe('你好世界 🌍');
      expect(sections[1].name).toBe('Émojis 😀🎉🚀');
    });

    it('should handle malformed markdown gracefully', () => {
      const content = `### No H1 or H2, straight to H3

## Back to H2

#Not a header (no space)

####### Too many hashes`;

      const metadata: FileMetadata = {
        path: '/test/malformed.md',
        filename: 'malformed.md',
        extension: '.md'
      };

      const entities = adapter.extract(content, metadata);
      
      expect(entities).toBeDefined();
      expect(() => adapter.extract(content, metadata)).not.toThrow();
    });
  });

  describe('File Format Handling', () => {
    it('should handle .txt files', () => {
      const content = 'Plain text content';
      const metadata: FileMetadata = {
        path: '/test/plain.txt',
        filename: 'plain.txt',
        extension: '.txt'
      };

      const entities = adapter.extract(content, metadata);
      expect(entities[0].metadata?.format).toBe('.txt');
    });

    it('should handle .md files with markdown features', () => {
      const content = '# Markdown\n**Bold** and *italic*';
      const metadata: FileMetadata = {
        path: '/test/markdown.md',
        filename: 'markdown.md',
        extension: '.md'
      };

      const entities = adapter.extract(content, metadata);
      expect(entities[0].metadata?.format).toBe('.md');
      expect(entities.some(e => e.type === 'section')).toBe(true);
    });

    it('should handle unknown extensions as plain text', () => {
      const content = 'Unknown format content';
      const metadata: FileMetadata = {
        path: '/test/unknown.xyz',
        filename: 'unknown.xyz',
        extension: '.xyz'
      };

      const entities = adapter.extract(content, metadata);
      expect(entities).toBeDefined();
      expect(entities[0].metadata?.format).toBe('.xyz');
    });

    it('should handle files without extension', () => {
      const content = 'No extension content';
      const metadata: FileMetadata = {
        path: '/test/README',
        filename: 'README',
        extension: ''
      };

      const entities = adapter.extract(content, metadata);
      expect(entities).toBeDefined();
      expect(entities[0].name).toBe('README');
    });
  });
});