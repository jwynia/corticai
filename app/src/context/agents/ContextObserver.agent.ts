import { Agent } from '@mastra/core/agent';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { storeContextTool, batchStoreContextTool } from '../tools/index.js';

// Configure OpenRouter
const openRouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1"
});

/**
 * Message types that the observer can process
 */
export interface ObservedMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

/**
 * Extraction filters for the observer
 */
export interface ObserverFilters {
  patterns?: string[];      // Regex patterns to match
  keywords?: string[];      // Keywords to look for
  types?: string[];         // Context types to extract
  confidence?: number;      // Minimum confidence threshold (0-1)
}

/**
 * ContextObserver Agent
 *
 * Passive observation agent that monitors message streams and automatically
 * extracts and stores relevant context without interrupting the flow.
 */
export class ContextObserverAgent extends Agent {
  private filters: ObserverFilters;
  private buffer: ObservedMessage[] = [];
  private extractionQueue: any[] = [];
  private isProcessing = false;

  constructor(config?: {
    storageType?: 'memory' | 'json' | 'duckdb';
    storageConfig?: any;
    memoryStore?: LibSQLStore;
    filters?: ObserverFilters;
  }) {
    const storageConfig = {
      type: config?.storageType || 'memory',
      ...(config?.storageConfig || {}),
    };

    // Default filters
    const defaultFilters: ObserverFilters = {
      patterns: [
        'TODO|FIXME|HACK|NOTE',           // Development markers
        'decided?|decision|chose',         // Decisions
        'bug|issue|problem|error',         // Issues
        'implement|create|build|design',   // Tasks
        'because|reason|rationale',        // Rationale
      ],
      keywords: [
        'architecture', 'design', 'pattern', 'approach',
        'requirement', 'specification', 'constraint',
        'dependency', 'integration', 'interface',
      ],
      types: ['decision', 'code', 'discussion', 'todo', 'pattern'],
      confidence: 0.6,
    };

    super({
      name: 'ContextObserver',
      instructions: `
        You are a passive context observer that silently monitors conversations
        and extracts valuable context without interrupting the flow.

        Your role:
        1. Observe messages between users and assistants
        2. Identify important context worth preserving
        3. Extract and structure the context
        4. Store it silently in the background
        5. Build relationships between extracted contexts

        What to extract:
        - Decisions and their rationale
        - Code implementations and changes
        - Problems and their solutions
        - Requirements and specifications
        - Architecture and design discussions
        - TODOs and action items
        - Patterns and best practices

        Extraction principles:
        - Be selective - only extract valuable information
        - Maintain context - preserve the surrounding discussion
        - Link related items - build a knowledge graph
        - Add metadata - timestamp, participants, confidence
        - Be silent - never interrupt the conversation

        Quality criteria:
        - High signal-to-noise ratio
        - Proper categorization
        - Accurate relationships
        - Useful metadata
        - No duplication
      `,
      model: openRouter.chat('anthropic/claude-3.5-haiku'),
      tools: {
        storeContext: storeContextTool,
        batchStoreContext: batchStoreContextTool,
      },
      memory: config?.memoryStore ? new Memory({
        storage: config.memoryStore,
      }) : undefined,
    });

    this.filters = { ...defaultFilters, ...config?.filters };
    (this as any).storageConfig = storageConfig;
  }

  /**
   * Observe a single message
   */
  async observe(message: ObservedMessage): Promise<void> {
    // Add to buffer
    this.buffer.push({
      ...message,
      timestamp: message.timestamp || new Date().toISOString(),
    });

    // Keep buffer size manageable
    if (this.buffer.length > 100) {
      this.buffer = this.buffer.slice(-50); // Keep last 50 messages
    }

    // Extract context from this message
    const extractions = await this.extractFromMessage(message);

    if (extractions.length > 0) {
      this.extractionQueue.push(...extractions);

      // Process queue if not already processing
      if (!this.isProcessing) {
        this.processExtractionQueue();
      }
    }
  }

  /**
   * Observe a conversation (batch of messages)
   */
  async observeConversation(messages: ObservedMessage[]): Promise<{
    extracted: number;
    stored: number;
  }> {
    let totalExtracted = 0;
    let totalStored = 0;

    // Process each message
    for (const message of messages) {
      await this.observe(message);
    }

    // Extract patterns from the conversation
    const conversationExtractions = await this.extractFromConversation(messages);
    totalExtracted += conversationExtractions.length;

    if (conversationExtractions.length > 0) {
      const storageConfig = (this as any).storageConfig;
      const result = await batchStoreContextTool.execute({
        context: {
          entries: conversationExtractions,
          storageConfig,
          deduplicate: true,
        },
      });
      totalStored += result.stored;
    }

    // Process any remaining extractions
    await this.flushExtractionQueue();
    totalStored += this.extractionQueue.length;

    return {
      extracted: totalExtracted + this.extractionQueue.length,
      stored: totalStored,
    };
  }

  /**
   * Get observation statistics
   */
  getStatistics(): {
    bufferSize: number;
    queueSize: number;
    isProcessing: boolean;
    filters: ObserverFilters;
  } {
    return {
      bufferSize: this.buffer.length,
      queueSize: this.extractionQueue.length,
      isProcessing: this.isProcessing,
      filters: this.filters,
    };
  }

  /**
   * Update observation filters
   */
  updateFilters(filters: Partial<ObserverFilters>): void {
    this.filters = { ...this.filters, ...filters };
  }

  // Private helper methods

  private async extractFromMessage(message: ObservedMessage): Promise<any[]> {
    const extractions = [];
    const content = message.content.toLowerCase();

    // Check against patterns
    if (this.filters.patterns) {
      for (const pattern of this.filters.patterns) {
        const regex = new RegExp(pattern, 'gi');
        if (regex.test(message.content)) {
          const extraction = this.createExtraction(message, pattern);
          if (extraction) {
            extractions.push(extraction);
          }
        }
      }
    }

    // Check for keywords
    if (this.filters.keywords) {
      const foundKeywords = this.filters.keywords.filter(kw =>
        content.includes(kw.toLowerCase())
      );

      if (foundKeywords.length > 0) {
        const extraction = this.createExtraction(message, 'keyword', foundKeywords);
        if (extraction) {
          extractions.push(extraction);
        }
      }
    }

    // Deduplicate extractions
    const unique = this.deduplicateExtractions(extractions);
    return unique;
  }

  private async extractFromConversation(messages: ObservedMessage[]): Promise<any[]> {
    const extractions = [];

    // Look for decision points
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];

      // Decision pattern: question followed by answer
      if (i > 0 &&
          messages[i - 1].role === 'user' &&
          message.role === 'assistant' &&
          this.looksLikeDecision(messages[i - 1].content, message.content)) {

        extractions.push({
          type: 'decision',
          content: {
            question: messages[i - 1].content,
            answer: message.content,
          },
          metadata: {
            timestamp: message.timestamp,
            confidence: 0.8,
            source: 'conversation',
            participants: ['user', 'assistant'],
          },
        });
      }

      // Code implementation pattern
      if (message.content.includes('```') ||
          message.content.match(/function|class|const|let|var|def|import/)) {

        const codeBlocks = this.extractCodeBlocks(message.content);
        for (const block of codeBlocks) {
          extractions.push({
            type: 'code',
            content: block,
            metadata: {
              timestamp: message.timestamp,
              role: message.role,
              language: this.detectLanguage(block.code),
              confidence: 0.9,
            },
          });
        }
      }

      // TODO pattern
      const todos = this.extractTodos(message.content);
      for (const todo of todos) {
        extractions.push({
          type: 'todo',
          content: todo,
          metadata: {
            timestamp: message.timestamp,
            role: message.role,
            status: 'pending',
            confidence: 0.95,
          },
        });
      }
    }

    // Look for discussion threads
    const threads = this.identifyDiscussionThreads(messages);
    for (const thread of threads) {
      extractions.push({
        type: 'discussion',
        content: thread,
        metadata: {
          timestamp: thread.messages[0].timestamp,
          participants: [...new Set(thread.messages.map((m: any) => m.role))],
          messageCount: thread.messages.length,
          confidence: 0.7,
        },
      });
    }

    return extractions;
  }

  private createExtraction(
    message: ObservedMessage,
    trigger: string,
    keywords?: string[]
  ): any {
    // Determine context type
    const type = this.inferContextType(message.content);

    if (!this.filters.types?.includes(type)) {
      return null;
    }

    // Extract surrounding context from buffer
    const context = this.getMessageContext(message);

    return {
      type,
      content: message.content,
      metadata: {
        timestamp: message.timestamp,
        role: message.role,
        trigger,
        keywords,
        context: context.length > 0 ? context : undefined,
        confidence: this.calculateConfidence(message.content, trigger),
        ...message.metadata,
      },
    };
  }

  private getMessageContext(targetMessage: ObservedMessage): string[] {
    const index = this.buffer.findIndex(m =>
      m.timestamp === targetMessage.timestamp &&
      m.content === targetMessage.content
    );

    if (index === -1) return [];

    // Get 2 messages before and after for context
    const start = Math.max(0, index - 2);
    const end = Math.min(this.buffer.length, index + 3);

    return this.buffer
      .slice(start, end)
      .filter(m => m !== targetMessage)
      .map(m => `${m.role}: ${m.content.slice(0, 100)}...`);
  }

  private async processExtractionQueue(): Promise<void> {
    if (this.isProcessing || this.extractionQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const storageConfig = (this as any).storageConfig;

    try {
      // Process in batches
      while (this.extractionQueue.length > 0) {
        const batch = this.extractionQueue.splice(0, 10);

        await batchStoreContextTool.execute({
          context: {
            entries: batch,
            storageConfig,
            deduplicate: true,
          },
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async flushExtractionQueue(): Promise<void> {
    if (this.extractionQueue.length === 0) return;

    // Wait for current processing to finish
    while (this.isProcessing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Process remaining items
    await this.processExtractionQueue();
  }

  private inferContextType(content: string): string {
    const lower = content.toLowerCase();

    if (lower.includes('todo') || lower.includes('fixme')) return 'todo';
    if (lower.includes('decided') || lower.includes('decision')) return 'decision';
    if (lower.includes('function') || lower.includes('class') || lower.includes('```')) return 'code';
    if (lower.includes('bug') || lower.includes('error')) return 'issue';
    if (lower.includes('pattern') || lower.includes('approach')) return 'pattern';

    return 'discussion';
  }

  private calculateConfidence(content: string, trigger: string): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on content length
    if (content.length > 100) confidence += 0.1;
    if (content.length > 500) confidence += 0.1;

    // Increase confidence for specific triggers
    if (trigger === 'TODO' || trigger === 'FIXME') confidence += 0.3;
    if (trigger === 'decision' || trigger === 'decided') confidence += 0.2;

    // Ensure confidence is between 0 and 1
    return Math.min(1, Math.max(0, confidence));
  }

  private deduplicateExtractions(extractions: any[]): any[] {
    const seen = new Set<string>();
    return extractions.filter(e => {
      const key = `${e.type}:${JSON.stringify(e.content).slice(0, 100)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private looksLikeDecision(question: string, answer: string): boolean {
    const questionIndicators = ['should', 'which', 'what', 'how', 'when', 'where', 'why', '?'];
    const answerIndicators = ['recommend', 'suggest', 'should', 'would', 'best', 'prefer'];

    const hasQuestionIndicator = questionIndicators.some(ind =>
      question.toLowerCase().includes(ind)
    );
    const hasAnswerIndicator = answerIndicators.some(ind =>
      answer.toLowerCase().includes(ind)
    );

    return hasQuestionIndicator && hasAnswerIndicator;
  }

  private extractCodeBlocks(content: string): any[] {
    const blocks = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'unknown',
        code: match[2],
      });
    }

    return blocks;
  }

  private detectLanguage(code: string): string {
    if (code.includes('function') || code.includes('const')) return 'javascript';
    if (code.includes('def ') || code.includes('import ')) return 'python';
    if (code.includes('interface') || code.includes(': string')) return 'typescript';
    if (code.includes('public class')) return 'java';
    return 'unknown';
  }

  private extractTodos(content: string): string[] {
    const todos = [];
    const todoRegex = /(?:TODO|FIXME|HACK|NOTE):?\s*(.+?)(?:\n|$)/gi;
    let match;

    while ((match = todoRegex.exec(content)) !== null) {
      todos.push(match[1].trim());
    }

    return todos;
  }

  private identifyDiscussionThreads(messages: ObservedMessage[]): any[] {
    const threads = [];
    let currentThread: any = null;

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];

      // Start new thread on user message
      if (message.role === 'user') {
        if (currentThread && currentThread.messages.length > 1) {
          threads.push(currentThread);
        }
        currentThread = {
          topic: message.content.slice(0, 50),
          messages: [message],
        };
      } else if (currentThread) {
        // Continue thread
        currentThread.messages.push(message);

        // End thread if it's getting too long or topic seems to change
        if (currentThread.messages.length > 5) {
          threads.push(currentThread);
          currentThread = null;
        }
      }
    }

    // Add final thread if exists
    if (currentThread && currentThread.messages.length > 1) {
      threads.push(currentThread);
    }

    return threads;
  }
}

/**
 * Factory function to create a ContextObserver agent
 */
export function createContextObserver(config?: {
  storageType?: 'memory' | 'json' | 'duckdb';
  storageConfig?: any;
  memoryStore?: LibSQLStore;
  filters?: ObserverFilters;
}): ContextObserverAgent {
  return new ContextObserverAgent(config);
}