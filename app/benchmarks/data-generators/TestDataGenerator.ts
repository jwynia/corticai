/**
 * Test Data Generator for Benchmarks
 * 
 * This class generates realistic test data for benchmarking storage adapters
 * and query executors across different dataset sizes.
 */

import { TestEntity, DatasetConfig, EntityConfig } from '../types/index.js'

export class TestDataGenerator {
  private config: EntityConfig
  private random: () => number

  constructor(config?: Partial<EntityConfig>, seed?: number) {
    this.config = {
      fields: {
        id: true,
        name: true,
        age: true,
        active: true,
        tags: true,
        createdAt: true,
        score: true,
        category: true,
        priority: true,
        metadata: true
      },
      distributions: {
        age: [18, 65],
        scoreRange: [0, 100],
        categoryOptions: ['A', 'B', 'C', 'premium', 'standard', 'basic'],
        priorityRange: [1, 10],
        tagsCount: [0, 5]
      },
      ...config
    }

    // Simple seeded random number generator for reproducible data
    if (seed !== undefined) {
      let seedValue = seed
      this.random = () => {
        seedValue = (seedValue * 9301 + 49297) % 233280
        return seedValue / 233280
      }
    } else {
      this.random = Math.random
    }
  }

  /**
   * Generate a dataset of the specified size
   */
  generateDataset(size: number, seed?: number): TestEntity[] {
    if (seed !== undefined) {
      // Reset random with seed for reproducible datasets
      let seedValue = seed
      this.random = () => {
        seedValue = (seedValue * 9301 + 49297) % 233280
        return seedValue / 233280
      }
    }

    const dataset: TestEntity[] = []
    
    for (let i = 0; i < size; i++) {
      dataset.push(this.generateEntity(i))
    }
    
    return dataset
  }

  /**
   * Generate a single test entity
   */
  private generateEntity(index: number): TestEntity {
    const entity: TestEntity = {
      id: '',
      name: '',
      age: 0,
      active: false,
      tags: [],
      createdAt: new Date()
    }

    if (this.config.fields.id) {
      entity.id = `entity-${index.toString().padStart(6, '0')}`
    }

    if (this.config.fields.name) {
      entity.name = this.generateName()
    }

    if (this.config.fields.age) {
      const [minAge, maxAge] = this.config.distributions!.age
      entity.age = Math.floor(this.random() * (maxAge - minAge + 1)) + minAge
    }

    if (this.config.fields.active) {
      entity.active = this.random() > 0.3 // 70% active
    }

    if (this.config.fields.tags) {
      entity.tags = this.generateTags()
    }

    if (this.config.fields.createdAt) {
      // Generate dates within the last year
      const now = Date.now()
      const yearAgo = now - (365 * 24 * 60 * 60 * 1000)
      entity.createdAt = new Date(yearAgo + this.random() * (now - yearAgo))
    }

    if (this.config.fields.score) {
      // 80% have scores, 20% undefined
      if (this.random() > 0.2) {
        const [minScore, maxScore] = this.config.distributions!.scoreRange
        entity.score = Math.floor(this.random() * (maxScore - minScore + 1)) + minScore
      }
    }

    if (this.config.fields.category) {
      const categories = this.config.distributions!.categoryOptions
      entity.category = categories[Math.floor(this.random() * categories.length)]
    }

    if (this.config.fields.priority) {
      const [minPri, maxPri] = this.config.distributions!.priorityRange
      entity.priority = Math.floor(this.random() * (maxPri - minPri + 1)) + minPri
    }

    if (this.config.fields.metadata) {
      entity.metadata = this.generateMetadata()
    }

    return entity
  }

  /**
   * Generate a realistic name
   */
  private generateName(): string {
    const firstNames = [
      'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry',
      'Ivy', 'Jack', 'Kate', 'Liam', 'Maya', 'Noah', 'Olivia', 'Peter',
      'Quinn', 'Rachel', 'Sam', 'Tara', 'Uma', 'Victor', 'Wendy', 'Xavier',
      'Yara', 'Zoe', 'Adam', 'Betty', 'Carl', 'Donna', 'Eric', 'Fiona'
    ]
    
    const lastNames = [
      'Johnson', 'Smith', 'Brown', 'Wilson', 'Davis', 'Miller', 'Taylor',
      'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Garcia',
      'Rodriguez', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'King'
    ]

    const firstName = firstNames[Math.floor(this.random() * firstNames.length)]
    const lastName = lastNames[Math.floor(this.random() * lastNames.length)]
    
    return `${firstName} ${lastName}`
  }

  /**
   * Generate tags array
   */
  private generateTags(): string[] {
    const allTags = [
      'developer', 'designer', 'manager', 'analyst', 'consultant',
      'typescript', 'javascript', 'python', 'java', 'go',
      'frontend', 'backend', 'fullstack', 'devops', 'mobile',
      'ai', 'ml', 'data', 'security', 'cloud'
    ]

    const [minTags, maxTags] = this.config.distributions!.tagsCount
    const tagCount = Math.floor(this.random() * (maxTags - minTags + 1)) + minTags
    
    const tags: string[] = []
    const usedIndices = new Set<number>()
    
    for (let i = 0; i < tagCount; i++) {
      let index: number
      do {
        index = Math.floor(this.random() * allTags.length)
      } while (usedIndices.has(index))
      
      usedIndices.add(index)
      tags.push(allTags[index])
    }
    
    return tags
  }

  /**
   * Generate metadata object
   */
  private generateMetadata(): Record<string, any> {
    const metadata: Record<string, any> = {}
    
    // Add some random metadata fields
    if (this.random() > 0.5) {
      metadata.department = ['Engineering', 'Design', 'Product', 'Marketing'][
        Math.floor(this.random() * 4)
      ]
    }
    
    if (this.random() > 0.3) {
      metadata.experience = Math.floor(this.random() * 15) + 1 // 1-15 years
    }
    
    if (this.random() > 0.7) {
      metadata.certifications = Math.floor(this.random() * 5) + 1
    }
    
    return metadata
  }

  /**
   * Generate performance-specific dataset optimized for benchmarks
   */
  generatePerformanceDataset(size: number, options?: {
    largeStrings?: boolean
    deepNesting?: boolean
    manyFields?: boolean
  }): TestEntity[] {
    const dataset: TestEntity[] = []
    
    for (let i = 0; i < size; i++) {
      const entity = this.generateEntity(i)
      
      // Add performance-specific modifications
      if (options?.largeStrings) {
        // Add large string field for memory/performance testing
        entity.metadata = {
          ...entity.metadata,
          description: 'x'.repeat(1024) // 1KB string
        }
      }
      
      if (options?.deepNesting) {
        // Add deeply nested object
        entity.metadata = {
          ...entity.metadata,
          nested: {
            level1: {
              level2: {
                level3: {
                  value: i,
                  data: 'nested data'
                }
              }
            }
          }
        }
      }
      
      if (options?.manyFields) {
        // Add many additional fields
        for (let j = 0; j < 50; j++) {
          entity.metadata = {
            ...entity.metadata,
            [`field${j}`]: `value${j}-${i}`
          }
        }
      }
      
      dataset.push(entity)
    }
    
    return dataset
  }

  /**
   * Generate dataset specifically for query testing with known distributions
   */
  generateQueryTestDataset(size: number): TestEntity[] {
    const dataset: TestEntity[] = []
    
    for (let i = 0; i < size; i++) {
      const entity = this.generateEntity(i)
      
      // Ensure predictable distributions for query testing
      
      // 30% active, 70% inactive for filter tests
      entity.active = (i % 10) < 3
      
      // Score distribution: 10% no score, 90% with score
      if (i % 10 === 0) {
        entity.score = undefined
      } else {
        entity.score = Math.floor(i / 10) % 100
      }
      
      // Category distribution for grouping tests
      entity.category = ['A', 'B', 'C'][i % 3]
      
      // Priority distribution
      entity.priority = (i % 10) + 1
      
      dataset.push(entity)
    }
    
    return dataset
  }

  /**
   * Create datasets of different sizes for scaling tests
   */
  generateScalingDatasets(): Map<string, TestEntity[]> {
    const datasets = new Map<string, TestEntity[]>()
    
    // Standard benchmark sizes from requirements
    const sizes = [
      { name: '1K', size: 1000 },
      { name: '10K', size: 10000 },
      { name: '100K', size: 100000 }
    ]
    
    for (const { name, size } of sizes) {
      datasets.set(name, this.generateDataset(size, 12345)) // Fixed seed for consistency
    }
    
    return datasets
  }
}