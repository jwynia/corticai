import type { 
  DomainAdapter, 
  Entity, 
  FileMetadata, 
  Relationship,
  EntityMetadata 
} from '../types/entity';

/**
 * Universal Fallback Adapter - Foundation for all domain-specific adapters
 * 
 * This adapter extracts basic entities from any text file without configuration.
 * It serves as the base implementation that other adapters can extend.
 * 
 * Based on universal patterns research that identified common structures
 * across all domains (hierarchies, references, containers, etc.)
 */
export class UniversalFallbackAdapter implements DomainAdapter {
  private entityCounter = 0;
  private entityCounts: Record<string, number> = {};
  
  // Constants for line counting
  private static readonly BLANK_LINE_INCREMENT = 1;
  private static readonly NEXT_LINE_OFFSET = 2;
  
  /**
   * Generate a unique ID for an entity
   */
  private generateId(): string {
    return `entity_${Date.now()}_${++this.entityCounter}`;
  }

  /**
   * Main extraction method - processes content and returns entities
   */
  extract(content: string, metadata: FileMetadata): Entity[] {
    const entities: Entity[] = [];
    
    // Reset counters for each extraction
    this.entityCounter = 0;
    this.entityCounts = {};
    
    // Create document entity (root container)
    const documentId = this.generateId();
    const documentEntity: Entity = {
      id: documentId,
      type: 'document',
      name: metadata.filename,
      content: content,
      metadata: {
        filename: metadata.filename,
        format: metadata.extension,
        lineNumbers: [1, content.split('\n').length]
      },
      relationships: []
    };
    entities.push(documentEntity);
    
    // If content is empty or only whitespace, return just the document
    if (!content.trim()) {
      return entities;
    }
    
    // Extract based on file type
    if (metadata.extension === '.md') {
      this.extractMarkdownEntities(content, entities, documentId);
    } else {
      this.extractPlainTextEntities(content, entities, documentId);
    }
    
    // Extract references from any content type
    this.extractReferences(content, entities, documentId);
    
    // Build relationships between entities
    this.buildRelationships(entities);
    
    return entities;
  }

  /**
   * Extract entities from plain text files
   */
  private extractPlainTextEntities(
    content: string, 
    entities: Entity[], 
    documentId: string
  ): void {
    // Normalize line endings
    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Split into paragraphs (separated by double newlines)
    const paragraphs = normalizedContent
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    let currentLine = 1;
    
    for (const paragraphText of paragraphs) {
      const lineCount = paragraphText.split('\n').length;
      const paragraphId = this.generateId();
      
      const paragraph: Entity = {
        id: paragraphId,
        type: 'paragraph',
        name: `Paragraph ${(this.entityCounts['paragraph'] = (this.entityCounts['paragraph'] || 0) + 1)}`,
        content: paragraphText,
        metadata: {
          lineNumbers: [currentLine, currentLine + lineCount - 1]
        },
        relationships: [
          { type: 'part-of', target: documentId }
        ]
      };
      
      entities.push(paragraph);
      
      // Update document's relationships
      const doc = entities.find(e => e.id === documentId);
      if (doc && doc.relationships) {
        doc.relationships.push({ type: 'contains', target: paragraphId });
      }
      
      currentLine += lineCount + UniversalFallbackAdapter.BLANK_LINE_INCREMENT; // for the blank line
    }
  }

  /**
   * Extract entities from Markdown files
   */
  private extractMarkdownEntities(
    content: string, 
    entities: Entity[], 
    documentId: string
  ): void {
    const lines = content.split('\n');
    let currentLine = 1;
    let currentText = '';
    let inList = false;
    let currentListId: string | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];
      
      // Check for headers
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        // Save any accumulated text as a paragraph
        if (currentText.trim()) {
          this.createParagraphEntity(currentText.trim(), entities, documentId, currentLine);
          currentText = '';
        }
        
        const level = headerMatch[1].length;
        const title = headerMatch[2].trim();
        const sectionId = this.generateId();
        
        const section: Entity = {
          id: sectionId,
          type: 'section',
          name: title,
          content: title,
          metadata: {
            level,
            lineNumbers: [i + 1, i + 1]
          },
          relationships: [
            { type: 'part-of', target: documentId }
          ]
        };
        
        entities.push(section);
        
        // Update document's relationships
        const doc = entities.find(e => e.id === documentId);
        if (doc && doc.relationships) {
          doc.relationships.push({ type: 'contains', target: sectionId });
        }
        
        currentLine = i + 2;
        continue;
      }
      
      // Check for list items
      const listItemMatch = line.match(/^(\s*)[-*+]\s+(.+)$/) || 
                           line.match(/^(\s*)\d+\.\s+(.+)$/);
      if (listItemMatch) {
        // Save any accumulated text as a paragraph
        if (currentText.trim() && !inList) {
          this.createParagraphEntity(currentText.trim(), entities, documentId, currentLine);
          currentText = '';
        }
        
        // Create list container if starting new list
        if (!inList) {
          currentListId = this.generateId();
          const list: Entity = {
            id: currentListId,
            type: 'list',
            name: `List ${(this.entityCounts['list'] = (this.entityCounts['list'] || 0) + 1)}`,
            metadata: {
              lineNumbers: [i + 1, i + 1] // Will update end line
            },
            relationships: [
              { type: 'part-of', target: documentId }
            ]
          };
          entities.push(list);
          
          // Update document's relationships
          const doc = entities.find(e => e.id === documentId);
          if (doc && doc.relationships) {
            doc.relationships.push({ type: 'contains', target: currentListId });
          }
          
          inList = true;
        }
        
        // Create list item
        const itemText = listItemMatch[2].trim();
        const itemId = this.generateId();
        const listItem: Entity = {
          id: itemId,
          type: 'list-item',
          name: `Item ${(this.entityCounts['list-item'] = (this.entityCounts['list-item'] || 0) + 1)}`,
          content: itemText,
          metadata: {
            lineNumbers: [i + 1, i + 1]
          },
          relationships: [
            { type: 'part-of', target: currentListId! }
          ]
        };
        entities.push(listItem);
        
        // Update list's relationships
        const list = entities.find(e => e.id === currentListId);
        if (list) {
          if (!list.relationships) list.relationships = [];
          list.relationships.push({ type: 'contains', target: itemId });
          // Update list end line
          if (list.metadata) {
            list.metadata.lineNumbers = [list.metadata.lineNumbers![0], i + 1];
          }
        }
        
        currentLine = i + 2;
        continue;
      }
      
      // Check if we're ending a list
      if (inList && !listItemMatch && line.trim() !== '') {
        inList = false;
        currentListId = null;
      }
      
      // Accumulate regular text
      if (!line.match(/^#/) && !listItemMatch) {
        if (line.trim() === '' && currentText.trim()) {
          // Empty line - end of paragraph
          this.createParagraphEntity(currentText.trim(), entities, documentId, currentLine);
          currentText = '';
          currentLine = i + 2;
        } else if (line.trim()) {
          currentText += (currentText ? '\n' : '') + line;
        }
      }
    }
    
    // Save any remaining text as a paragraph
    if (currentText.trim()) {
      this.createParagraphEntity(currentText.trim(), entities, documentId, currentLine);
    }
  }

  /**
   * Create a paragraph entity
   */
  private createParagraphEntity(
    text: string,
    entities: Entity[],
    documentId: string,
    startLine: number
  ): void {
    const lineCount = text.split('\n').length;
    const paragraphId = this.generateId();
    
    const paragraph: Entity = {
      id: paragraphId,
      type: 'paragraph',
      name: `Paragraph ${entities.filter(e => e.type === 'paragraph').length + 1}`,
      content: text,
      metadata: {
        lineNumbers: [startLine, startLine + lineCount - 1]
      },
      relationships: [
        { type: 'part-of', target: documentId }
      ]
    };
    
    entities.push(paragraph);
    
    // Update document's relationships
    const doc = entities.find(e => e.id === documentId);
    if (doc && doc.relationships) {
      doc.relationships.push({ type: 'contains', target: paragraphId });
    }
  }

  /**
   * Extract references (URLs, file paths, markdown links)
   */
  private extractReferences(
    content: string,
    entities: Entity[],
    documentId: string
  ): void {
    // Extract URLs
    const urlRegex = /https?:\/\/[^\s\)]+|www\.[^\s\)]+/gi;
    const urls = content.match(urlRegex) || [];
    
    for (const url of urls) {
      const refId = this.generateId();
      const reference: Entity = {
        id: refId,
        type: 'reference',
        name: url,
        content: url,
        metadata: {
          url: url.startsWith('www.') ? `http://${url}` : url,
          referenceType: 'url'
        },
        relationships: [
          { type: 'part-of', target: documentId }
        ]
      };
      entities.push(reference);
    }
    
    // Extract markdown links [text](url)
    const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = mdLinkRegex.exec(content)) !== null) {
      const [fullMatch, linkText, linkUrl] = match;
      const refId = this.generateId();
      const reference: Entity = {
        id: refId,
        type: 'reference',
        name: linkText,
        content: linkUrl,
        metadata: {
          url: linkUrl,
          referenceType: linkUrl.startsWith('http') ? 'url' : 'file',
          displayText: linkText
        },
        relationships: [
          { type: 'part-of', target: documentId }
        ]
      };
      entities.push(reference);
    }
    
    // Extract file paths (Unix/Windows)
    const filePathRegex = /(?:\/[\w.-]+)+(?:\/[\w.-]+)*|(?:[A-Z]:\\[\w\\.-]+)+|(?:\.\/[\w.-\/]+)/g;
    const paths = content.match(filePathRegex) || [];
    
    for (const path of paths) {
      // Skip if it's already captured as a URL
      if (path.includes('://')) continue;
      
      const refId = this.generateId();
      const reference: Entity = {
        id: refId,
        type: 'reference',
        name: path,
        content: path,
        metadata: {
          path: path,
          referenceType: 'file'
        },
        relationships: [
          { type: 'part-of', target: documentId }
        ]
      };
      entities.push(reference);
    }
  }

  /**
   * Build sequential relationships between entities
   */
  private buildRelationships(entities: Entity[]): void {
    // Add follows/precedes relationships for sequential elements
    const paragraphs = entities.filter(e => e.type === 'paragraph');
    const sections = entities.filter(e => e.type === 'section');
    const listItems = entities.filter(e => e.type === 'list-item');
    
    // Sequential relationships for paragraphs
    for (let i = 1; i < paragraphs.length; i++) {
      if (!paragraphs[i].relationships) {
        paragraphs[i].relationships = [];
      }
      paragraphs[i].relationships!.push({
        type: 'follows',
        target: paragraphs[i - 1].id
      });
      
      if (!paragraphs[i - 1].relationships) {
        paragraphs[i - 1].relationships = [];
      }
      paragraphs[i - 1].relationships!.push({
        type: 'precedes',
        target: paragraphs[i].id
      });
    }
    
    // Sequential relationships for sections
    for (let i = 1; i < sections.length; i++) {
      if (!sections[i].relationships) {
        sections[i].relationships = [];
      }
      sections[i].relationships!.push({
        type: 'follows',
        target: sections[i - 1].id
      });
    }
    
    // Sequential relationships for list items within same list
    const listGroups = new Map<string, Entity[]>();
    for (const item of listItems) {
      const parentList = item.relationships?.find(r => r.type === 'part-of')?.target;
      if (parentList) {
        if (!listGroups.has(parentList)) {
          listGroups.set(parentList, []);
        }
        listGroups.get(parentList)!.push(item);
      }
    }
    
    for (const items of Array.from(listGroups.values())) {
      for (let i = 1; i < items.length; i++) {
        if (!items[i].relationships) {
          items[i].relationships = [];
        }
        items[i].relationships!.push({
          type: 'follows',
          target: items[i - 1].id
        });
      }
    }
  }
}