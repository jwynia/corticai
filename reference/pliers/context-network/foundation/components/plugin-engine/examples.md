# Plugin Engine Examples and Use Cases

## Purpose
Provides practical examples, implementation patterns, and use cases for the Plugin Engine component to guide development and demonstrate real-world usage scenarios.

## Classification
- **Domain:** Implementation Guide
- **Stability:** Evolving
- **Abstraction:** Practical
- **Confidence:** High

## Overview

This document provides comprehensive examples of how to develop, deploy, and use plugins in the Pliers Plugin Engine. Each example includes complete code implementations, configuration options, and best practices.

## Basic Plugin Development

### Simple Form Validation Plugin

This example demonstrates a basic plugin that adds custom validation rules to forms.

#### Plugin Manifest (manifest.json)

```json
{
  "name": "advanced-validation",
  "version": "1.0.0",
  "description": "Advanced form validation rules including phone numbers and credit cards",
  "author": "Pliers Team <plugins@pliers.dev>",
  "license": "MIT",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "engines": {
    "pliers": "^3.0.0",
    "node": ">=18.0.0"
  },
  "keywords": ["validation", "forms", "business-rules"],
  "categories": ["validation", "form-processing"],
  "permissions": {
    "events": ["subscribe"]
  },
  "hooks": {
    "form.validate": {
      "priority": 200,
      "async": false,
      "timeout": 5000
    },
    "submission.beforeValidate": {
      "priority": 150,
      "async": true,
      "timeout": 10000
    }
  },
  "dependencies": {
    "libphonenumber-js": "^1.10.0",
    "creditcard-validator": "^2.0.0"
  },
  "configuration": {
    "schema": "./config-schema.json",
    "default": "./config-default.json"
  }
}
```

#### Plugin Implementation (src/index.ts)

```typescript
import { PluginContext, HookContext, ValidationResult } from '@pliers/plugin-sdk';
import { parsePhoneNumber } from 'libphonenumber-js';
import { validate as validateCreditCard } from 'creditcard-validator';

export default class AdvancedValidationPlugin {
  private config: PluginConfig;
  private logger: PluginLogger;

  constructor(context: PluginContext) {
    this.config = context.config;
    this.logger = context.logger;
    this.logger.info('Advanced Validation Plugin initialized');
  }

  /**
   * Validate form definition for advanced validation rules
   */
  async validateForm(context: HookContext): Promise<ValidationResult> {
    const { data } = context;
    const form = data.form;
    const errors: string[] = [];

    // Check for proper configuration of advanced field types
    form.fields.forEach((field: any, index: number) => {
      if (field.type === 'phone') {
        if (!field.validation?.countryCode) {
          errors.push(`Field ${field.name} (index ${index}): Phone fields require a country code`);
        }
      }

      if (field.type === 'creditcard') {
        if (!field.validation?.acceptedTypes) {
          errors.push(`Field ${field.name} (index ${index}): Credit card fields should specify accepted types`);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * Validate submission data with advanced rules
   */
  async validateSubmission(context: HookContext): Promise<ValidationResult> {
    const { data } = context;
    const submission = data.submission;
    const form = data.form;
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const field of form.fields) {
      const value = submission.data[field.name];

      if (!value && field.required) continue; // Basic required validation handled elsewhere

      try {
        switch (field.type) {
          case 'phone':
            await this.validatePhoneNumber(field, value, errors, warnings);
            break;
          case 'creditcard':
            await this.validateCreditCard(field, value, errors, warnings);
            break;
          case 'email':
            if (field.validation?.businessOnly) {
              await this.validateBusinessEmail(field, value, errors, warnings);
            }
            break;
        }
      } catch (error) {
        this.logger.error(`Validation error for field ${field.name}:`, error);
        errors.push(`Validation failed for field ${field.name}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async validatePhoneNumber(field: any, value: string, errors: string[], warnings: string[]) {
    if (!value) return;

    try {
      const phoneNumber = parsePhoneNumber(value, field.validation.countryCode);

      if (!phoneNumber.isValid()) {
        errors.push(`${field.label || field.name}: Invalid phone number format`);
        return;
      }

      // Check if business phone validation is required
      if (field.validation.businessOnly && phoneNumber.getType() !== 'FIXED_LINE') {
        warnings.push(`${field.label || field.name}: Business phone number recommended`);
      }
    } catch (error) {
      errors.push(`${field.label || field.name}: Unable to validate phone number`);
    }
  }

  private async validateCreditCard(field: any, value: string, errors: string[], warnings: string[]) {
    if (!value) return;

    const result = validateCreditCard(value);

    if (!result.isValid) {
      errors.push(`${field.label || field.name}: Invalid credit card number`);
      return;
    }

    // Check accepted card types
    const acceptedTypes = field.validation.acceptedTypes || [];
    if (acceptedTypes.length > 0 && !acceptedTypes.includes(result.card?.type)) {
      errors.push(`${field.label || field.name}: ${result.card?.type} cards are not accepted`);
    }

    // Warn about expiring cards
    if (result.expirationDate && this.isCardExpiringSoon(result.expirationDate)) {
      warnings.push(`${field.label || field.name}: Credit card expires soon`);
    }
  }

  private async validateBusinessEmail(field: any, value: string, errors: string[], warnings: string[]) {
    if (!value) return;

    const domain = value.split('@')[1];
    const commonConsumerDomains = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
      'aol.com', 'icloud.com', 'protonmail.com'
    ];

    if (commonConsumerDomains.includes(domain.toLowerCase())) {
      if (field.validation.strictBusinessOnly) {
        errors.push(`${field.label || field.name}: Business email address required`);
      } else {
        warnings.push(`${field.label || field.name}: Business email address recommended`);
      }
    }
  }

  private isCardExpiringSoon(expirationDate: string): boolean {
    const [month, year] = expirationDate.split('/');
    const expiry = new Date(2000 + parseInt(year), parseInt(month) - 1);
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    return expiry <= threeMonthsFromNow;
  }
}

// Hook registrations
export const hooks = {
  'form.validate': 'validateForm',
  'submission.beforeValidate': 'validateSubmission'
};
```

#### Configuration Schema (config-schema.json)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "defaultCountryCode": {
      "type": "string",
      "description": "Default country code for phone validation",
      "default": "US"
    },
    "acceptedCreditCardTypes": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["visa", "mastercard", "amex", "discover", "diners", "jcb"]
      },
      "description": "Default accepted credit card types",
      "default": ["visa", "mastercard"]
    },
    "strictBusinessEmail": {
      "type": "boolean",
      "description": "Reject consumer email domains",
      "default": false
    }
  }
}
```

### Integration Plugin Example

This example shows how to create a plugin that integrates with external services.

#### CRM Integration Plugin

```typescript
import { PluginContext, HookContext } from '@pliers/plugin-sdk';
import axios from 'axios';

export default class CRMIntegrationPlugin {
  private config: CRMConfig;
  private logger: PluginLogger;
  private api: PluginAPI;

  constructor(context: PluginContext) {
    this.config = context.config;
    this.logger = context.logger;
    this.api = context.api;
  }

  /**
   * Sync form submission to CRM after successful save
   */
  async syncToCRM(context: HookContext): Promise<void> {
    const { data } = context;
    const submission = data.submission;
    const form = data.form;

    // Only sync if form has CRM integration enabled
    if (!form.metadata?.crmIntegration?.enabled) {
      return;
    }

    try {
      const crmData = this.transformSubmissionToCRM(submission, form);
      const response = await this.sendToCRM(crmData);

      // Store CRM record ID in submission metadata
      await this.api.updateSubmission(submission.id, {
        metadata: {
          ...submission.metadata,
          crmRecordId: response.id,
          crmSyncedAt: new Date().toISOString()
        }
      });

      this.logger.info(`Synced submission ${submission.id} to CRM as record ${response.id}`);
    } catch (error) {
      this.logger.error(`Failed to sync submission ${submission.id} to CRM:`, error);

      // Optionally, create a retry task
      await this.api.createTask({
        type: 'crm-sync-retry',
        data: { submissionId: submission.id },
        scheduleAt: new Date(Date.now() + 5 * 60 * 1000) // Retry in 5 minutes
      });
    }
  }

  /**
   * Enrich submission with CRM data during processing
   */
  async enrichWithCRMData(context: HookContext): Promise<any> {
    const { data } = context;
    const submission = data.submission;

    // Look for existing contact by email
    const email = submission.data.email;
    if (!email) return data;

    try {
      const contact = await this.findContactByEmail(email);
      if (contact) {
        return {
          ...data,
          submission: {
            ...submission,
            data: {
              ...submission.data,
              crmContact: {
                id: contact.id,
                name: contact.name,
                company: contact.company,
                lastActivity: contact.lastActivity
              }
            }
          }
        };
      }
    } catch (error) {
      this.logger.warn(`Failed to enrich submission with CRM data:`, error);
    }

    return data;
  }

  private transformSubmissionToCRM(submission: any, form: any): any {
    const crmMapping = form.metadata.crmIntegration.fieldMapping || {};
    const crmData: any = {};

    // Map form fields to CRM fields
    Object.entries(submission.data).forEach(([fieldName, value]) => {
      const crmField = crmMapping[fieldName];
      if (crmField) {
        crmData[crmField] = value;
      }
    });

    // Add metadata
    crmData.source = 'Pliers Form';
    crmData.formName = form.name;
    crmData.submissionId = submission.id;
    crmData.submittedAt = submission.createdAt;

    return crmData;
  }

  private async sendToCRM(data: any): Promise<any> {
    const response = await axios.post(`${this.config.crmApiUrl}/contacts`, data, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return response.data;
  }

  private async findContactByEmail(email: string): Promise<any> {
    try {
      const response = await axios.get(`${this.config.crmApiUrl}/contacts/search`, {
        params: { email },
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        timeout: 5000
      });

      return response.data.contacts?.[0] || null;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }
}

export const hooks = {
  'submission.afterSave': 'syncToCRM',
  'submission.enrich': 'enrichWithCRMData'
};

interface CRMConfig {
  crmApiUrl: string;
  apiKey: string;
  retryAttempts: number;
  retryDelay: number;
}
```

### API Endpoint Plugin Example

This example demonstrates how to create a plugin that exposes new API endpoints.

#### Webhook Management Plugin

```typescript
import { PluginContext, PluginAPIRequest, PluginAPIResponse } from '@pliers/plugin-sdk';
import crypto from 'crypto';

export default class WebhookPlugin {
  private config: WebhookConfig;
  private logger: PluginLogger;
  private api: PluginAPI;

  constructor(context: PluginContext) {
    this.config = context.config;
    this.logger = context.logger;
    this.api = context.api;
  }

  /**
   * Handle incoming webhook requests
   */
  async handleWebhook(request: PluginAPIRequest): Promise<PluginAPIResponse> {
    const { body, headers, params } = request;
    const webhookId = params.webhookId;

    try {
      // Verify webhook signature
      const signature = headers['x-webhook-signature'];
      if (!this.verifySignature(body, signature)) {
        return {
          status: 401,
          body: { error: 'Invalid signature' }
        };
      }

      // Find webhook configuration
      const webhook = await this.api.database.findOne('webhooks', { id: webhookId });
      if (!webhook) {
        return {
          status: 404,
          body: { error: 'Webhook not found' }
        };
      }

      // Process webhook data
      const processedData = await this.processWebhookData(body, webhook);

      // Create form submission if configured
      if (webhook.createSubmission) {
        const submission = await this.createSubmissionFromWebhook(processedData, webhook);
        this.logger.info(`Created submission ${submission.id} from webhook ${webhookId}`);
      }

      // Trigger custom actions
      if (webhook.actions?.length > 0) {
        await this.executeWebhookActions(processedData, webhook.actions);
      }

      return {
        status: 200,
        body: {
          success: true,
          processed: true,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error(`Webhook processing failed for ${webhookId}:`, error);
      return {
        status: 500,
        body: { error: 'Webhook processing failed' }
      };
    }
  }

  /**
   * List configured webhooks
   */
  async listWebhooks(request: PluginAPIRequest): Promise<PluginAPIResponse> {
    try {
      const { query } = request;
      const limit = parseInt(query.limit || '20');
      const offset = parseInt(query.offset || '0');

      const webhooks = await this.api.database.find('webhooks', {}, {
        limit,
        offset,
        orderBy: 'createdAt DESC'
      });

      const total = await this.api.database.count('webhooks');

      return {
        status: 200,
        body: {
          webhooks: webhooks.map(this.sanitizeWebhook),
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total
          }
        }
      };
    } catch (error) {
      this.logger.error('Failed to list webhooks:', error);
      return {
        status: 500,
        body: { error: 'Failed to list webhooks' }
      };
    }
  }

  /**
   * Create new webhook configuration
   */
  async createWebhook(request: PluginAPIRequest): Promise<PluginAPIResponse> {
    try {
      const { body } = request;

      // Validate webhook configuration
      const validation = this.validateWebhookConfig(body);
      if (!validation.valid) {
        return {
          status: 400,
          body: { error: 'Invalid webhook configuration', details: validation.errors }
        };
      }

      // Generate webhook ID and secret
      const webhookId = crypto.randomUUID();
      const secret = crypto.randomBytes(32).toString('hex');

      const webhook = {
        id: webhookId,
        name: body.name,
        description: body.description,
        url: `/plugins/webhook/receive/${webhookId}`,
        secret,
        formId: body.formId,
        createSubmission: body.createSubmission || false,
        fieldMapping: body.fieldMapping || {},
        actions: body.actions || [],
        active: true,
        createdAt: new Date(),
        createdBy: request.metadata.userId
      };

      await this.api.database.create('webhooks', webhook);

      this.logger.info(`Created webhook ${webhookId} for form ${body.formId}`);

      return {
        status: 201,
        body: {
          id: webhookId,
          url: webhook.url,
          secret,
          created: true
        }
      };
    } catch (error) {
      this.logger.error('Failed to create webhook:', error);
      return {
        status: 500,
        body: { error: 'Failed to create webhook' }
      };
    }
  }

  private verifySignature(payload: any, signature: string): boolean {
    if (!signature) return false;

    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(`sha256=${expectedSignature}`)
    );
  }

  private async processWebhookData(data: any, webhook: any): Promise<any> {
    const processed: any = {};

    // Apply field mappings
    Object.entries(webhook.fieldMapping).forEach(([webhookField, formField]) => {
      if (data[webhookField] !== undefined) {
        processed[formField] = data[webhookField];
      }
    });

    // Add metadata
    processed._webhook = {
      id: webhook.id,
      receivedAt: new Date().toISOString(),
      originalData: data
    };

    return processed;
  }

  private async createSubmissionFromWebhook(data: any, webhook: any): Promise<any> {
    return await this.api.createSubmission({
      formId: webhook.formId,
      data,
      metadata: {
        source: 'webhook',
        webhookId: webhook.id
      }
    });
  }

  private async executeWebhookActions(data: any, actions: any[]): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'email':
            await this.api.sendEmail({
              to: action.email,
              subject: action.subject,
              body: this.renderTemplate(action.template, data)
            });
            break;
          case 'api_call':
            await this.api.http.post(action.url, data, {
              headers: action.headers || {}
            });
            break;
          default:
            this.logger.warn(`Unknown webhook action type: ${action.type}`);
        }
      } catch (error) {
        this.logger.error(`Webhook action failed:`, error);
      }
    }
  }

  private validateWebhookConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.name) errors.push('Name is required');
    if (!config.formId) errors.push('Form ID is required');
    if (config.fieldMapping && typeof config.fieldMapping !== 'object') {
      errors.push('Field mapping must be an object');
    }

    return { valid: errors.length === 0, errors };
  }

  private sanitizeWebhook(webhook: any): any {
    const { secret, ...sanitized } = webhook;
    return sanitized;
  }

  private renderTemplate(template: string, data: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }
}

// API endpoint registrations
export const api = {
  endpoints: [
    {
      path: '/plugins/webhook/receive/:webhookId',
      method: 'POST',
      handler: 'handleWebhook'
    },
    {
      path: '/plugins/webhook/list',
      method: 'GET',
      handler: 'listWebhooks',
      auth: { required: true }
    },
    {
      path: '/plugins/webhook/create',
      method: 'POST',
      handler: 'createWebhook',
      auth: { required: true },
      validation: {
        body: {
          type: 'object',
          required: ['name', 'formId'],
          properties: {
            name: { type: 'string', minLength: 1 },
            formId: { type: 'string' },
            createSubmission: { type: 'boolean' },
            fieldMapping: { type: 'object' }
          }
        }
      }
    }
  ]
};

interface WebhookConfig {
  webhookSecret: string;
  maxPayloadSize: number;
  retentionDays: number;
}
```

## Advanced Plugin Patterns

### Plugin Composition and Chaining

This example shows how plugins can work together and chain operations.

```typescript
export default class DataTransformChainPlugin {
  private config: any;
  private logger: PluginLogger;

  constructor(context: PluginContext) {
    this.config = context.config;
    this.logger = context.logger;
  }

  /**
   * Transform submission data with configurable pipeline
   */
  async transformData(context: HookContext): Promise<any> {
    const { data } = context;
    let transformedData = { ...data };

    // Get transformation pipeline from form configuration
    const form = data.form;
    const pipeline = form.metadata?.transformPipeline || [];

    for (const step of pipeline) {
      try {
        transformedData = await this.executeTransformStep(step, transformedData);
        this.logger.debug(`Applied transformation step: ${step.type}`);
      } catch (error) {
        this.logger.error(`Transformation step failed: ${step.type}`, error);

        if (step.required) {
          throw new Error(`Required transformation step failed: ${step.type}`);
        }
      }
    }

    return transformedData;
  }

  private async executeTransformStep(step: any, data: any): Promise<any> {
    switch (step.type) {
      case 'normalize_phone':
        return this.normalizePhoneNumbers(data, step.config);
      case 'geocode_address':
        return await this.geocodeAddresses(data, step.config);
      case 'enrich_company':
        return await this.enrichCompanyData(data, step.config);
      case 'validate_business':
        return await this.validateBusinessInfo(data, step.config);
      default:
        throw new Error(`Unknown transformation step: ${step.type}`);
    }
  }

  private normalizePhoneNumbers(data: any, config: any): any {
    const result = { ...data };
    const submission = result.submission;

    Object.keys(submission.data).forEach(key => {
      if (key.includes('phone') || key.includes('tel')) {
        const value = submission.data[key];
        if (value && typeof value === 'string') {
          submission.data[key] = this.formatPhoneNumber(value, config.defaultCountry);
        }
      }
    });

    return result;
  }

  private async geocodeAddresses(data: any, config: any): Promise<any> {
    const result = { ...data };
    const submission = result.submission;

    // Find address fields
    const addressFields = Object.keys(submission.data).filter(key =>
      key.includes('address') || key.includes('location')
    );

    for (const field of addressFields) {
      const address = submission.data[field];
      if (address && typeof address === 'string') {
        try {
          const coordinates = await this.getCoordinates(address);
          submission.data[`${field}_coordinates`] = coordinates;
        } catch (error) {
          this.logger.warn(`Failed to geocode address: ${address}`, error);
        }
      }
    }

    return result;
  }

  private async enrichCompanyData(data: any, config: any): Promise<any> {
    const result = { ...data };
    const submission = result.submission;

    const companyName = submission.data.company || submission.data.companyName;
    if (companyName) {
      try {
        const companyInfo = await this.lookupCompany(companyName);
        submission.data.companyInfo = companyInfo;
      } catch (error) {
        this.logger.warn(`Failed to enrich company data: ${companyName}`, error);
      }
    }

    return result;
  }

  // ... implementation methods
}
```

### Plugin Testing Examples

#### Unit Testing

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@pliers/plugin-test';
import AdvancedValidationPlugin from '../src/index';

describe('AdvancedValidationPlugin', () => {
  let plugin: AdvancedValidationPlugin;
  let mockContext: any;

  beforeEach(() => {
    mockContext = {
      config: {
        defaultCountryCode: 'US',
        strictBusinessEmail: false
      },
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      }
    };

    plugin = new AdvancedValidationPlugin(mockContext);
  });

  describe('phone number validation', () => {
    it('should validate US phone numbers correctly', async () => {
      const context = {
        data: {
          form: {
            fields: [
              {
                name: 'phone',
                type: 'phone',
                validation: { countryCode: 'US' }
              }
            ]
          },
          submission: {
            data: {
              phone: '+1 (555) 123-4567'
            }
          }
        }
      };

      const result = await plugin.validateSubmission(context);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid phone numbers', async () => {
      const context = {
        data: {
          form: {
            fields: [
              {
                name: 'phone',
                type: 'phone',
                label: 'Phone Number',
                validation: { countryCode: 'US' }
              }
            ]
          },
          submission: {
            data: {
              phone: '123'
            }
          }
        }
      };

      const result = await plugin.validateSubmission(context);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Phone Number: Invalid phone number format');
    });
  });

  describe('credit card validation', () => {
    it('should validate Visa cards', async () => {
      const context = {
        data: {
          form: {
            fields: [
              {
                name: 'creditcard',
                type: 'creditcard',
                validation: { acceptedTypes: ['visa'] }
              }
            ]
          },
          submission: {
            data: {
              creditcard: '4111111111111111'
            }
          }
        }
      };

      const result = await plugin.validateSubmission(context);
      expect(result.valid).toBe(true);
    });

    it('should reject non-accepted card types', async () => {
      const context = {
        data: {
          form: {
            fields: [
              {
                name: 'creditcard',
                type: 'creditcard',
                label: 'Credit Card',
                validation: { acceptedTypes: ['visa'] }
              }
            ]
          },
          submission: {
            data: {
              creditcard: '5555555555554444' // Mastercard
            }
          }
        }
      };

      const result = await plugin.validateSubmission(context);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Credit Card: mastercard cards are not accepted');
    });
  });
});
```

#### Integration Testing

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@pliers/plugin-test';
import { PluginTestEnvironment } from '@pliers/plugin-test-utils';

describe('CRM Integration Plugin - Integration Tests', () => {
  let testEnv: PluginTestEnvironment;
  let mockCRM: any;

  beforeEach(async () => {
    // Set up test environment with mock CRM
    testEnv = new PluginTestEnvironment();
    await testEnv.setup();

    mockCRM = testEnv.mockExternalService('crm', {
      baseURL: 'https://api.mockcrm.com',
      responses: {
        'POST /contacts': { id: 'contact-123', status: 'created' },
        'GET /contacts/search': { contacts: [] }
      }
    });

    await testEnv.loadPlugin('crm-integration', {
      crmApiUrl: 'https://api.mockcrm.com',
      apiKey: 'test-key-123'
    });
  });

  afterEach(async () => {
    await testEnv.cleanup();
  });

  it('should sync submission to CRM after save', async () => {
    // Create a form with CRM integration enabled
    const form = await testEnv.createForm({
      name: 'Contact Form',
      fields: [
        { name: 'email', type: 'email' },
        { name: 'name', type: 'text' }
      ],
      metadata: {
        crmIntegration: {
          enabled: true,
          fieldMapping: {
            email: 'email_address',
            name: 'full_name'
          }
        }
      }
    });

    // Submit form data
    const submission = await testEnv.submitForm(form.id, {
      email: 'test@example.com',
      name: 'John Doe'
    });

    // Wait for async processing
    await testEnv.waitForHooks();

    // Verify CRM call was made
    expect(mockCRM.getRequestHistory()).toContainEqual(
      expect.objectContaining({
        method: 'POST',
        url: '/contacts',
        data: expect.objectContaining({
          email_address: 'test@example.com',
          full_name: 'John Doe',
          source: 'Pliers Form'
        })
      })
    );

    // Verify submission was updated with CRM ID
    const updatedSubmission = await testEnv.getSubmission(submission.id);
    expect(updatedSubmission.metadata.crmRecordId).toBe('contact-123');
  });

  it('should handle CRM sync failures gracefully', async () => {
    // Configure CRM to return error
    mockCRM.setResponse('POST /contacts', { status: 500, error: 'Server Error' });

    const form = await testEnv.createForm({
      name: 'Contact Form',
      fields: [{ name: 'email', type: 'email' }],
      metadata: {
        crmIntegration: { enabled: true }
      }
    });

    const submission = await testEnv.submitForm(form.id, {
      email: 'test@example.com'
    });

    await testEnv.waitForHooks();

    // Verify retry task was created
    const tasks = await testEnv.getTasks({ type: 'crm-sync-retry' });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].data.submissionId).toBe(submission.id);
  });
});
```

## Plugin Deployment and Distribution

### Plugin Packaging

```bash
# Package.json for plugin development
{
  "name": "@company/pliers-advanced-validation",
  "version": "1.0.0",
  "description": "Advanced validation plugin for Pliers",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "lint": "eslint src/**/*.ts",
    "package": "pliers-plugin package",
    "publish": "pliers-plugin publish"
  },
  "dependencies": {
    "libphonenumber-js": "^1.10.0",
    "creditcard-validator": "^2.0.0"
  },
  "devDependencies": {
    "@pliers/plugin-sdk": "^3.0.0",
    "@pliers/plugin-test": "^3.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0"
  },
  "pliersPlugin": {
    "manifest": "./manifest.json",
    "build": "npm run build",
    "test": "npm test"
  }
}
```

### Plugin Marketplace Publishing

```typescript
// pliers-plugin.config.js
export default {
  registry: 'https://plugins.pliers.dev',
  auth: {
    method: 'oauth',
    clientId: process.env.PLIERS_CLIENT_ID
  },
  build: {
    target: 'node18',
    bundle: true,
    minify: false,
    sourcemap: true
  },
  test: {
    coverage: true,
    threshold: 80
  },
  security: {
    scan: true,
    sign: true,
    keyFile: './signing-key.pem'
  },
  metadata: {
    category: 'validation',
    tags: ['forms', 'validation', 'business-rules'],
    homepage: 'https://github.com/company/pliers-advanced-validation',
    documentation: 'https://docs.company.com/plugins/advanced-validation',
    support: 'support@company.com'
  }
};
```

### CI/CD Pipeline for Plugin Development

```yaml
# .github/workflows/plugin-ci.yml
name: Plugin CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Run security scan
        run: npm audit

      - name: Build plugin
        run: npm run build

      - name: Validate plugin
        run: npx @pliers/plugin-cli validate

  publish:
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build plugin
        run: npm run build

      - name: Package plugin
        run: npx @pliers/plugin-cli package

      - name: Publish to marketplace
        run: npx @pliers/plugin-cli publish
        env:
          PLIERS_API_KEY: ${{ secrets.PLIERS_API_KEY }}
```

## Plugin Security Best Practices

### Secure Plugin Development

```typescript
export default class SecurePlugin {
  private validateInput(input: any): boolean {
    // Always validate input data
    if (!input || typeof input !== 'object') {
      return false;
    }

    // Sanitize string inputs
    Object.keys(input).forEach(key => {
      if (typeof input[key] === 'string') {
        input[key] = this.sanitizeString(input[key]);
      }
    });

    return true;
  }

  private sanitizeString(str: string): string {
    // Remove potentially dangerous characters
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/javascript:/gi, '')
              .replace(/on\w+\s*=/gi, '');
  }

  private async makeSecureAPICall(url: string, data: any): Promise<any> {
    // Validate URL
    if (!this.isAllowedDomain(url)) {
      throw new Error('Domain not allowed');
    }

    // Use timeout and retry logic
    const response = await axios.post(url, data, {
      timeout: 10000,
      maxRedirects: 3,
      validateStatus: (status) => status < 500
    });

    return response.data;
  }

  private isAllowedDomain(url: string): boolean {
    const allowedDomains = this.config.allowedDomains || [];
    const domain = new URL(url).hostname;
    return allowedDomains.includes(domain);
  }

  private async logSecurityEvent(event: string, details: any): Promise<void> {
    await this.api.createAuditLog({
      type: 'security',
      event,
      details,
      pluginId: this.pluginId,
      timestamp: new Date()
    });
  }
}
```

This comprehensive examples document demonstrates the full capabilities of the Plugin Engine, from basic validation plugins to complex integration scenarios, testing strategies, and security best practices. Each example is production-ready and follows established patterns for maintainable, secure plugin development.