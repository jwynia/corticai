# Test Data Management Strategy

## Purpose
This document defines comprehensive test data management strategies for the Pliers v3 platform, covering database isolation, test data seeding, environment management, and data cleanup patterns for integration and E2E testing.

## Classification
- **Domain:** Core Concept
- **Stability:** Semi-stable
- **Abstraction:** Structural
- **Confidence:** Established

## Overview

Effective test data management is crucial for reliable, maintainable, and scalable testing. This strategy ensures that tests run with consistent, isolated data while providing mechanisms for complex scenario setup and efficient cleanup.

### Core Principles

1. **Data Isolation**: Each test should have completely isolated data
2. **Reproducibility**: Tests should produce the same results every time
3. **Realistic Data**: Test data should closely mirror production patterns
4. **Efficient Setup**: Fast data creation and cleanup processes
5. **Environment Parity**: Consistent data across development, staging, and CI
6. **Security**: No sensitive production data in test environments

## Database Management Strategy

### Database Isolation Patterns

#### 1. Database-per-Test Pattern

```typescript
// tests/setup/database-per-test.setup.ts
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

export class DatabasePerTest {
  private pool: Pool;
  private databaseName: string;
  private adminPool: Pool;

  constructor(private testId: string) {
    this.databaseName = `test_${testId}_${uuidv4().replace(/-/g, '')}`;
    this.adminPool = new Pool({
      connectionString: this.getAdminConnectionString()
    });
  }

  async initialize(): Promise<void> {
    try {
      // Create isolated test database
      await this.adminPool.query(`CREATE DATABASE "${this.databaseName}"`);

      // Connect to test database
      this.pool = new Pool({
        connectionString: this.getTestConnectionString(),
        max: 5, // Limit connections for test database
        idleTimeoutMillis: 30000
      });

      // Run migrations
      await this.runMigrations();

      // Set up test-specific configurations
      await this.setupTestConfiguration();

    } catch (error) {
      console.error(`Failed to initialize test database: ${error}`);
      throw error;
    }
  }

  private async runMigrations(): Promise<void> {
    const migrationDir = path.resolve('./migrations');

    try {
      const files = await fs.readdir(migrationDir);
      const migrationFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort();

      for (const file of migrationFiles) {
        const migrationPath = path.join(migrationDir, file);
        const migration = await fs.readFile(migrationPath, 'utf8');

        console.log(`Running migration: ${file}`);
        await this.pool.query(migration);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn('Migration directory not found, skipping migrations');
      } else {
        throw error;
      }
    }
  }

  private async setupTestConfiguration(): Promise<void> {
    // Set test-specific database configurations
    await this.pool.query(`
      ALTER DATABASE "${this.databaseName}"
      SET timezone = 'UTC'
    `);

    // Create test-specific functions if needed
    await this.pool.query(`
      CREATE OR REPLACE FUNCTION test_reset_sequences()
      RETURNS void AS $$
      DECLARE
        rec RECORD;
      BEGIN
        FOR rec IN SELECT sequencename FROM pg_sequences
                   WHERE schemaname = 'public'
        LOOP
          EXECUTE 'ALTER SEQUENCE ' || rec.sequencename || ' RESTART WITH 1';
        END LOOP;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  async query(text: string, params?: any[]): Promise<any> {
    return this.pool.query(text, params);
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.end();
      }

      // Drop test database
      await this.adminPool.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '${this.databaseName}' AND pid <> pg_backend_pid()
      `);

      await this.adminPool.query(`DROP DATABASE IF EXISTS "${this.databaseName}"`);

    } finally {
      if (this.adminPool) {
        await this.adminPool.end();
      }
    }
  }

  private getAdminConnectionString(): string {
    const baseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/postgres';
    return baseUrl.replace(/\/[^/]*$/, '/postgres');
  }

  private getTestConnectionString(): string {
    const baseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/postgres';
    return baseUrl.replace(/\/[^/]*$/, `/${this.databaseName}`);
  }

  get connectionString(): string {
    return this.getTestConnectionString();
  }

  get testDatabaseName(): string {
    return this.databaseName;
  }
}
```

#### 2. Transaction-Based Isolation Pattern

```typescript
// tests/setup/transaction-isolation.setup.ts
import { Pool, PoolClient } from 'pg';

export class TransactionIsolation {
  private pool: Pool;
  private client: PoolClient;
  private savepoints: string[] = [];

  constructor(connectionString?: string) {
    this.pool = new Pool({
      connectionString: connectionString || process.env.TEST_DATABASE_URL,
      max: 1 // Single connection for transaction isolation
    });
  }

  async initialize(): Promise<void> {
    this.client = await this.pool.connect();
    await this.client.query('BEGIN');
  }

  async createSavepoint(name?: string): Promise<string> {
    const savepointName = name || `sp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.client.query(`SAVEPOINT ${savepointName}`);
    this.savepoints.push(savepointName);
    return savepointName;
  }

  async rollbackToSavepoint(name: string): Promise<void> {
    await this.client.query(`ROLLBACK TO SAVEPOINT ${name}`);

    // Remove savepoints created after this one
    const index = this.savepoints.indexOf(name);
    if (index !== -1) {
      this.savepoints = this.savepoints.slice(0, index + 1);
    }
  }

  async releaseSavepoint(name: string): Promise<void> {
    await this.client.query(`RELEASE SAVEPOINT ${name}`);

    const index = this.savepoints.indexOf(name);
    if (index !== -1) {
      this.savepoints.splice(index, 1);
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    return this.client.query(text, params);
  }

  async cleanup(): Promise<void> {
    try {
      if (this.client) {
        await this.client.query('ROLLBACK');
        this.client.release();
      }
    } finally {
      if (this.pool) {
        await this.pool.end();
      }
    }
  }

  get databaseClient(): PoolClient {
    return this.client;
  }
}
```

#### 3. Schema-Based Isolation Pattern

```typescript
// tests/setup/schema-isolation.setup.ts
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export class SchemaIsolation {
  private pool: Pool;
  private schemaName: string;

  constructor(private testId: string) {
    this.schemaName = `test_${testId}_${uuidv4().replace(/-/g, '')}`;
    this.pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL,
      options: `-c search_path=${this.schemaName},public`
    });
  }

  async initialize(): Promise<void> {
    // Create test schema
    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${this.schemaName}`);

    // Set search path for this connection
    await this.pool.query(`SET search_path TO ${this.schemaName}, public`);

    // Copy structure from public schema
    await this.copyDatabaseStructure();
  }

  private async copyDatabaseStructure(): Promise<void> {
    // Get all tables from public schema
    const tablesResult = await this.pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    for (const row of tablesResult.rows) {
      const tableName = row.tablename;

      // Create table structure (without data)
      await this.pool.query(`
        CREATE TABLE ${this.schemaName}.${tableName}
        (LIKE public.${tableName} INCLUDING ALL)
      `);
    }

    // Copy sequences
    const sequencesResult = await this.pool.query(`
      SELECT sequencename
      FROM pg_sequences
      WHERE schemaname = 'public'
    `);

    for (const row of sequencesResult.rows) {
      const sequenceName = row.sequencename;

      await this.pool.query(`
        CREATE SEQUENCE ${this.schemaName}.${sequenceName}
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1
      `);
    }

    // Copy functions and procedures if needed
    await this.copyFunctions();
  }

  private async copyFunctions(): Promise<void> {
    // Copy essential functions for testing
    const functionsResult = await this.pool.query(`
      SELECT proname, pg_get_functiondef(oid) as definition
      FROM pg_proc
      WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname LIKE 'test_%'
    `);

    for (const row of functionsResult.rows) {
      const definition = row.definition.replace(/public\./g, `${this.schemaName}.`);
      await this.pool.query(definition);
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    return this.pool.query(text, params);
  }

  async cleanup(): Promise<void> {
    try {
      await this.pool.query(`DROP SCHEMA IF EXISTS ${this.schemaName} CASCADE`);
    } finally {
      await this.pool.end();
    }
  }

  get testSchema(): string {
    return this.schemaName;
  }
}
```

## Test Data Factories and Builders

### Factory Pattern Implementation

```typescript
// tests/factories/BaseFactory.ts
export abstract class BaseFactory<T> {
  protected static sequence = 1;

  protected getNextSequence(): number {
    return BaseFactory.sequence++;
  }

  protected resetSequence(): void {
    BaseFactory.sequence = 1;
  }

  abstract build(overrides?: Partial<T>): T;

  buildList(count: number, overrides?: Partial<T>): T[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  buildUnique(count: number, uniqueField: keyof T, overrides?: Partial<T>): T[] {
    const items: T[] = [];
    const usedValues = new Set();

    for (let i = 0; i < count; i++) {
      let item: T;
      let attempts = 0;

      do {
        item = this.build(overrides);
        attempts++;

        if (attempts > 100) {
          throw new Error(`Unable to generate unique value for field ${String(uniqueField)}`);
        }
      } while (usedValues.has(item[uniqueField]));

      usedValues.add(item[uniqueField]);
      items.push(item);
    }

    return items;
  }
}
```

```typescript
// tests/factories/UserFactory.ts
import { BaseFactory } from './BaseFactory';
import { faker } from '@faker-js/faker';
import { User, UserRole } from '@/types/User';

export class UserFactory extends BaseFactory<User> {
  build(overrides: Partial<User> = {}): User {
    const sequence = this.getNextSequence();

    return {
      id: `user-${sequence.toString().padStart(6, '0')}`,
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      role: faker.helpers.arrayElement(['admin', 'editor', 'viewer'] as UserRole[]),
      isActive: true,
      emailVerified: true,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      lastLoginAt: faker.date.recent(),
      preferences: {
        theme: faker.helpers.arrayElement(['light', 'dark']),
        language: 'en',
        timezone: faker.location.timeZone(),
        notifications: {
          email: faker.datatype.boolean(),
          browser: faker.datatype.boolean(),
          mobile: faker.datatype.boolean()
        }
      },
      ...overrides
    };
  }

  // Convenience methods for common user types
  buildAdmin(overrides: Partial<User> = {}): User {
    return this.build({
      role: 'admin',
      ...overrides
    });
  }

  buildEditor(overrides: Partial<User> = {}): User {
    return this.build({
      role: 'editor',
      ...overrides
    });
  }

  buildViewer(overrides: Partial<User> = {}): User {
    return this.build({
      role: 'viewer',
      ...overrides
    });
  }

  buildWithTeam(teamId: string, overrides: Partial<User> = {}): User {
    return this.build({
      teamId,
      ...overrides
    });
  }
}

export const userFactory = new UserFactory();
```

```typescript
// tests/factories/FormFactory.ts
import { BaseFactory } from './BaseFactory';
import { faker } from '@faker-js/faker';
import { Form, FormField, FormValidationRule } from '@/types/Form';

export class FormFactory extends BaseFactory<Form> {
  build(overrides: Partial<Form> = {}): Form {
    const sequence = this.getNextSequence();

    return {
      id: `form-${sequence.toString().padStart(6, '0')}`,
      name: faker.company.catchPhrase(),
      description: faker.lorem.sentence(),
      fields: this.generateFields(),
      validationRules: [],
      settings: {
        allowMultipleSubmissions: faker.datatype.boolean(),
        requireAuthentication: faker.datatype.boolean(),
        isPublic: true,
        submitButtonText: 'Submit',
        successMessage: 'Thank you for your submission!',
        redirectUrl: null
      },
      status: 'draft',
      createdBy: `user-${faker.number.int({ min: 1, max: 1000 })}`,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      publishedAt: null,
      submissionCount: 0,
      version: 1,
      ...overrides
    };
  }

  private generateFields(count: number = 3): FormField[] {
    const fieldTypes = ['text', 'email', 'textarea', 'select', 'checkbox', 'radio'];

    return Array.from({ length: count }, (_, index) => ({
      id: `field-${index + 1}`,
      name: `field_${index + 1}`,
      label: faker.lorem.words(2),
      type: faker.helpers.arrayElement(fieldTypes),
      required: faker.datatype.boolean(),
      placeholder: faker.lorem.sentence(),
      helpText: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
      options: this.generateFieldOptions(),
      validation: this.generateFieldValidation()
    }));
  }

  private generateFieldOptions(): string[] | undefined {
    if (faker.datatype.boolean({ probability: 0.3 })) {
      return faker.helpers.multiple(() => faker.lorem.word(), { count: { min: 2, max: 5 } });
    }
    return undefined;
  }

  private generateFieldValidation(): FormValidationRule[] {
    const rules: FormValidationRule[] = [];

    if (faker.datatype.boolean({ probability: 0.5 })) {
      rules.push({
        type: 'minLength',
        value: faker.number.int({ min: 1, max: 10 }),
        message: 'Value is too short'
      });
    }

    if (faker.datatype.boolean({ probability: 0.3 })) {
      rules.push({
        type: 'maxLength',
        value: faker.number.int({ min: 50, max: 200 }),
        message: 'Value is too long'
      });
    }

    return rules;
  }

  // Convenience methods for specific form types
  buildContactForm(overrides: Partial<Form> = {}): Form {
    return this.build({
      name: 'Contact Form',
      fields: [
        {
          id: 'name',
          name: 'name',
          label: 'Full Name',
          type: 'text',
          required: true,
          placeholder: 'Enter your full name'
        },
        {
          id: 'email',
          name: 'email',
          label: 'Email Address',
          type: 'email',
          required: true,
          placeholder: 'Enter your email'
        },
        {
          id: 'message',
          name: 'message',
          label: 'Message',
          type: 'textarea',
          required: true,
          placeholder: 'Enter your message'
        }
      ],
      ...overrides
    });
  }

  buildSurveyForm(questionCount: number = 5, overrides: Partial<Form> = {}): Form {
    const surveyFields = Array.from({ length: questionCount }, (_, index) => ({
      id: `question_${index + 1}`,
      name: `question_${index + 1}`,
      label: `Question ${index + 1}: ${faker.lorem.sentence()}?`,
      type: faker.helpers.arrayElement(['text', 'textarea', 'select', 'radio']),
      required: faker.datatype.boolean(),
      options: faker.helpers.arrayElement([
        ['Very Poor', 'Poor', 'Average', 'Good', 'Excellent'],
        ['Yes', 'No', 'Maybe'],
        ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']
      ])
    }));

    return this.build({
      name: 'Survey Form',
      description: 'Customer satisfaction survey',
      fields: surveyFields,
      ...overrides
    });
  }

  buildRegistrationForm(overrides: Partial<Form> = {}): Form {
    return this.build({
      name: 'Registration Form',
      fields: [
        {
          id: 'firstName',
          name: 'firstName',
          label: 'First Name',
          type: 'text',
          required: true
        },
        {
          id: 'lastName',
          name: 'lastName',
          label: 'Last Name',
          type: 'text',
          required: true
        },
        {
          id: 'email',
          name: 'email',
          label: 'Email Address',
          type: 'email',
          required: true
        },
        {
          id: 'phone',
          name: 'phone',
          label: 'Phone Number',
          type: 'text',
          required: false
        },
        {
          id: 'company',
          name: 'company',
          label: 'Company',
          type: 'text',
          required: false
        }
      ],
      settings: {
        requireAuthentication: false,
        allowMultipleSubmissions: false,
        isPublic: true
      },
      ...overrides
    });
  }
}

export const formFactory = new FormFactory();
```

```typescript
// tests/factories/SubmissionFactory.ts
import { BaseFactory } from './BaseFactory';
import { faker } from '@faker-js/faker';
import { Submission, SubmissionStatus } from '@/types/Submission';

export class SubmissionFactory extends BaseFactory<Submission> {
  build(overrides: Partial<Submission> = {}): Submission {
    const sequence = this.getNextSequence();

    return {
      id: `submission-${sequence.toString().padStart(6, '0')}`,
      formId: `form-${faker.number.int({ min: 1, max: 1000 })}`,
      data: this.generateSubmissionData(),
      status: faker.helpers.arrayElement(['submitted', 'processing', 'completed', 'failed'] as SubmissionStatus[]),
      submittedBy: faker.datatype.boolean() ? `user-${faker.number.int({ min: 1, max: 1000 })}` : null,
      submittedAt: faker.date.past(),
      ipAddress: faker.internet.ip(),
      userAgent: faker.internet.userAgent(),
      metadata: {
        source: faker.helpers.arrayElement(['web', 'mobile', 'api']),
        version: '1.0.0',
        sessionId: faker.string.uuid(),
        referrer: faker.internet.url()
      },
      ...overrides
    };
  }

  private generateSubmissionData(): Record<string, any> {
    return {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      message: faker.lorem.paragraph(),
      rating: faker.number.int({ min: 1, max: 5 }),
      subscribe: faker.datatype.boolean()
    };
  }

  buildForForm(formId: string, overrides: Partial<Submission> = {}): Submission {
    return this.build({
      formId,
      ...overrides
    });
  }

  buildByUser(userId: string, overrides: Partial<Submission> = {}): Submission {
    return this.build({
      submittedBy: userId,
      ...overrides
    });
  }

  buildWithStatus(status: SubmissionStatus, overrides: Partial<Submission> = {}): Submission {
    return this.build({
      status,
      ...overrides
    });
  }

  buildRecentSubmissions(count: number, formId: string): Submission[] {
    return Array.from({ length: count }, (_, index) => {
      const daysAgo = index;
      return this.build({
        formId,
        submittedAt: faker.date.recent({ days: daysAgo + 1 })
      });
    });
  }
}

export const submissionFactory = new SubmissionFactory();
```

### Builder Pattern Implementation

```typescript
// tests/builders/FormBuilder.ts
import { Form, FormField, FormSettings } from '@/types/Form';
import { v4 as uuidv4 } from 'uuid';

export class FormBuilder {
  private form: Partial<Form>;

  constructor() {
    this.form = {
      id: uuidv4(),
      name: 'Test Form',
      description: '',
      fields: [],
      validationRules: [],
      settings: {
        allowMultipleSubmissions: true,
        requireAuthentication: false,
        isPublic: true,
        submitButtonText: 'Submit',
        successMessage: 'Thank you for your submission!'
      },
      status: 'draft',
      createdBy: 'test-user',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      submissionCount: 0
    };
  }

  static create(): FormBuilder {
    return new FormBuilder();
  }

  withId(id: string): FormBuilder {
    this.form.id = id;
    return this;
  }

  withName(name: string): FormBuilder {
    this.form.name = name;
    return this;
  }

  withDescription(description: string): FormBuilder {
    this.form.description = description;
    return this;
  }

  withField(field: FormField): FormBuilder {
    this.form.fields = [...(this.form.fields || []), field];
    return this;
  }

  withTextField(name: string, label: string, required: boolean = false): FormBuilder {
    return this.withField({
      id: name,
      name,
      label,
      type: 'text',
      required,
      placeholder: `Enter ${label.toLowerCase()}`
    });
  }

  withEmailField(name: string, label: string, required: boolean = false): FormBuilder {
    return this.withField({
      id: name,
      name,
      label,
      type: 'email',
      required,
      placeholder: `Enter ${label.toLowerCase()}`
    });
  }

  withTextareaField(name: string, label: string, required: boolean = false): FormBuilder {
    return this.withField({
      id: name,
      name,
      label,
      type: 'textarea',
      required,
      placeholder: `Enter ${label.toLowerCase()}`
    });
  }

  withSelectField(name: string, label: string, options: string[], required: boolean = false): FormBuilder {
    return this.withField({
      id: name,
      name,
      label,
      type: 'select',
      required,
      options
    });
  }

  withCheckboxField(name: string, label: string, required: boolean = false): FormBuilder {
    return this.withField({
      id: name,
      name,
      label,
      type: 'checkbox',
      required
    });
  }

  withRadioField(name: string, label: string, options: string[], required: boolean = false): FormBuilder {
    return this.withField({
      id: name,
      name,
      label,
      type: 'radio',
      required,
      options
    });
  }

  withFileField(name: string, label: string, required: boolean = false): FormBuilder {
    return this.withField({
      id: name,
      name,
      label,
      type: 'file',
      required
    });
  }

  withSettings(settings: Partial<FormSettings>): FormBuilder {
    this.form.settings = {
      ...this.form.settings!,
      ...settings
    };
    return this;
  }

  asPublished(): FormBuilder {
    this.form.status = 'published';
    this.form.publishedAt = new Date();
    return this;
  }

  asDraft(): FormBuilder {
    this.form.status = 'draft';
    this.form.publishedAt = null;
    return this;
  }

  withCreator(userId: string): FormBuilder {
    this.form.createdBy = userId;
    return this;
  }

  withSubmissionCount(count: number): FormBuilder {
    this.form.submissionCount = count;
    return this;
  }

  withValidationRules(rules: any[]): FormBuilder {
    this.form.validationRules = rules;
    return this;
  }

  // Common form templates
  asContactForm(): FormBuilder {
    return this
      .withName('Contact Form')
      .withDescription('Get in touch with us')
      .withTextField('name', 'Full Name', true)
      .withEmailField('email', 'Email Address', true)
      .withTextField('subject', 'Subject', true)
      .withTextareaField('message', 'Message', true);
  }

  asFeedbackForm(): FormBuilder {
    return this
      .withName('Feedback Form')
      .withDescription('We value your feedback')
      .withTextField('name', 'Your Name')
      .withEmailField('email', 'Email Address')
      .withSelectField('rating', 'Overall Rating', ['1', '2', '3', '4', '5'], true)
      .withTextareaField('comments', 'Additional Comments');
  }

  asRegistrationForm(): FormBuilder {
    return this
      .withName('Registration Form')
      .withDescription('Sign up for our service')
      .withTextField('firstName', 'First Name', true)
      .withTextField('lastName', 'Last Name', true)
      .withEmailField('email', 'Email Address', true)
      .withTextField('phone', 'Phone Number')
      .withTextField('company', 'Company')
      .withCheckboxField('newsletter', 'Subscribe to newsletter');
  }

  asSurveyForm(questions: Array<{ question: string; type: 'text' | 'select' | 'radio'; options?: string[] }>): FormBuilder {
    let builder = this
      .withName('Survey Form')
      .withDescription('Please take a moment to complete this survey');

    questions.forEach((q, index) => {
      const fieldName = `question_${index + 1}`;

      if (q.type === 'text') {
        builder = builder.withTextField(fieldName, q.question, true);
      } else if (q.type === 'select' && q.options) {
        builder = builder.withSelectField(fieldName, q.question, q.options, true);
      } else if (q.type === 'radio' && q.options) {
        builder = builder.withRadioField(fieldName, q.question, q.options, true);
      }
    });

    return builder;
  }

  build(): Form {
    return this.form as Form;
  }
}

export const FormBuilder = {
  create: () => new FormBuilder()
};
```

## Test Data Seeding Strategies

### Scenario-Based Seeding

```typescript
// tests/seeds/ScenarioSeeder.ts
import { DatabasePerTest } from '../setup/database-per-test.setup';
import { userFactory } from '../factories/UserFactory';
import { formFactory } from '../factories/FormFactory';
import { submissionFactory } from '../factories/SubmissionFactory';
import { FormBuilder } from '../builders/FormBuilder';

export class ScenarioSeeder {
  constructor(private database: DatabasePerTest) {}

  async seedScenario(scenarioName: string): Promise<any> {
    const scenarios = {
      'empty-state': () => this.seedEmptyState(),
      'single-user': () => this.seedSingleUser(),
      'multi-user-team': () => this.seedMultiUserTeam(),
      'form-with-submissions': () => this.seedFormWithSubmissions(),
      'analytics-dashboard': () => this.seedAnalyticsDashboard(),
      'collaboration-scenario': () => this.seedCollaborationScenario(),
      'performance-test': () => this.seedPerformanceTestData(),
      'edge-cases': () => this.seedEdgeCases()
    };

    const seeder = scenarios[scenarioName];
    if (!seeder) {
      throw new Error(`Unknown scenario: ${scenarioName}`);
    }

    return seeder();
  }

  private async seedEmptyState(): Promise<any> {
    // Create minimal data for empty state testing
    const user = userFactory.build({
      email: 'empty@example.com',
      role: 'admin'
    });

    await this.insertUser(user);

    return { user };
  }

  private async seedSingleUser(): Promise<any> {
    const user = userFactory.build({
      email: 'single@example.com',
      role: 'admin'
    });

    await this.insertUser(user);

    // Create a few forms for the user
    const forms = [
      FormBuilder.create().asContactForm().withCreator(user.id).build(),
      FormBuilder.create().asFeedbackForm().withCreator(user.id).build()
    ];

    for (const form of forms) {
      await this.insertForm(form);
    }

    return { user, forms };
  }

  private async seedMultiUserTeam(): Promise<any> {
    // Create team with different roles
    const admin = userFactory.buildAdmin({
      email: 'admin@example.com',
      firstName: 'Alice',
      lastName: 'Admin'
    });

    const editor = userFactory.buildEditor({
      email: 'editor@example.com',
      firstName: 'Bob',
      lastName: 'Editor'
    });

    const viewer = userFactory.buildViewer({
      email: 'viewer@example.com',
      firstName: 'Charlie',
      lastName: 'Viewer'
    });

    const users = [admin, editor, viewer];

    for (const user of users) {
      await this.insertUser(user);
    }

    // Create forms owned by different users
    const adminForm = FormBuilder.create()
      .asContactForm()
      .withCreator(admin.id)
      .asPublished()
      .build();

    const editorForm = FormBuilder.create()
      .asFeedbackForm()
      .withCreator(editor.id)
      .build();

    await this.insertForm(adminForm);
    await this.insertForm(editorForm);

    return { admin, editor, viewer, forms: [adminForm, editorForm] };
  }

  private async seedFormWithSubmissions(): Promise<any> {
    const user = userFactory.build({
      email: 'formowner@example.com',
      role: 'admin'
    });

    await this.insertUser(user);

    const form = FormBuilder.create()
      .asContactForm()
      .withCreator(user.id)
      .asPublished()
      .build();

    await this.insertForm(form);

    // Create submissions over time
    const submissions = submissionFactory.buildRecentSubmissions(20, form.id);

    for (const submission of submissions) {
      await this.insertSubmission(submission);
    }

    return { user, form, submissions };
  }

  private async seedAnalyticsDashboard(): Promise<any> {
    const user = userFactory.buildAdmin({
      email: 'analyst@example.com'
    });

    await this.insertUser(user);

    // Create multiple forms with varying submission patterns
    const forms = [
      FormBuilder.create().asContactForm().withCreator(user.id).asPublished().build(),
      FormBuilder.create().asFeedbackForm().withCreator(user.id).asPublished().build(),
      FormBuilder.create().asRegistrationForm().withCreator(user.id).asPublished().build()
    ];

    const allSubmissions = [];

    for (const form of forms) {
      await this.insertForm(form);

      // Create submissions with different patterns
      const submissionCount = Math.floor(Math.random() * 50) + 10; // 10-60 submissions
      const submissions = Array.from({ length: submissionCount }, (_, index) => {
        const daysAgo = Math.floor(Math.random() * 30); // Last 30 days
        return submissionFactory.build({
          formId: form.id,
          submittedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          status: Math.random() > 0.1 ? 'completed' : 'failed' // 90% success rate
        });
      });

      for (const submission of submissions) {
        await this.insertSubmission(submission);
        allSubmissions.push(submission);
      }
    }

    return { user, forms, submissions: allSubmissions };
  }

  private async seedCollaborationScenario(): Promise<any> {
    // Create users for collaboration testing
    const owner = userFactory.buildAdmin({
      email: 'owner@example.com',
      firstName: 'Form',
      lastName: 'Owner'
    });

    const collaborators = [
      userFactory.buildEditor({
        email: 'collaborator1@example.com',
        firstName: 'Editor',
        lastName: 'One'
      }),
      userFactory.buildEditor({
        email: 'collaborator2@example.com',
        firstName: 'Editor',
        lastName: 'Two'
      }),
      userFactory.buildViewer({
        email: 'viewer@example.com',
        firstName: 'View',
        lastName: 'Only'
      })
    ];

    const allUsers = [owner, ...collaborators];

    for (const user of allUsers) {
      await this.insertUser(user);
    }

    // Create shared form
    const sharedForm = FormBuilder.create()
      .withName('Collaborative Form')
      .withDescription('A form being worked on by multiple people')
      .withCreator(owner.id)
      .withTextField('name', 'Name', true)
      .withEmailField('email', 'Email', true)
      .build();

    await this.insertForm(sharedForm);

    // Create collaboration records (if you have a collaboration table)
    for (const collaborator of collaborators) {
      await this.database.query(`
        INSERT INTO form_collaborators (form_id, user_id, permission_level, added_by, added_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        sharedForm.id,
        collaborator.id,
        collaborator.role === 'viewer' ? 'read' : 'write',
        owner.id,
        new Date()
      ]);
    }

    return { owner, collaborators, sharedForm };
  }

  private async seedPerformanceTestData(): Promise<any> {
    const user = userFactory.buildAdmin({
      email: 'performance@example.com'
    });

    await this.insertUser(user);

    // Create large number of forms and submissions for performance testing
    const forms = [];
    const submissions = [];

    for (let i = 0; i < 100; i++) {
      const form = formFactory.build({
        createdBy: user.id,
        name: `Performance Test Form ${i + 1}`,
        status: i % 10 === 0 ? 'draft' : 'published' // 10% draft, 90% published
      });

      await this.insertForm(form);
      forms.push(form);

      // Create submissions for published forms
      if (form.status === 'published') {
        const submissionCount = Math.floor(Math.random() * 100) + 1;

        for (let j = 0; j < submissionCount; j++) {
          const submission = submissionFactory.build({
            formId: form.id,
            submittedAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000) // Last 90 days
          });

          await this.insertSubmission(submission);
          submissions.push(submission);
        }
      }
    }

    return { user, forms, submissions };
  }

  private async seedEdgeCases(): Promise<any> {
    const user = userFactory.build({
      email: 'edgecase@example.com',
      role: 'admin'
    });

    await this.insertUser(user);

    // Create forms with edge case scenarios
    const edgeCases = [
      // Very long form name
      FormBuilder.create()
        .withName('This is a very long form name that tests the limits of our form name field and ensures that our system can handle extremely long form names without breaking or causing display issues')
        .withCreator(user.id)
        .build(),

      // Form with many fields
      FormBuilder.create()
        .withName('Form with Many Fields')
        .withCreator(user.id)
        .withTextField('field1', 'Field 1')
        .withTextField('field2', 'Field 2')
        .withTextField('field3', 'Field 3')
        .withTextField('field4', 'Field 4')
        .withTextField('field5', 'Field 5')
        .withEmailField('email1', 'Email 1')
        .withEmailField('email2', 'Email 2')
        .withTextareaField('textarea1', 'Textarea 1')
        .withTextareaField('textarea2', 'Textarea 2')
        .withSelectField('select1', 'Select 1', ['Option 1', 'Option 2', 'Option 3'])
        .build(),

      // Form with special characters
      FormBuilder.create()
        .withName('Form with Special Characters: ñáéíóú & 中文 & العربية & русский')
        .withCreator(user.id)
        .withTextField('special_chars', 'Special Characters: ñáéíóú & 中文')
        .build(),

      // Empty form
      FormBuilder.create()
        .withName('Empty Form')
        .withDescription('')
        .withCreator(user.id)
        .build()
    ];

    for (const form of edgeCases) {
      await this.insertForm(form);
    }

    // Create submissions with edge case data
    const edgeSubmissions = [
      // Very long submission data
      submissionFactory.build({
        formId: edgeCases[0].id,
        data: {
          longText: 'A'.repeat(10000), // 10KB of text
          normalField: 'Normal value'
        }
      }),

      // Submission with special characters
      submissionFactory.build({
        formId: edgeCases[2].id,
        data: {
          special_chars: 'ñáéíóú & 中文 & العربية & русский & 🚀🎉💯',
          emoji: '😀😃😄😁😆😅🤣😂🙂🙃😉😊😇🥰😍🤩😘😗☺😚😙🥲😋😛😜🤪😝🤑🤗🤭🤫🤔🤐🤨😐😑😶😶‍🌫️😏😒🙄😬😮‍💨🤥😌😔😪🤤😴😷🤒🤕🤢🤮🤧🥵🥶🥴😵😵‍💫🤯🤠🥳🥸😎🤓🧐😕😟🙁☹😮😯😲😳🥺😦😧😨😰😥😢😭😱😖😣😞😓😩😫🥱😤😡😠🤬😈👿💀☠💩🤡👹👺👻👽👾🤖😺😸😹😻😼😽🙀😿😾'
        }
      }),

      // Submission with null/undefined values
      submissionFactory.build({
        formId: edgeCases[3].id,
        data: {
          emptyString: '',
          nullValue: null,
          undefinedValue: undefined,
          zeroValue: 0,
          falseValue: false
        }
      })
    ];

    for (const submission of edgeSubmissions) {
      await this.insertSubmission(submission);
    }

    return { user, forms: edgeCases, submissions: edgeSubmissions };
  }

  // Helper methods for database insertion
  private async insertUser(user: any): Promise<void> {
    await this.database.query(`
      INSERT INTO users (
        id, email, first_name, last_name, role, is_active,
        email_verified, created_at, updated_at, last_login_at, preferences
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      user.id, user.email, user.firstName, user.lastName, user.role,
      user.isActive, user.emailVerified, user.createdAt, user.updatedAt,
      user.lastLoginAt, JSON.stringify(user.preferences)
    ]);
  }

  private async insertForm(form: any): Promise<void> {
    await this.database.query(`
      INSERT INTO forms (
        id, name, description, fields, validation_rules, settings,
        status, created_by, created_at, updated_at, published_at,
        submission_count, version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      form.id, form.name, form.description, JSON.stringify(form.fields),
      JSON.stringify(form.validationRules), JSON.stringify(form.settings),
      form.status, form.createdBy, form.createdAt, form.updatedAt,
      form.publishedAt, form.submissionCount, form.version
    ]);
  }

  private async insertSubmission(submission: any): Promise<void> {
    await this.database.query(`
      INSERT INTO submissions (
        id, form_id, data, status, submitted_by, submitted_at,
        ip_address, user_agent, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      submission.id, submission.formId, JSON.stringify(submission.data),
      submission.status, submission.submittedBy, submission.submittedAt,
      submission.ipAddress, submission.userAgent, JSON.stringify(submission.metadata)
    ]);
  }
}
```

### Bulk Data Loading

```typescript
// tests/seeds/BulkDataLoader.ts
import { DatabasePerTest } from '../setup/database-per-test.setup';
import { Readable } from 'stream';
import { from as copyFrom } from 'pg-copy-streams';

export class BulkDataLoader {
  constructor(private database: DatabasePerTest) {}

  async loadBulkData<T>(
    tableName: string,
    columns: string[],
    data: T[],
    transformer?: (item: T) => any[]
  ): Promise<void> {
    if (data.length === 0) return;

    const client = await this.database.query('SELECT 1'); // Get a client

    try {
      // Create CSV-like data stream
      const csvData = data.map(item => {
        const values = transformer ? transformer(item) : Object.values(item);
        return values.map(value => {
          if (value === null || value === undefined) return '\\N';
          if (typeof value === 'object') return JSON.stringify(value);
          if (typeof value === 'string') return value.replace(/\t/g, '\\t').replace(/\n/g, '\\n');
          return String(value);
        }).join('\t');
      }).join('\n');

      // Use COPY command for bulk insert
      const copyStatement = `COPY ${tableName} (${columns.join(', ')}) FROM STDIN WITH (FORMAT text, DELIMITER E'\\t', NULL '\\N')`;

      const stream = client.query(copyFrom(copyStatement));
      const dataStream = Readable.from([csvData]);

      await new Promise((resolve, reject) => {
        dataStream.pipe(stream)
          .on('finish', resolve)
          .on('error', reject);
      });

      console.log(`Bulk loaded ${data.length} records into ${tableName}`);

    } catch (error) {
      console.error(`Failed to bulk load data into ${tableName}:`, error);
      throw error;
    }
  }

  async loadBulkUsers(users: any[]): Promise<void> {
    await this.loadBulkData(
      'users',
      ['id', 'email', 'first_name', 'last_name', 'role', 'is_active', 'email_verified', 'created_at', 'updated_at', 'preferences'],
      users,
      (user) => [
        user.id,
        user.email,
        user.firstName,
        user.lastName,
        user.role,
        user.isActive,
        user.emailVerified,
        user.createdAt.toISOString(),
        user.updatedAt.toISOString(),
        JSON.stringify(user.preferences)
      ]
    );
  }

  async loadBulkForms(forms: any[]): Promise<void> {
    await this.loadBulkData(
      'forms',
      ['id', 'name', 'description', 'fields', 'settings', 'status', 'created_by', 'created_at', 'updated_at'],
      forms,
      (form) => [
        form.id,
        form.name,
        form.description,
        JSON.stringify(form.fields),
        JSON.stringify(form.settings),
        form.status,
        form.createdBy,
        form.createdAt.toISOString(),
        form.updatedAt.toISOString()
      ]
    );
  }

  async loadBulkSubmissions(submissions: any[]): Promise<void> {
    await this.loadBulkData(
      'submissions',
      ['id', 'form_id', 'data', 'status', 'submitted_at', 'ip_address', 'user_agent'],
      submissions,
      (submission) => [
        submission.id,
        submission.formId,
        JSON.stringify(submission.data),
        submission.status,
        submission.submittedAt.toISOString(),
        submission.ipAddress,
        submission.userAgent
      ]
    );
  }
}
```

## Environment Configuration Management

### Test Environment Variables

```typescript
// tests/config/test-environment.ts
export interface TestEnvironmentConfig {
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
  };
  redis: {
    host: string;
    port: number;
    database: number;
  };
  api: {
    baseUrl: string;
    timeout: number;
  };
  features: {
    enableRealTimeUpdates: boolean;
    enableFileUploads: boolean;
    enableCollaboration: boolean;
  };
}

export class TestEnvironmentManager {
  private static config: TestEnvironmentConfig;

  static initialize(): TestEnvironmentConfig {
    if (!TestEnvironmentManager.config) {
      TestEnvironmentManager.config = {
        database: {
          host: process.env.TEST_DB_HOST || 'localhost',
          port: parseInt(process.env.TEST_DB_PORT || '5432'),
          database: process.env.TEST_DB_NAME || 'pliers_test',
          username: process.env.TEST_DB_USER || 'postgres',
          password: process.env.TEST_DB_PASSWORD || 'postgres',
          ssl: process.env.TEST_DB_SSL === 'true'
        },
        redis: {
          host: process.env.TEST_REDIS_HOST || 'localhost',
          port: parseInt(process.env.TEST_REDIS_PORT || '6379'),
          database: parseInt(process.env.TEST_REDIS_DB || '1')
        },
        api: {
          baseUrl: process.env.TEST_API_BASE_URL || 'http://localhost:3000',
          timeout: parseInt(process.env.TEST_API_TIMEOUT || '30000')
        },
        features: {
          enableRealTimeUpdates: process.env.TEST_ENABLE_REALTIME !== 'false',
          enableFileUploads: process.env.TEST_ENABLE_FILE_UPLOADS !== 'false',
          enableCollaboration: process.env.TEST_ENABLE_COLLABORATION !== 'false'
        }
      };
    }

    return TestEnvironmentManager.config;
  }

  static get(): TestEnvironmentConfig {
    if (!TestEnvironmentManager.config) {
      return TestEnvironmentManager.initialize();
    }
    return TestEnvironmentManager.config;
  }

  static getDatabaseUrl(): string {
    const config = TestEnvironmentManager.get();
    return `postgresql://${config.database.username}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.database}`;
  }

  static getRedisUrl(): string {
    const config = TestEnvironmentManager.get();
    return `redis://${config.redis.host}:${config.redis.port}/${config.redis.database}`;
  }
}
```

### Environment-Specific Configurations

```yaml
# .env.test
NODE_ENV=test
LOG_LEVEL=error

# Database
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_NAME=pliers_test
TEST_DB_USER=postgres
TEST_DB_PASSWORD=postgres
TEST_DB_SSL=false

# Redis
TEST_REDIS_HOST=localhost
TEST_REDIS_PORT=6379
TEST_REDIS_DB=1

# API
TEST_API_BASE_URL=http://localhost:3000
TEST_API_TIMEOUT=30000

# Features
TEST_ENABLE_REALTIME=true
TEST_ENABLE_FILE_UPLOADS=true
TEST_ENABLE_COLLABORATION=true

# Test-specific settings
TEST_PARALLEL_WORKERS=1
TEST_TIMEOUT=30000
TEST_RETRY_COUNT=2
```

```yaml
# .env.test.ci
NODE_ENV=test
LOG_LEVEL=error

# CI-specific database (use GitHub Actions services)
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_NAME=pliers_test
TEST_DB_USER=postgres
TEST_DB_PASSWORD=postgres

# CI-specific settings
TEST_PARALLEL_WORKERS=2
TEST_TIMEOUT=60000
TEST_RETRY_COUNT=3
TEST_ENABLE_VIDEO_RECORDING=false
```

## Performance Optimization

### Parallel Test Execution

```typescript
// tests/utils/parallel-test-runner.ts
import { Worker } from 'worker_threads';
import { cpus } from 'os';

export class ParallelTestRunner {
  private maxWorkers: number;
  private activeWorkers: Set<Worker> = new Set();

  constructor(maxWorkers?: number) {
    this.maxWorkers = maxWorkers || Math.min(cpus().length, 4);
  }

  async runTestsInParallel<T>(
    testTasks: Array<() => Promise<T>>,
    options: {
      isolateData?: boolean;
      maxConcurrency?: number;
    } = {}
  ): Promise<T[]> {
    const { isolateData = true, maxConcurrency = this.maxWorkers } = options;

    const results: T[] = [];
    const semaphore = new Semaphore(maxConcurrency);

    const promises = testTasks.map(async (task, index) => {
      await semaphore.acquire();

      try {
        if (isolateData) {
          // Each test gets its own database
          const testId = `parallel_${index}_${Date.now()}`;
          return await this.runIsolatedTest(task, testId);
        } else {
          return await task();
        }
      } finally {
        semaphore.release();
      }
    });

    return Promise.all(promises);
  }

  private async runIsolatedTest<T>(
    testTask: () => Promise<T>,
    testId: string
  ): Promise<T> {
    const database = new DatabasePerTest(testId);

    try {
      await database.initialize();

      // Set database context for the test
      process.env.TEST_DATABASE_URL = database.connectionString;

      return await testTask();

    } finally {
      await database.cleanup();
    }
  }
}

class Semaphore {
  private counter: number;
  private waiting: Array<() => void> = [];

  constructor(max: number) {
    this.counter = max;
  }

  async acquire(): Promise<void> {
    if (this.counter > 0) {
      this.counter--;
      return;
    }

    return new Promise(resolve => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    this.counter++;

    if (this.waiting.length > 0) {
      this.counter--;
      const resolve = this.waiting.shift()!;
      resolve();
    }
  }
}
```

### Resource Pool Management

```typescript
// tests/utils/resource-pool.ts
export class ResourcePool<T> {
  private available: T[] = [];
  private inUse: Set<T> = new Set();
  private waiting: Array<(resource: T) => void> = [];
  private factory: () => Promise<T>;
  private cleanup: (resource: T) => Promise<void>;
  private maxSize: number;

  constructor(
    factory: () => Promise<T>,
    cleanup: (resource: T) => Promise<void>,
    maxSize: number = 10
  ) {
    this.factory = factory;
    this.cleanup = cleanup;
    this.maxSize = maxSize;
  }

  async acquire(): Promise<T> {
    // If we have available resources, use one
    if (this.available.length > 0) {
      const resource = this.available.pop()!;
      this.inUse.add(resource);
      return resource;
    }

    // If we can create more resources, create one
    if (this.inUse.size < this.maxSize) {
      const resource = await this.factory();
      this.inUse.add(resource);
      return resource;
    }

    // Wait for a resource to become available
    return new Promise(resolve => {
      this.waiting.push(resolve);
    });
  }

  async release(resource: T): Promise<void> {
    this.inUse.delete(resource);

    // If someone is waiting, give them the resource
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()!;
      this.inUse.add(resource);
      resolve(resource);
      return;
    }

    // Otherwise, make it available
    this.available.push(resource);
  }

  async drain(): Promise<void> {
    // Wait for all resources to be returned
    while (this.inUse.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Clean up all available resources
    for (const resource of this.available) {
      await this.cleanup(resource);
    }

    this.available = [];
  }
}

// Usage example for database pool
export const createDatabasePool = () => {
  return new ResourcePool(
    async () => {
      const testId = `pool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const database = new DatabasePerTest(testId);
      await database.initialize();
      return database;
    },
    async (database) => {
      await database.cleanup();
    },
    5 // Max 5 databases in pool
  );
};
```

## Relationships
- **Parent Nodes:** [foundation/testing/index.md] - categorizes - Test data management as part of overall testing strategy
- **Child Nodes:** None
- **Related Nodes:**
  - [foundation/testing/integration-testing-strategy.md] - uses - Test data management for integration test setup
  - [foundation/testing/e2e-testing-strategy.md] - uses - Test data management for E2E test scenarios
  - [foundation/testing/standards.md] - follows - Testing standards for data management practices

## Navigation Guidance
- **Access Context**: Reference when setting up test data infrastructure or implementing data isolation strategies
- **Common Next Steps**: Review specific testing strategy documents or implement data seeding utilities
- **Related Tasks**: Test infrastructure setup, database management, test environment configuration
- **Update Patterns**: Update when new data models are added or testing requirements change

## Metadata
- **Created:** 2025-01-22
- **Last Updated:** 2025-01-22
- **Updated By:** Claude/TEST-001-2 Implementation

## Change History
- 2025-01-22: Initial test data management strategy document creation with comprehensive isolation and seeding patterns