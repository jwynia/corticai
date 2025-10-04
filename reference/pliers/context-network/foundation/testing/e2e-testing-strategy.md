# End-to-End Testing Strategy

## Purpose
This document defines the comprehensive end-to-end testing strategy for the Pliers v3 platform, covering user journey testing, browser automation, mobile testing, and cross-platform validation using Playwright and related modern testing frameworks.

## Classification
- **Domain:** Core Concept
- **Stability:** Semi-stable
- **Abstraction:** Structural
- **Confidence:** Established

## Overview

End-to-end testing validates complete user workflows across the entire Pliers v3 platform, ensuring that all components work together to deliver the expected user experience. These tests simulate real user interactions from the browser through the full application stack.

### Core Principles

1. **User-Centric Testing**: Focus on real user scenarios and workflows
2. **Cross-Browser Compatibility**: Test across all supported browsers and versions
3. **Mobile-First Approach**: Ensure mobile experiences work flawlessly
4. **Performance Awareness**: Monitor page load times and interaction responsiveness
5. **Visual Regression Testing**: Catch unintended UI changes
6. **Accessibility Compliance**: Verify accessibility standards are met
7. **Real Environment Testing**: Test against production-like environments

## E2E Testing Framework

### Primary Framework: Playwright

**Selected Framework**: Playwright v1.40+

**Rationale**:
- Modern, fast, and reliable browser automation
- Native support for Chrome, Firefox, Safari, and Edge
- Built-in mobile device emulation
- Powerful debugging and testing tools
- Excellent TypeScript support
- Auto-waiting and retry mechanisms
- Network interception and mocking capabilities
- Video recording and screenshot generation
- Parallel test execution

### Supporting Tools

- **Visual Testing**: Playwright's built-in visual comparisons
- **Accessibility Testing**: @axe-core/playwright for accessibility validation
- **Performance Testing**: Lighthouse integration for performance metrics
- **Mobile Testing**: Playwright's device emulation
- **API Testing**: Playwright's request interception for API validation
- **Test Data Management**: Database seeding and cleanup utilities

## Framework Configuration

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000
  },

  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },

    // Mobile devices
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] }
    },

    // Tablet devices
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] }
    },

    // High DPI displays
    {
      name: 'Desktop Chrome HiDPI',
      use: { ...devices['Desktop Chrome HiDPI'] }
    }
  ],

  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI
  }
});
```

### Environment-Specific Configurations

```typescript
// playwright.production.config.ts
import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,

  // Production-specific settings
  use: {
    ...baseConfig.use,
    baseURL: 'https://app.pliers.dev',
    actionTimeout: 15000,
    navigationTimeout: 45000
  },

  // More retries for production environment
  retries: 3,

  // Only test critical user journeys in production
  testMatch: /.*\.production\.e2e\.ts/,

  projects: [
    // Focus on most common browsers in production
    {
      name: 'production-chrome',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'production-mobile',
      use: { ...devices['Pixel 5'] }
    }
  ]
});
```

## Test Infrastructure Setup

### Test Environment Management

```typescript
// tests/e2e/setup/environment.setup.ts
import { chromium, Browser, BrowserContext, Page } from '@playwright/test';
import { TestDatabase } from './database.setup';
import { TestDataSeeder } from './data-seeder';

export class E2EEnvironment {
  private static instance: E2EEnvironment;
  private browser: Browser;
  private testDatabase: TestDatabase;
  private dataSeeder: TestDataSeeder;

  static async getInstance(): Promise<E2EEnvironment> {
    if (!E2EEnvironment.instance) {
      E2EEnvironment.instance = new E2EEnvironment();
      await E2EEnvironment.instance.initialize();
    }
    return E2EEnvironment.instance;
  }

  private async initialize(): Promise<void> {
    // Setup test database
    this.testDatabase = await TestDatabase.create('e2e-tests');
    this.dataSeeder = new TestDataSeeder(this.testDatabase);

    // Setup browser for shared operations
    this.browser = await chromium.launch({
      headless: process.env.CI ? true : false,
      slowMo: process.env.CI ? 0 : 100
    });
  }

  async createContext(options: any = {}): Promise<BrowserContext> {
    return this.browser.newContext({
      ignoreHTTPSErrors: true,
      recordVideo: {
        dir: 'test-results/videos',
        size: { width: 1280, height: 720 }
      },
      ...options
    });
  }

  async seedTestData(scenario: string): Promise<any> {
    return this.dataSeeder.seedScenario(scenario);
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
    if (this.testDatabase) {
      await this.testDatabase.cleanup();
    }
  }

  get database(): TestDatabase {
    return this.testDatabase;
  }
}
```

### Test Data Seeding

```typescript
// tests/e2e/setup/data-seeder.ts
import { TestDatabase } from './database.setup';
import { FormBuilder } from '@tests/utils/builders/FormBuilder';
import { UserBuilder } from '@tests/utils/builders/UserBuilder';

export class TestDataSeeder {
  constructor(private database: TestDatabase) {}

  async seedScenario(scenario: string): Promise<any> {
    switch (scenario) {
      case 'form-creation-workflow':
        return this.seedFormCreationScenario();
      case 'submission-workflow':
        return this.seedSubmissionScenario();
      case 'multi-user-collaboration':
        return this.seedCollaborationScenario();
      case 'dashboard-analytics':
        return this.seedAnalyticsScenario();
      default:
        throw new Error(`Unknown scenario: ${scenario}`);
    }
  }

  private async seedFormCreationScenario(): Promise<any> {
    const user = UserBuilder.create()
      .withEmail('formcreator@example.com')
      .withRole('admin')
      .build();

    await this.database.query(
      'INSERT INTO users (id, email, role, created_at) VALUES ($1, $2, $3, $4)',
      [user.id, user.email, user.role, new Date()]
    );

    return { user };
  }

  private async seedSubmissionScenario(): Promise<any> {
    const user = UserBuilder.create()
      .withEmail('submitter@example.com')
      .withRole('user')
      .build();

    const form = FormBuilder.create()
      .withName('Contact Form')
      .withTextField('name', true)
      .withTextField('email', true)
      .withTextField('message')
      .build();

    await this.database.query(
      'INSERT INTO users (id, email, role, created_at) VALUES ($1, $2, $3, $4)',
      [user.id, user.email, user.role, new Date()]
    );

    await this.database.query(
      'INSERT INTO forms (id, name, definition, created_by, created_at) VALUES ($1, $2, $3, $4, $5)',
      [form.id, form.name, JSON.stringify(form), user.id, new Date()]
    );

    return { user, form };
  }

  private async seedCollaborationScenario(): Promise<any> {
    const admin = UserBuilder.create()
      .withEmail('admin@example.com')
      .withRole('admin')
      .build();

    const editor = UserBuilder.create()
      .withEmail('editor@example.com')
      .withRole('editor')
      .build();

    const viewer = UserBuilder.create()
      .withEmail('viewer@example.com')
      .withRole('viewer')
      .build();

    const users = [admin, editor, viewer];

    for (const user of users) {
      await this.database.query(
        'INSERT INTO users (id, email, role, created_at) VALUES ($1, $2, $3, $4)',
        [user.id, user.email, user.role, new Date()]
      );
    }

    return { admin, editor, viewer };
  }

  private async seedAnalyticsScenario(): Promise<any> {
    const user = UserBuilder.create()
      .withEmail('analyst@example.com')
      .withRole('admin')
      .build();

    // Create forms with submissions for analytics
    const forms = Array.from({ length: 3 }, (_, i) =>
      FormBuilder.create()
        .withName(`Analytics Form ${i + 1}`)
        .withTextField('name', true)
        .withTextField('email', true)
        .build()
    );

    await this.database.query(
      'INSERT INTO users (id, email, role, created_at) VALUES ($1, $2, $3, $4)',
      [user.id, user.email, user.role, new Date()]
    );

    for (const form of forms) {
      await this.database.query(
        'INSERT INTO forms (id, name, definition, created_by, created_at) VALUES ($1, $2, $3, $4, $5)',
        [form.id, form.name, JSON.stringify(form), user.id, new Date()]
      );

      // Create sample submissions
      for (let i = 0; i < 10; i++) {
        const submissionId = `submission-${form.id}-${i}`;
        await this.database.query(
          'INSERT INTO submissions (id, form_id, data, submitted_at) VALUES ($1, $2, $3, $4)',
          [
            submissionId,
            form.id,
            JSON.stringify({ name: `User ${i}`, email: `user${i}@example.com` }),
            new Date(Date.now() - i * 24 * 60 * 60 * 1000) // Submissions over past 10 days
          ]
        );
      }
    }

    return { user, forms };
  }
}
```

## Core E2E Test Patterns

### Page Object Model

```typescript
// tests/e2e/pages/form-builder.page.ts
import { Page, Locator, expect } from '@playwright/test';

export class FormBuilderPage {
  readonly page: Page;
  readonly formNameInput: Locator;
  readonly addFieldButton: Locator;
  readonly fieldTypeSelect: Locator;
  readonly fieldNameInput: Locator;
  readonly fieldLabelInput: Locator;
  readonly fieldRequiredCheckbox: Locator;
  readonly saveFieldButton: Locator;
  readonly previewButton: Locator;
  readonly publishButton: Locator;
  readonly formCanvas: Locator;

  constructor(page: Page) {
    this.page = page;
    this.formNameInput = page.locator('[data-testid="form-name-input"]');
    this.addFieldButton = page.locator('[data-testid="add-field-button"]');
    this.fieldTypeSelect = page.locator('[data-testid="field-type-select"]');
    this.fieldNameInput = page.locator('[data-testid="field-name-input"]');
    this.fieldLabelInput = page.locator('[data-testid="field-label-input"]');
    this.fieldRequiredCheckbox = page.locator('[data-testid="field-required-checkbox"]');
    this.saveFieldButton = page.locator('[data-testid="save-field-button"]');
    this.previewButton = page.locator('[data-testid="preview-button"]');
    this.publishButton = page.locator('[data-testid="publish-button"]');
    this.formCanvas = page.locator('[data-testid="form-canvas"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/forms/builder');
    await this.page.waitForLoadState('networkidle');
  }

  async createForm(name: string): Promise<void> {
    await this.formNameInput.fill(name);
    await this.page.keyboard.press('Tab'); // Trigger blur event
    await this.page.waitForTimeout(500); // Wait for auto-save
  }

  async addTextField(options: {
    name: string;
    label: string;
    required?: boolean;
  }): Promise<void> {
    await this.addFieldButton.click();
    await this.fieldTypeSelect.selectOption('text');
    await this.fieldNameInput.fill(options.name);
    await this.fieldLabelInput.fill(options.label);

    if (options.required) {
      await this.fieldRequiredCheckbox.check();
    }

    await this.saveFieldButton.click();

    // Wait for field to appear in canvas
    await this.formCanvas.locator(`[data-field-name="${options.name}"]`).waitFor();
  }

  async addEmailField(options: {
    name: string;
    label: string;
    required?: boolean;
  }): Promise<void> {
    await this.addFieldButton.click();
    await this.fieldTypeSelect.selectOption('email');
    await this.fieldNameInput.fill(options.name);
    await this.fieldLabelInput.fill(options.label);

    if (options.required) {
      await this.fieldRequiredCheckbox.check();
    }

    await this.saveFieldButton.click();
    await this.formCanvas.locator(`[data-field-name="${options.name}"]`).waitFor();
  }

  async addTextareaField(options: {
    name: string;
    label: string;
    required?: boolean;
  }): Promise<void> {
    await this.addFieldButton.click();
    await this.fieldTypeSelect.selectOption('textarea');
    await this.fieldNameInput.fill(options.name);
    await this.fieldLabelInput.fill(options.label);

    if (options.required) {
      await this.fieldRequiredCheckbox.check();
    }

    await this.saveFieldButton.click();
    await this.formCanvas.locator(`[data-field-name="${options.name}"]`).waitFor();
  }

  async previewForm(): Promise<void> {
    await this.previewButton.click();
    await this.page.waitForURL('**/preview');
    await this.page.waitForLoadState('networkidle');
  }

  async publishForm(): Promise<{ formId: string; publicUrl: string }> {
    await this.publishButton.click();

    // Wait for publish modal or confirmation
    const publishModal = this.page.locator('[data-testid="publish-modal"]');
    await publishModal.waitFor();

    const confirmButton = publishModal.locator('[data-testid="confirm-publish"]');
    await confirmButton.click();

    // Wait for success message and extract URLs
    const successMessage = this.page.locator('[data-testid="publish-success"]');
    await successMessage.waitFor();

    const formId = await this.page.locator('[data-testid="form-id"]').textContent();
    const publicUrl = await this.page.locator('[data-testid="public-url"]').textContent();

    return { formId: formId!, publicUrl: publicUrl! };
  }

  async waitForSave(): Promise<void> {
    const saveIndicator = this.page.locator('[data-testid="save-indicator"]');
    await saveIndicator.waitFor({ state: 'visible' });
    await saveIndicator.waitFor({ state: 'hidden' });
  }

  async verifyFieldExists(fieldName: string): Promise<void> {
    const field = this.formCanvas.locator(`[data-field-name="${fieldName}"]`);
    await expect(field).toBeVisible();
  }

  async deleteField(fieldName: string): Promise<void> {
    const field = this.formCanvas.locator(`[data-field-name="${fieldName}"]`);
    await field.hover();
    await field.locator('[data-testid="delete-field-button"]').click();

    // Confirm deletion
    const confirmDialog = this.page.locator('[data-testid="confirm-dialog"]');
    await confirmDialog.locator('[data-testid="confirm-button"]').click();

    // Wait for field to be removed
    await expect(field).not.toBeVisible();
  }
}
```

```typescript
// tests/e2e/pages/form-submission.page.ts
import { Page, Locator, expect } from '@playwright/test';

export class FormSubmissionPage {
  readonly page: Page;
  readonly submitButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.submitButton = page.locator('[data-testid="submit-button"]');
    this.successMessage = page.locator('[data-testid="success-message"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
  }

  async goto(formId: string): Promise<void> {
    await this.page.goto(`/forms/${formId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async fillField(fieldName: string, value: string): Promise<void> {
    const field = this.page.locator(`[name="${fieldName}"]`);
    await field.fill(value);
  }

  async selectOption(fieldName: string, value: string): Promise<void> {
    const field = this.page.locator(`[name="${fieldName}"]`);
    await field.selectOption(value);
  }

  async uploadFile(fieldName: string, filePath: string): Promise<void> {
    const field = this.page.locator(`[name="${fieldName}"]`);
    await field.setInputFiles(filePath);
  }

  async submitForm(): Promise<void> {
    await this.submitButton.click();
  }

  async waitForSubmissionSuccess(): Promise<void> {
    await this.successMessage.waitFor({ timeout: 10000 });
  }

  async waitForSubmissionError(): Promise<void> {
    await this.errorMessage.waitFor({ timeout: 10000 });
  }

  async verifyValidationError(fieldName: string, expectedMessage: string): Promise<void> {
    const fieldError = this.page.locator(`[data-testid="field-error-${fieldName}"]`);
    await expect(fieldError).toBeVisible();
    await expect(fieldError).toContainText(expectedMessage);
  }

  async verifyFieldValue(fieldName: string, expectedValue: string): Promise<void> {
    const field = this.page.locator(`[name="${fieldName}"]`);
    await expect(field).toHaveValue(expectedValue);
  }
}
```

### Authentication Helper

```typescript
// tests/e2e/helpers/auth.helper.ts
import { Page, BrowserContext } from '@playwright/test';

export class AuthHelper {
  constructor(private page: Page) {}

  async login(email: string, password: string = 'password123'): Promise<void> {
    await this.page.goto('/login');

    await this.page.locator('[data-testid="email-input"]').fill(email);
    await this.page.locator('[data-testid="password-input"]').fill(password);
    await this.page.locator('[data-testid="login-button"]').click();

    // Wait for redirect to dashboard
    await this.page.waitForURL('**/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async logout(): Promise<void> {
    await this.page.locator('[data-testid="user-menu"]').click();
    await this.page.locator('[data-testid="logout-button"]').click();

    // Wait for redirect to login page
    await this.page.waitForURL('**/login');
  }

  async setupAuthenticatedContext(context: BrowserContext, userEmail: string): Promise<void> {
    // Create a new page for authentication
    const authPage = await context.newPage();
    const authHelper = new AuthHelper(authPage);

    await authHelper.login(userEmail);

    // Close the auth page, context retains authentication
    await authPage.close();
  }

  static async createAuthenticatedContext(
    browser: any,
    userEmail: string
  ): Promise<BrowserContext> {
    const context = await browser.newContext();
    const authHelper = new AuthHelper(await context.newPage());

    await authHelper.login(userEmail);

    return context;
  }
}
```

## User Journey Tests

### Form Creation and Management Journey

```typescript
// tests/e2e/journeys/form-creation.e2e.ts
import { test, expect } from '@playwright/test';
import { E2EEnvironment } from '../setup/environment.setup';
import { FormBuilderPage } from '../pages/form-builder.page';
import { FormSubmissionPage } from '../pages/form-submission.page';
import { AuthHelper } from '../helpers/auth.helper';

test.describe('Form Creation and Management Journey', () => {
  let environment: E2EEnvironment;

  test.beforeAll(async () => {
    environment = await E2EEnvironment.getInstance();
  });

  test.afterAll(async () => {
    await environment.cleanup();
  });

  test('should create, publish, and receive submissions for a contact form', async ({ browser }) => {
    // Seed test data
    const { user } = await environment.seedTestData('form-creation-workflow');

    // Create authenticated context
    const context = await AuthHelper.createAuthenticatedContext(browser, user.email);
    const page = await context.newPage();

    // Step 1: Create a new form
    const formBuilder = new FormBuilderPage(page);
    await formBuilder.goto();

    await formBuilder.createForm('Contact Form');
    await formBuilder.waitForSave();

    // Step 2: Add form fields
    await formBuilder.addTextField({
      name: 'name',
      label: 'Full Name',
      required: true
    });

    await formBuilder.addEmailField({
      name: 'email',
      label: 'Email Address',
      required: true
    });

    await formBuilder.addTextareaField({
      name: 'message',
      label: 'Message',
      required: false
    });

    await formBuilder.waitForSave();

    // Step 3: Preview the form
    await formBuilder.previewForm();

    // Verify form fields are rendered correctly
    await expect(page.locator('[name="name"]')).toBeVisible();
    await expect(page.locator('[name="email"]')).toBeVisible();
    await expect(page.locator('[name="message"]')).toBeVisible();

    // Go back to builder
    await page.goBack();

    // Step 4: Publish the form
    const { formId, publicUrl } = await formBuilder.publishForm();

    // Step 5: Test form submission as an end user
    await context.close();

    // Create new anonymous context for form submission
    const submissionContext = await browser.newContext();
    const submissionPage = await submissionContext.newPage();

    const formSubmission = new FormSubmissionPage(submissionPage);
    await formSubmission.goto(formId);

    // Fill and submit the form
    await formSubmission.fillField('name', 'John Doe');
    await formSubmission.fillField('email', 'john@example.com');
    await formSubmission.fillField('message', 'This is a test message from E2E tests.');

    await formSubmission.submitForm();
    await formSubmission.waitForSubmissionSuccess();

    // Step 6: Verify submission was received (as form owner)
    const verificationContext = await AuthHelper.createAuthenticatedContext(browser, user.email);
    const verificationPage = await verificationContext.newPage();

    await verificationPage.goto('/dashboard/submissions');

    // Wait for submission to appear in list
    const submissionRow = verificationPage.locator('[data-testid="submission-row"]').first();
    await submissionRow.waitFor({ timeout: 10000 });

    // Verify submission details
    await expect(submissionRow.locator('[data-testid="submitter-name"]')).toContainText('John Doe');
    await expect(submissionRow.locator('[data-testid="submitter-email"]')).toContainText('john@example.com');

    // Clean up contexts
    await submissionContext.close();
    await verificationContext.close();
  });

  test('should handle form validation errors', async ({ browser }) => {
    const { user } = await environment.seedTestData('form-creation-workflow');
    const context = await AuthHelper.createAuthenticatedContext(browser, user.email);
    const page = await context.newPage();

    // Create form with validation
    const formBuilder = new FormBuilderPage(page);
    await formBuilder.goto();

    await formBuilder.createForm('Validation Test Form');
    await formBuilder.addTextField({ name: 'name', label: 'Name', required: true });
    await formBuilder.addEmailField({ name: 'email', label: 'Email', required: true });

    const { formId } = await formBuilder.publishForm();

    // Test validation as end user
    await context.close();
    const submissionContext = await browser.newContext();
    const submissionPage = await submissionContext.newPage();

    const formSubmission = new FormSubmissionPage(submissionPage);
    await formSubmission.goto(formId);

    // Submit empty form (should show validation errors)
    await formSubmission.submitForm();

    await formSubmission.verifyValidationError('name', 'Name is required');
    await formSubmission.verifyValidationError('email', 'Email is required');

    // Fill name but provide invalid email
    await formSubmission.fillField('name', 'John Doe');
    await formSubmission.fillField('email', 'invalid-email');
    await formSubmission.submitForm();

    await formSubmission.verifyValidationError('email', 'Please enter a valid email address');

    // Provide valid data
    await formSubmission.fillField('email', 'john@example.com');
    await formSubmission.submitForm();
    await formSubmission.waitForSubmissionSuccess();

    await submissionContext.close();
  });
});
```

### Dashboard and Analytics Journey

```typescript
// tests/e2e/journeys/dashboard-analytics.e2e.ts
import { test, expect } from '@playwright/test';
import { E2EEnvironment } from '../setup/environment.setup';
import { AuthHelper } from '../helpers/auth.helper';

test.describe('Dashboard and Analytics Journey', () => {
  let environment: E2EEnvironment;

  test.beforeAll(async () => {
    environment = await E2EEnvironment.getInstance();
  });

  test.afterAll(async () => {
    await environment.cleanup();
  });

  test('should display analytics and allow data exploration', async ({ browser }) => {
    const { user, forms } = await environment.seedTestData('dashboard-analytics');

    const context = await AuthHelper.createAuthenticatedContext(browser, user.email);
    const page = await context.newPage();

    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify overview metrics
    const totalFormsMetric = page.locator('[data-testid="total-forms-metric"]');
    await expect(totalFormsMetric).toContainText('3');

    const totalSubmissionsMetric = page.locator('[data-testid="total-submissions-metric"]');
    await expect(totalSubmissionsMetric).toContainText('30'); // 3 forms × 10 submissions each

    // Navigate to analytics page
    await page.locator('[data-testid="analytics-nav"]').click();
    await page.waitForURL('**/analytics');

    // Verify charts are rendered
    const submissionsChart = page.locator('[data-testid="submissions-chart"]');
    await expect(submissionsChart).toBeVisible();

    const formsChart = page.locator('[data-testid="forms-chart"]');
    await expect(formsChart).toBeVisible();

    // Test date range filtering
    const dateRangeButton = page.locator('[data-testid="date-range-button"]');
    await dateRangeButton.click();

    const lastWeekOption = page.locator('[data-testid="last-week-option"]');
    await lastWeekOption.click();

    // Wait for charts to update
    await page.waitForTimeout(1000);

    // Verify submission details view
    await page.locator('[data-testid="submissions-tab"]').click();

    const submissionsList = page.locator('[data-testid="submissions-list"]');
    await expect(submissionsList).toBeVisible();

    // Verify we can see submissions from all forms
    const submissionRows = page.locator('[data-testid="submission-row"]');
    await expect(submissionRows).toHaveCount(30);

    // Test form filtering
    const formFilter = page.locator('[data-testid="form-filter"]');
    await formFilter.selectOption(forms[0].id);

    // Should show only submissions for selected form
    await expect(submissionRows).toHaveCount(10);

    // Test export functionality
    const exportButton = page.locator('[data-testid="export-button"]');

    // Start download and verify
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/submissions.*\.csv$/);

    await context.close();
  });

  test('should handle real-time updates in dashboard', async ({ browser }) => {
    const { user } = await environment.seedTestData('dashboard-analytics');

    // Create two contexts: one for dashboard monitoring, one for creating submissions
    const dashboardContext = await AuthHelper.createAuthenticatedContext(browser, user.email);
    const dashboardPage = await dashboardContext.newPage();

    await dashboardPage.goto('/dashboard');
    await dashboardPage.waitForLoadState('networkidle');

    // Get initial submission count
    const initialCount = await dashboardPage.locator('[data-testid="total-submissions-metric"]').textContent();
    const initialValue = parseInt(initialCount!);

    // Create a new form and submission via API (simulating real user activity)
    const apiContext = await dashboardPage.request;

    const formResponse = await apiContext.post('/api/forms', {
      data: {
        name: 'Real-time Test Form',
        fields: [
          { name: 'email', type: 'email', required: true }
        ]
      }
    });

    const formData = await formResponse.json();
    const formId = formData.id;

    // Submit to the form
    await apiContext.post(`/api/forms/${formId}/submissions`, {
      data: {
        email: 'realtime@example.com'
      }
    });

    // Wait for real-time update in dashboard
    await expect(dashboardPage.locator('[data-testid="total-submissions-metric"]')).toContainText(
      (initialValue + 1).toString(),
      { timeout: 10000 }
    );

    // Verify real-time notification appears
    const notification = dashboardPage.locator('[data-testid="new-submission-notification"]');
    await expect(notification).toBeVisible({ timeout: 5000 });
    await expect(notification).toContainText('realtime@example.com');

    await dashboardContext.close();
  });
});
```

### Multi-User Collaboration Journey

```typescript
// tests/e2e/journeys/collaboration.e2e.ts
import { test, expect } from '@playwright/test';
import { E2EEnvironment } from '../setup/environment.setup';
import { FormBuilderPage } from '../pages/form-builder.page';
import { AuthHelper } from '../helpers/auth.helper';

test.describe('Multi-User Collaboration Journey', () => {
  let environment: E2EEnvironment;

  test.beforeAll(async () => {
    environment = await E2EEnvironment.getInstance();
  });

  test.afterAll(async () => {
    await environment.cleanup();
  });

  test('should allow collaborative form editing with real-time updates', async ({ browser }) => {
    const { admin, editor, viewer } = await environment.seedTestData('multi-user-collaboration');

    // Admin creates initial form
    const adminContext = await AuthHelper.createAuthenticatedContext(browser, admin.email);
    const adminPage = await adminContext.newPage();

    const adminFormBuilder = new FormBuilderPage(adminPage);
    await adminFormBuilder.goto();

    await adminFormBuilder.createForm('Collaborative Form');
    await adminFormBuilder.addTextField({ name: 'name', label: 'Name', required: true });

    // Get form URL for sharing
    const formUrl = adminPage.url();

    // Editor joins the same form
    const editorContext = await AuthHelper.createAuthenticatedContext(browser, editor.email);
    const editorPage = await editorContext.newPage();

    await editorPage.goto(formUrl);

    const editorFormBuilder = new FormBuilderPage(editorPage);

    // Verify editor can see admin's changes
    await editorFormBuilder.verifyFieldExists('name');

    // Editor adds a field
    await editorFormBuilder.addEmailField({ name: 'email', label: 'Email', required: true });

    // Admin should see editor's changes in real-time
    await adminFormBuilder.verifyFieldExists('email');

    // Verify collaboration indicators
    const collaboratorsList = adminPage.locator('[data-testid="collaborators-list"]');
    await expect(collaboratorsList).toContainText(editor.email);

    // Viewer opens form (read-only access)
    const viewerContext = await AuthHelper.createAuthenticatedContext(browser, viewer.email);
    const viewerPage = await viewerContext.newPage();

    await viewerPage.goto(formUrl);

    // Verify viewer can see form but cannot edit
    await expect(viewerPage.locator('[data-testid="read-only-notice"]')).toBeVisible();
    await expect(viewerPage.locator('[data-testid="add-field-button"]')).not.toBeVisible();

    // But viewer should see all fields
    await expect(viewerPage.locator('[data-field-name="name"]')).toBeVisible();
    await expect(viewerPage.locator('[data-field-name="email"]')).toBeVisible();

    // Test conflict resolution: both admin and editor try to modify same field
    await adminPage.locator('[data-field-name="name"]').click();
    await adminPage.locator('[data-testid="field-label-input"]').fill('Full Name');

    await editorPage.locator('[data-field-name="name"]').click();
    await editorPage.locator('[data-testid="field-label-input"]').fill('Customer Name');

    // Save both changes (should trigger conflict resolution)
    await adminPage.locator('[data-testid="save-field-button"]').click();
    await editorPage.locator('[data-testid="save-field-button"]').click();

    // Verify conflict resolution dialog appears for editor
    const conflictDialog = editorPage.locator('[data-testid="conflict-dialog"]');
    await expect(conflictDialog).toBeVisible();

    // Editor chooses to keep their version
    await conflictDialog.locator('[data-testid="keep-my-version"]').click();

    // Verify field label is updated to editor's version
    await expect(adminPage.locator('[data-field-name="name"] [data-testid="field-label"]')).toContainText('Customer Name');

    // Clean up contexts
    await adminContext.close();
    await editorContext.close();
    await viewerContext.close();
  });
});
```

## Cross-Browser and Device Testing

### Responsive Design Testing

```typescript
// tests/e2e/responsive/mobile-form-building.e2e.ts
import { test, expect, devices } from '@playwright/test';
import { E2EEnvironment } from '../setup/environment.setup';
import { FormBuilderPage } from '../pages/form-builder.page';
import { AuthHelper } from '../helpers/auth.helper';

test.describe('Mobile Form Building', () => {
  let environment: E2EEnvironment;

  test.beforeAll(async () => {
    environment = await E2EEnvironment.getInstance();
  });

  test.afterAll(async () => {
    await environment.cleanup();
  });

  // Test on different mobile devices
  const mobileDevices = [
    devices['iPhone 12'],
    devices['Pixel 5'],
    devices['iPad Pro']
  ];

  for (const device of mobileDevices) {
    test(`should work on ${device.name || 'mobile device'}`, async ({ browser }) => {
      const { user } = await environment.seedTestData('form-creation-workflow');

      const context = await browser.newContext({
        ...device
      });

      const page = await context.newPage();
      const authHelper = new AuthHelper(page);
      await authHelper.login(user.email);

      const formBuilder = new FormBuilderPage(page);
      await formBuilder.goto();

      // Verify mobile-specific UI elements
      const mobileMenu = page.locator('[data-testid="mobile-menu"]');
      if (device.viewport!.width < 768) {
        await expect(mobileMenu).toBeVisible();
      }

      // Test form creation on mobile
      await formBuilder.createForm('Mobile Test Form');

      // Mobile field addition might use different UI
      const addFieldButton = formBuilder.addFieldButton;
      await expect(addFieldButton).toBeVisible();
      await addFieldButton.click();

      // Verify field configuration panel is accessible on mobile
      const fieldPanel = page.locator('[data-testid="field-config-panel"]');
      await expect(fieldPanel).toBeVisible();

      await formBuilder.addTextField({
        name: 'mobile_field',
        label: 'Mobile Field',
        required: true
      });

      // Verify field appears in mobile canvas
      await formBuilder.verifyFieldExists('mobile_field');

      await context.close();
    });
  }
});
```

### Cross-Browser Compatibility Testing

```typescript
// tests/e2e/compatibility/browser-compatibility.e2e.ts
import { test, expect } from '@playwright/test';
import { E2EEnvironment } from '../setup/environment.setup';
import { FormSubmissionPage } from '../pages/form-submission.page';

test.describe('Cross-Browser Compatibility', () => {
  let environment: E2EEnvironment;

  test.beforeAll(async () => {
    environment = await E2EEnvironment.getInstance();
  });

  test.afterAll(async () => {
    await environment.cleanup();
  });

  // Test specific browser features
  test('should handle file uploads across browsers', async ({ browserName, page }) => {
    const { form } = await environment.seedTestData('submission-workflow');

    // Add file upload field to form via API
    await page.request.patch(`/api/forms/${form.id}`, {
      data: {
        fields: [
          ...form.fields,
          { name: 'attachment', type: 'file', required: false }
        ]
      }
    });

    const formSubmission = new FormSubmissionPage(page);
    await formSubmission.goto(form.id);

    // Create test file
    const testFilePath = 'tests/fixtures/test-file.txt';

    // Test file upload behavior across browsers
    await formSubmission.uploadFile('attachment', testFilePath);

    // Verify file upload indicators work in all browsers
    const fileInput = page.locator('[name="attachment"]');
    const fileName = await fileInput.evaluate((input: HTMLInputElement) => {
      return input.files?.[0]?.name;
    });

    expect(fileName).toBe('test-file.txt');

    // Submit form and verify file was uploaded
    await formSubmission.fillField('name', 'File Upload Test');
    await formSubmission.fillField('email', 'filetest@example.com');
    await formSubmission.submitForm();
    await formSubmission.waitForSubmissionSuccess();

    // Browser-specific behavior notes
    if (browserName === 'webkit') {
      // Safari might have different file upload behavior
      console.log('File upload tested on Safari');
    } else if (browserName === 'firefox') {
      // Firefox might handle file validation differently
      console.log('File upload tested on Firefox');
    }
  });

  test('should handle date inputs across browsers', async ({ browserName, page }) => {
    const { form } = await environment.seedTestData('submission-workflow');

    // Add date field
    await page.request.patch(`/api/forms/${form.id}`, {
      data: {
        fields: [
          ...form.fields,
          { name: 'birthdate', type: 'date', required: true }
        ]
      }
    });

    const formSubmission = new FormSubmissionPage(page);
    await formSubmission.goto(form.id);

    const dateField = page.locator('[name="birthdate"]');

    // Different browsers handle date inputs differently
    if (browserName === 'webkit') {
      // Safari might not support HTML5 date input
      await dateField.fill('01/15/1990');
    } else {
      // Chrome and Firefox support HTML5 date input
      await dateField.fill('1990-01-15');
    }

    await formSubmission.fillField('name', 'Date Test User');
    await formSubmission.fillField('email', 'datetest@example.com');
    await formSubmission.submitForm();
    await formSubmission.waitForSubmissionSuccess();
  });
});
```

## Visual Regression Testing

```typescript
// tests/e2e/visual/form-builder-visual.e2e.ts
import { test, expect } from '@playwright/test';
import { E2EEnvironment } from '../setup/environment.setup';
import { FormBuilderPage } from '../pages/form-builder.page';
import { AuthHelper } from '../helpers/auth.helper';

test.describe('Form Builder Visual Regression', () => {
  let environment: E2EEnvironment;

  test.beforeAll(async () => {
    environment = await E2EEnvironment.getInstance();
  });

  test.afterAll(async () => {
    await environment.cleanup();
  });

  test('should match form builder layout snapshots', async ({ page }) => {
    const { user } = await environment.seedTestData('form-creation-workflow');

    const authHelper = new AuthHelper(page);
    await authHelper.login(user.email);

    const formBuilder = new FormBuilderPage(page);
    await formBuilder.goto();

    // Take full page screenshot
    await expect(page).toHaveScreenshot('form-builder-empty.png');

    // Create form with fields
    await formBuilder.createForm('Visual Test Form');
    await formBuilder.addTextField({ name: 'name', label: 'Name', required: true });
    await formBuilder.addEmailField({ name: 'email', label: 'Email', required: true });

    // Take screenshot with form fields
    await expect(page).toHaveScreenshot('form-builder-with-fields.png');

    // Test field configuration panel
    await page.locator('[data-field-name="name"]').click();
    await expect(page).toHaveScreenshot('form-builder-field-config.png');

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page).toHaveScreenshot('form-builder-mobile.png');
  });

  test('should match form submission page snapshots', async ({ page }) => {
    const { form } = await environment.seedTestData('submission-workflow');

    const formSubmission = new FormSubmissionPage(page);
    await formSubmission.goto(form.id);

    // Empty form screenshot
    await expect(page).toHaveScreenshot('form-submission-empty.png');

    // Fill form partially
    await formSubmission.fillField('name', 'Visual Test User');
    await expect(page).toHaveScreenshot('form-submission-partial.png');

    // Show validation errors
    await formSubmission.submitForm();
    await expect(page).toHaveScreenshot('form-submission-validation-errors.png');

    // Success state
    await formSubmission.fillField('email', 'visual@example.com');
    await formSubmission.submitForm();
    await formSubmission.waitForSubmissionSuccess();
    await expect(page).toHaveScreenshot('form-submission-success.png');
  });
});
```

## Performance Testing

```typescript
// tests/e2e/performance/page-performance.e2e.ts
import { test, expect } from '@playwright/test';
import { E2EEnvironment } from '../setup/environment.setup';
import { AuthHelper } from '../helpers/auth.helper';

test.describe('Page Performance', () => {
  let environment: E2EEnvironment;

  test.beforeAll(async () => {
    environment = await E2EEnvironment.getInstance();
  });

  test.afterAll(async () => {
    await environment.cleanup();
  });

  test('should load form builder within performance thresholds', async ({ page }) => {
    const { user } = await environment.seedTestData('form-creation-workflow');

    const authHelper = new AuthHelper(page);
    await authHelper.login(user.email);

    // Start performance measurement
    const startTime = Date.now();

    await page.goto('/forms/builder');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Assert load time is under 3 seconds
    expect(loadTime).toBeLessThan(3000);

    // Check for performance metrics
    const performanceEntries = await page.evaluate(() => {
      const entries = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: entries.domContentLoadedEventEnd - entries.domContentLoadedEventStart,
        loadComplete: entries.loadEventEnd - entries.loadEventStart,
        firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime,
        firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime
      };
    });

    expect(performanceEntries.domContentLoaded).toBeLessThan(1500);
    expect(performanceEntries.firstContentfulPaint).toBeLessThan(2000);
  });

  test('should handle large forms efficiently', async ({ page }) => {
    const { user } = await environment.seedTestData('form-creation-workflow');

    const authHelper = new AuthHelper(page);
    await authHelper.login(user.email);

    // Create form with many fields via API (faster than UI)
    const manyFields = Array.from({ length: 50 }, (_, i) => ({
      name: `field_${i}`,
      label: `Field ${i}`,
      type: 'text',
      required: false
    }));

    const formResponse = await page.request.post('/api/forms', {
      data: {
        name: 'Large Form Performance Test',
        fields: manyFields
      }
    });

    const formData = await formResponse.json();
    const formId = formData.id;

    // Navigate to form builder with large form
    const startTime = Date.now();

    await page.goto(`/forms/builder/${formId}`);
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Large forms should still load within reasonable time
    expect(loadTime).toBeLessThan(5000);

    // Test form rendering performance
    const renderStart = Date.now();

    // Scroll through form to trigger field rendering
    await page.locator('[data-testid="form-canvas"]').scrollIntoView();
    await page.waitForTimeout(100);

    const renderTime = Date.now() - renderStart;
    expect(renderTime).toBeLessThan(1000);

    // Test field addition performance with many existing fields
    const addFieldStart = Date.now();

    await page.locator('[data-testid="add-field-button"]').click();
    await page.locator('[data-testid="field-type-select"]').selectOption('text');
    await page.locator('[data-testid="field-name-input"]').fill('performance_field');
    await page.locator('[data-testid="field-label-input"]').fill('Performance Field');
    await page.locator('[data-testid="save-field-button"]').click();

    // Wait for field to appear
    await page.locator('[data-field-name="performance_field"]').waitFor();

    const addFieldTime = Date.now() - addFieldStart;
    expect(addFieldTime).toBeLessThan(2000);
  });
});
```

## Accessibility Testing

```typescript
// tests/e2e/accessibility/form-accessibility.e2e.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { E2EEnvironment } from '../setup/environment.setup';
import { FormBuilderPage } from '../pages/form-builder.page';
import { FormSubmissionPage } from '../pages/form-submission.page';
import { AuthHelper } from '../helpers/auth.helper';

test.describe('Form Accessibility', () => {
  let environment: E2EEnvironment;

  test.beforeAll(async () => {
    environment = await E2EEnvironment.getInstance();
  });

  test.afterAll(async () => {
    await environment.cleanup();
  });

  test('should have no accessibility violations in form builder', async ({ page }) => {
    const { user } = await environment.seedTestData('form-creation-workflow');

    const authHelper = new AuthHelper(page);
    await authHelper.login(user.email);

    const formBuilder = new FormBuilderPage(page);
    await formBuilder.goto();

    // Run accessibility scan on empty builder
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Create form and scan again
    await formBuilder.createForm('Accessibility Test Form');
    await formBuilder.addTextField({ name: 'name', label: 'Name', required: true });
    await formBuilder.addEmailField({ name: 'email', label: 'Email', required: true });

    const scanWithFields = await new AxeBuilder({ page }).analyze();
    expect(scanWithFields.violations).toEqual([]);
  });

  test('should have no accessibility violations in form submission', async ({ page }) => {
    const { form } = await environment.seedTestData('submission-workflow');

    const formSubmission = new FormSubmissionPage(page);
    await formSubmission.goto(form.id);

    // Scan form submission page
    const submissionScan = await new AxeBuilder({ page }).analyze();
    expect(submissionScan.violations).toEqual([]);

    // Test with validation errors
    await formSubmission.submitForm();

    const scanWithErrors = await new AxeBuilder({ page }).analyze();
    expect(scanWithErrors.violations).toEqual([]);
  });

  test('should support keyboard navigation', async ({ page }) => {
    const { user } = await environment.seedTestData('form-creation-workflow');

    const authHelper = new AuthHelper(page);
    await authHelper.login(user.email);

    const formBuilder = new FormBuilderPage(page);
    await formBuilder.goto();

    // Test keyboard navigation in form builder
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="form-name-input"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="add-field-button"]')).toBeFocused();

    // Test form submission keyboard navigation
    const { form } = await environment.seedTestData('submission-workflow');

    const formSubmission = new FormSubmissionPage(page);
    await formSubmission.goto(form.id);

    // Tab through form fields
    await page.keyboard.press('Tab');
    await expect(page.locator('[name="name"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[name="email"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="submit-button"]')).toBeFocused();

    // Test form submission with keyboard
    await page.keyboard.press('Enter');

    // Verify validation errors are announced
    const nameField = page.locator('[name="name"]');
    await expect(nameField).toHaveAttribute('aria-invalid', 'true');
    await expect(nameField).toHaveAttribute('aria-describedby');
  });

  test('should support screen readers', async ({ page }) => {
    const { form } = await environment.seedTestData('submission-workflow');

    const formSubmission = new FormSubmissionPage(page);
    await formSubmission.goto(form.id);

    // Verify ARIA labels and descriptions
    const nameField = page.locator('[name="name"]');
    await expect(nameField).toHaveAttribute('aria-label');

    const emailField = page.locator('[name="email"]');
    await expect(emailField).toHaveAttribute('aria-label');

    // Verify required field indicators
    await expect(nameField).toHaveAttribute('aria-required', 'true');
    await expect(emailField).toHaveAttribute('aria-required', 'true');

    // Test error announcements
    await formSubmission.submitForm();

    const nameError = page.locator('[data-testid="field-error-name"]');
    await expect(nameError).toHaveAttribute('role', 'alert');
    await expect(nameError).toHaveAttribute('aria-live', 'polite');

    // Verify form landmarks
    const form = page.locator('form');
    await expect(form).toHaveAttribute('role', 'form');

    const submitButton = page.locator('[data-testid="submit-button"]');
    await expect(submitButton).toHaveAttribute('type', 'submit');
  });
});
```

## Configuration and CI Integration

### Package.json Scripts

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:mobile": "playwright test --project='Mobile Chrome' --project='Mobile Safari'",
    "test:e2e:production": "playwright test --config=playwright.production.config.ts",
    "test:e2e:visual": "playwright test tests/e2e/visual",
    "test:e2e:accessibility": "playwright test tests/e2e/accessibility",
    "test:e2e:performance": "playwright test tests/e2e/performance"
  }
}
```

### CI Configuration

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 6 * * *' # Daily at 6 AM UTC

jobs:
  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: pliers_e2e_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Build application
        run: npm run build

      - name: Start application
        run: npm run start &
        env:
          NODE_ENV: test
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/pliers_e2e_test
          REDIS_URL: redis://localhost:6379

      - name: Wait for application
        run: npx wait-on http://localhost:3000

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          E2E_BASE_URL: http://localhost:3000

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

      - name: Upload videos
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: test-videos
          path: test-results/
```

## Best Practices and Guidelines

### Test Organization

1. **Page Object Pattern**: Use page objects for reusable UI interactions
2. **Test Data Management**: Use factories and builders for consistent test data
3. **Environment Isolation**: Each test should have isolated data and state
4. **Clear Test Names**: Use descriptive names that explain the user scenario
5. **Logical Grouping**: Group tests by user journey or feature area

### Performance Optimization

1. **Parallel Execution**: Run independent tests in parallel
2. **Resource Cleanup**: Clean up test data and resources after tests
3. **Smart Waiting**: Use Playwright's auto-waiting instead of fixed timeouts
4. **Selective Testing**: Run different test suites for different environments
5. **Browser Reuse**: Reuse browser contexts when possible

### Maintenance

1. **Regular Updates**: Keep Playwright and dependencies updated
2. **Visual Baseline Management**: Update visual baselines when UI changes
3. **Flaky Test Investigation**: Investigate and fix unstable tests promptly
4. **Performance Monitoring**: Track test execution time and optimize slow tests
5. **Cross-Browser Testing**: Regularly test on all supported browsers

### Debugging

1. **Video Recording**: Enable video recording for failed tests
2. **Screenshots**: Take screenshots at key points in test execution
3. **Debug Mode**: Use Playwright's debug mode for step-by-step debugging
4. **Network Logs**: Capture network traffic for API-related issues
5. **Console Logs**: Monitor browser console for JavaScript errors

## Relationships
- **Parent Nodes:** [foundation/testing/index.md] - categorizes - E2E testing as part of overall testing strategy
- **Child Nodes:** None
- **Related Nodes:**
  - [foundation/testing/integration-testing-strategy.md] - complements - Integration testing with full user journey coverage
  - [foundation/testing/standards.md] - follows - Testing standards and conventions
  - [foundation/testing/patterns.md] - implements - Testing patterns for E2E scenarios
  - [foundation/components/*/api.md] - validates - API endpoints through E2E user workflows

## Navigation Guidance
- **Access Context**: Reference when implementing E2E tests or setting up browser automation
- **Common Next Steps**: Review test data management or specific user journey implementations
- **Related Tasks**: User acceptance testing, browser compatibility testing, accessibility validation
- **Update Patterns**: Update when new user workflows are added or UI components change

## Metadata
- **Created:** 2025-01-22
- **Last Updated:** 2025-01-22
- **Updated By:** Claude/TEST-001-2 Implementation

## Change History
- 2025-01-22: Initial E2E testing strategy document creation with comprehensive Playwright configuration