# User Journey Test Scenarios

## Purpose
This document defines comprehensive end-to-end user journey test scenarios for the Pliers v3 platform, covering complete user workflows from onboarding through form creation, collaboration, submission handling, and analytics review.

## Classification
- **Domain:** Supporting Element
- **Stability:** Dynamic
- **Abstraction:** Detailed
- **Confidence:** Evolving

## Overview

User journey tests validate complete workflows that users experience when interacting with the Pliers v3 platform. These scenarios ensure that all components work together seamlessly to deliver the intended user experience across different roles and use cases.

### Core Testing Principles

1. **User-Centric Focus**: Tests represent real user goals and workflows
2. **End-to-End Coverage**: Complete workflows from start to finish
3. **Role-Based Testing**: Different scenarios for different user types
4. **Cross-Device Validation**: Mobile, tablet, and desktop experiences
5. **Performance Awareness**: Realistic timing and response expectations
6. **Accessibility Compliance**: Scenarios include accessibility validation

## User Personas and Roles

### Primary User Personas

1. **Form Creator (Admin/Editor)**
   - Creates and manages forms
   - Configures form settings and validation
   - Reviews submissions and analytics
   - Collaborates with team members

2. **Form Submitter (End User)**
   - Discovers and accesses forms
   - Completes and submits form data
   - Receives confirmation and follow-up communications
   - May return to update submissions

3. **Team Collaborator (Editor/Viewer)**
   - Collaborates on form creation
   - Reviews and provides feedback
   - May have limited editing permissions
   - Accesses shared analytics

4. **Organization Admin**
   - Manages user accounts and permissions
   - Configures organization-wide settings
   - Reviews usage and performance metrics
   - Manages billing and subscriptions

## Core User Journey Scenarios

### 1. New User Onboarding Journey

```typescript
// tests/e2e/journeys/user-onboarding.e2e.ts
import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

test.describe('New User Onboarding Journey', () => {
  test('should complete full onboarding flow for new organization', async ({ page }) => {
    const userEmail = faker.internet.email();
    const organizationName = faker.company.name();

    // Step 1: Landing page and sign-up
    await page.goto('/');

    await expect(page.locator('[data-testid="hero-title"]')).toBeVisible();
    await page.locator('[data-testid="get-started-button"]').click();

    // Step 2: Sign-up form
    await expect(page).toHaveURL('/signup');

    await page.locator('[data-testid="email-input"]').fill(userEmail);
    await page.locator('[data-testid="password-input"]').fill('SecurePassword123!');
    await page.locator('[data-testid="confirm-password-input"]').fill('SecurePassword123!');
    await page.locator('[data-testid="first-name-input"]').fill('John');
    await page.locator('[data-testid="last-name-input"]').fill('Doe');
    await page.locator('[data-testid="organization-name-input"]').fill(organizationName);

    await page.locator('[data-testid="signup-button"]').click();

    // Step 3: Email verification
    await expect(page).toHaveURL('/verify-email');
    await expect(page.locator('[data-testid="verification-sent-message"]')).toContainText(userEmail);

    // Simulate email verification (in real test, you'd check email)
    await page.goto(`/verify-email?token=test-verification-token&email=${userEmail}`);

    // Step 4: Welcome and initial setup
    await expect(page).toHaveURL('/welcome');
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText('John');

    // Choose use case
    await page.locator('[data-testid="use-case-customer-feedback"]').click();
    await page.locator('[data-testid="continue-button"]').click();

    // Step 5: First form creation (guided)
    await expect(page).toHaveURL('/forms/builder?guided=true');
    await expect(page.locator('[data-testid="guided-tour-overlay"]')).toBeVisible();

    // Follow guided tour
    await page.locator('[data-testid="tour-next-button"]').click();

    await page.locator('[data-testid="form-name-input"]').fill('Customer Feedback Form');
    await page.locator('[data-testid="tour-next-button"]').click();

    // Add fields through guided tour
    await page.locator('[data-testid="add-field-button"]').click();
    await page.locator('[data-testid="field-type-text"]').click();
    await page.locator('[data-testid="field-name-input"]').fill('name');
    await page.locator('[data-testid="field-label-input"]').fill('Your Name');
    await page.locator('[data-testid="field-required-checkbox"]').check();
    await page.locator('[data-testid="save-field-button"]').click();

    await page.locator('[data-testid="tour-next-button"]').click();

    // Add email field
    await page.locator('[data-testid="add-field-button"]').click();
    await page.locator('[data-testid="field-type-email"]').click();
    await page.locator('[data-testid="field-name-input"]').fill('email');
    await page.locator('[data-testid="field-label-input"]').fill('Email Address');
    await page.locator('[data-testid="field-required-checkbox"]').check();
    await page.locator('[data-testid="save-field-button"]').click();

    await page.locator('[data-testid="tour-next-button"]').click();

    // Add rating field
    await page.locator('[data-testid="add-field-button"]').click();
    await page.locator('[data-testid="field-type-radio"]').click();
    await page.locator('[data-testid="field-name-input"]').fill('rating');
    await page.locator('[data-testid="field-label-input"]').fill('How would you rate our service?');
    await page.locator('[data-testid="field-options-input"]').fill('Excellent\nGood\nAverage\nPoor');
    await page.locator('[data-testid="save-field-button"]').click();

    await page.locator('[data-testid="tour-next-button"]').click();

    // Step 6: Preview and publish
    await page.locator('[data-testid="preview-button"]').click();
    await expect(page).toHaveURL('**/preview');

    // Verify form preview
    await expect(page.locator('[name="name"]')).toBeVisible();
    await expect(page.locator('[name="email"]')).toBeVisible();
    await expect(page.locator('[name="rating"]')).toBeVisible();

    await page.goBack();

    // Publish form
    await page.locator('[data-testid="publish-button"]').click();
    await page.locator('[data-testid="confirm-publish-button"]').click();

    await expect(page.locator('[data-testid="publish-success-message"]')).toBeVisible();

    const publicUrl = await page.locator('[data-testid="public-form-url"]').textContent();
    expect(publicUrl).toMatch(/^https?:\/\//);

    // Step 7: Dashboard orientation
    await page.locator('[data-testid="go-to-dashboard-button"]').click();
    await expect(page).toHaveURL('/dashboard');

    // Verify dashboard elements
    await expect(page.locator('[data-testid="total-forms-metric"]')).toContainText('1');
    await expect(page.locator('[data-testid="total-submissions-metric"]')).toContainText('0');
    await expect(page.locator('[data-testid="recent-forms-list"]')).toContainText('Customer Feedback Form');

    // Step 8: Complete onboarding
    await expect(page.locator('[data-testid="onboarding-progress"]')).toContainText('100%');
    await page.locator('[data-testid="finish-onboarding-button"]').click();

    await expect(page.locator('[data-testid="onboarding-completed-celebration"]')).toBeVisible();
  });

  test('should handle onboarding for existing organization member', async ({ page }) => {
    // User invited to existing organization
    const inviteToken = 'test-invite-token-123';

    await page.goto(`/invite/accept?token=${inviteToken}`);

    // Step 1: Accept invitation
    await expect(page.locator('[data-testid="invite-details"]')).toContainText('Acme Corp');
    await expect(page.locator('[data-testid="inviter-name"]')).toContainText('John Smith');

    await page.locator('[data-testid="first-name-input"]').fill('Jane');
    await page.locator('[data-testid="last-name-input"]').fill('Doe');
    await page.locator('[data-testid="password-input"]').fill('SecurePassword123!');
    await page.locator('[data-testid="confirm-password-input"]').fill('SecurePassword123!');

    await page.locator('[data-testid="accept-invite-button"]').click();

    // Step 2: Role-specific onboarding
    await expect(page).toHaveURL('/welcome');
    await expect(page.locator('[data-testid="organization-name"]')).toContainText('Acme Corp');
    await expect(page.locator('[data-testid="assigned-role"]')).toContainText('Editor');

    // Skip organization setup (already done)
    await page.locator('[data-testid="continue-to-dashboard-button"]').click();

    // Step 3: Dashboard with existing data
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="total-forms-metric"]')).not.toContainText('0');
    await expect(page.locator('[data-testid="team-members-list"]')).toBeVisible();
  });
});
```

### 2. Form Creation and Publishing Journey

```typescript
// tests/e2e/journeys/form-creation-publishing.e2e.ts
import { test, expect } from '@playwright/test';

test.describe('Form Creation and Publishing Journey', () => {
  test('should create complex form with advanced features', async ({ page }) => {
    // Login as form creator
    await page.goto('/login');
    await page.locator('[data-testid="email-input"]').fill('creator@example.com');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();

    // Step 1: Start new form from dashboard
    await expect(page).toHaveURL('/dashboard');
    await page.locator('[data-testid="create-form-button"]').click();

    // Choose template
    await expect(page).toHaveURL('/forms/templates');
    await page.locator('[data-testid="template-event-registration"]').click();
    await page.locator('[data-testid="use-template-button"]').click();

    // Step 2: Customize form details
    await expect(page).toHaveURL('**/forms/builder');

    await page.locator('[data-testid="form-name-input"]').fill('Annual Conference Registration');
    await page.locator('[data-testid="form-description-input"]').fill('Register for our annual technology conference');

    // Step 3: Customize form fields

    // Modify existing name field
    await page.locator('[data-field-name="name"]').click();
    await page.locator('[data-testid="field-label-input"]').fill('Full Name');
    await page.locator('[data-testid="field-help-text-input"]').fill('Please enter your full name as it appears on your ID');
    await page.locator('[data-testid="save-field-button"]').click();

    // Add company field
    await page.locator('[data-testid="add-field-button"]').click();
    await page.locator('[data-testid="field-type-text"]').click();
    await page.locator('[data-testid="field-name-input"]').fill('company');
    await page.locator('[data-testid="field-label-input"]').fill('Company/Organization');
    await page.locator('[data-testid="field-required-checkbox"]').check();
    await page.locator('[data-testid="save-field-button"]').click();

    // Add dietary restrictions with conditional logic
    await page.locator('[data-testid="add-field-button"]').click();
    await page.locator('[data-testid="field-type-checkbox"]').click();
    await page.locator('[data-testid="field-name-input"]').fill('meal_required');
    await page.locator('[data-testid="field-label-input"]').fill('Will you be attending the lunch session?');
    await page.locator('[data-testid="save-field-button"]').click();

    // Add conditional dietary restrictions field
    await page.locator('[data-testid="add-field-button"]').click();
    await page.locator('[data-testid="field-type-textarea"]').click();
    await page.locator('[data-testid="field-name-input"]').fill('dietary_restrictions');
    await page.locator('[data-testid="field-label-input"]').fill('Dietary Restrictions or Allergies');

    // Set up conditional logic
    await page.locator('[data-testid="conditional-logic-tab"]').click();
    await page.locator('[data-testid="enable-conditional-logic"]').check();
    await page.locator('[data-testid="condition-field-select"]').selectOption('meal_required');
    await page.locator('[data-testid="condition-operator-select"]').selectOption('is_checked');
    await page.locator('[data-testid="save-field-button"]').click();

    // Add file upload for business card
    await page.locator('[data-testid="add-field-button"]').click();
    await page.locator('[data-testid="field-type-file"]').click();
    await page.locator('[data-testid="field-name-input"]').fill('business_card');
    await page.locator('[data-testid="field-label-input"]').fill('Business Card (Optional)');
    await page.locator('[data-testid="field-accept-types"]').fill('image/*,application/pdf');
    await page.locator('[data-testid="field-max-size"]').fill('2');
    await page.locator('[data-testid="save-field-button"]').click();

    // Step 4: Configure form settings
    await page.locator('[data-testid="form-settings-tab"]').click();

    // Set up notifications
    await page.locator('[data-testid="notification-email-input"]').fill('events@company.com');
    await page.locator('[data-testid="send-confirmation-email"]').check();

    // Configure success page
    await page.locator('[data-testid="custom-success-message"]').check();
    await page.locator('[data-testid="success-message-input"]').fill(
      'Thank you for registering! You will receive a confirmation email shortly with event details.'
    );

    // Set submission limits
    await page.locator('[data-testid="limit-submissions"]').check();
    await page.locator('[data-testid="max-submissions-input"]').fill('500');

    // Enable CAPTCHA
    await page.locator('[data-testid="enable-captcha"]').check();

    // Step 5: Set up styling and branding
    await page.locator('[data-testid="styling-tab"]').click();

    await page.locator('[data-testid="primary-color-input"]').fill('#1a365d');
    await page.locator('[data-testid="font-family-select"]').selectOption('Inter');

    // Upload logo
    await page.locator('[data-testid="logo-upload"]').setInputFiles('./tests/fixtures/company-logo.png');
    await expect(page.locator('[data-testid="logo-preview"]')).toBeVisible();

    // Step 6: Preview form
    await page.locator('[data-testid="preview-button"]').click();

    // Test form functionality in preview
    await page.locator('[name="name"]').fill('John Smith');
    await page.locator('[name="email"]').fill('john@company.com');
    await page.locator('[name="company"]').fill('Tech Corp');

    // Test conditional logic
    await page.locator('[name="meal_required"]').check();
    await expect(page.locator('[name="dietary_restrictions"]')).toBeVisible();

    await page.locator('[name="dietary_restrictions"]').fill('Vegetarian, no nuts');

    await page.goBack();

    // Step 7: Test form with validation
    await page.locator('[data-testid="test-form-button"]').click();

    // Submit empty form to test validation
    await page.locator('[data-testid="submit-button"]').click();

    await expect(page.locator('[data-testid="field-error-name"]')).toContainText('required');
    await expect(page.locator('[data-testid="field-error-email"]')).toContainText('required');
    await expect(page.locator('[data-testid="field-error-company"]')).toContainText('required');

    // Fill required fields and submit
    await page.locator('[name="name"]').fill('Test User');
    await page.locator('[name="email"]').fill('test@example.com');
    await page.locator('[name="company"]').fill('Test Company');

    await page.locator('[data-testid="submit-button"]').click();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Thank you for registering');

    await page.goBack();

    // Step 8: Publish form
    await page.locator('[data-testid="publish-button"]').click();

    // Review publish settings
    await expect(page.locator('[data-testid="publish-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="form-url-preview"]')).toContainText('/f/');

    await page.locator('[data-testid="custom-slug-input"]').fill('conference-registration-2024');
    await page.locator('[data-testid="enable-seo"]').check();
    await page.locator('[data-testid="seo-title-input"]').fill('Annual Conference Registration - Tech Corp');
    await page.locator('[data-testid="seo-description-input"]').fill('Register for our annual technology conference. Join industry leaders and innovators.');

    await page.locator('[data-testid="confirm-publish-button"]').click();

    // Step 9: Share form
    await expect(page.locator('[data-testid="publish-success-modal"]')).toBeVisible();

    const formUrl = await page.locator('[data-testid="form-url"]').textContent();
    expect(formUrl).toContain('conference-registration-2024');

    // Test sharing options
    await page.locator('[data-testid="copy-link-button"]').click();
    await expect(page.locator('[data-testid="link-copied-message"]')).toBeVisible();

    await page.locator('[data-testid="share-email-button"]').click();
    await expect(page.locator('[data-testid="email-share-modal"]')).toBeVisible();

    await page.locator('[data-testid="share-emails-input"]').fill('team@company.com, marketing@company.com');
    await page.locator('[data-testid="share-message-input"]').fill('Please share this registration form with your networks.');
    await page.locator('[data-testid="send-share-emails-button"]').click();

    await expect(page.locator('[data-testid="emails-sent-message"]')).toBeVisible();

    // Step 10: View form analytics setup
    await page.locator('[data-testid="view-analytics-button"]').click();

    await expect(page).toHaveURL('**/analytics');
    await expect(page.locator('[data-testid="submissions-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="form-selector"]')).toContainText('Annual Conference Registration');
  });

  test('should handle form duplication and templating', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.locator('[data-testid="email-input"]').fill('creator@example.com');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();

    // Navigate to existing form
    await page.goto('/forms');
    await page.locator('[data-testid="form-item"]').first().click();

    // Duplicate form
    await page.locator('[data-testid="form-actions-menu"]').click();
    await page.locator('[data-testid="duplicate-form-action"]').click();

    await expect(page.locator('[data-testid="duplicate-modal"]')).toBeVisible();
    await page.locator('[data-testid="new-form-name-input"]').fill('Conference Registration 2025');
    await page.locator('[data-testid="duplicate-settings"]').check();
    await page.locator('[data-testid="duplicate-styling"]').check();
    await page.locator('[data-testid="confirm-duplicate-button"]').click();

    // Verify duplication
    await expect(page).toHaveURL('**/forms/builder');
    await expect(page.locator('[data-testid="form-name-input"]')).toHaveValue('Conference Registration 2025');

    // Save as template
    await page.locator('[data-testid="form-actions-menu"]').click();
    await page.locator('[data-testid="save-as-template-action"]').click();

    await page.locator('[data-testid="template-name-input"]').fill('Conference Registration Template');
    await page.locator('[data-testid="template-description-input"]').fill('Template for annual conference registrations');
    await page.locator('[data-testid="template-category-select"]').selectOption('events');
    await page.locator('[data-testid="make-public-template"]').check();
    await page.locator('[data-testid="save-template-button"]').click();

    await expect(page.locator('[data-testid="template-saved-message"]')).toBeVisible();
  });
});
```

### 3. Collaboration and Team Workflow Journey

```typescript
// tests/e2e/journeys/collaboration-workflow.e2e.ts
import { test, expect } from '@playwright/test';

test.describe('Collaboration and Team Workflow Journey', () => {
  test('should handle multi-user form collaboration', async ({ browser }) => {
    // Create multiple browser contexts for different users
    const adminContext = await browser.newContext();
    const editorContext = await browser.newContext();
    const viewerContext = await browser.newContext();

    const adminPage = await adminContext.newPage();
    const editorPage = await editorContext.newPage();
    const viewerPage = await viewerContext.newPage();

    // Admin login and form creation
    await adminPage.goto('/login');
    await adminPage.locator('[data-testid="email-input"]').fill('admin@company.com');
    await adminPage.locator('[data-testid="password-input"]').fill('password123');
    await adminPage.locator('[data-testid="login-button"]').click();

    await adminPage.locator('[data-testid="create-form-button"]').click();
    await adminPage.locator('[data-testid="form-name-input"]').fill('Team Collaboration Form');

    // Add initial field
    await adminPage.locator('[data-testid="add-field-button"]').click();
    await adminPage.locator('[data-testid="field-type-text"]').click();
    await adminPage.locator('[data-testid="field-name-input"]').fill('project_name');
    await adminPage.locator('[data-testid="field-label-input"]').fill('Project Name');
    await adminPage.locator('[data-testid="save-field-button"]').click();

    // Share form with team
    await adminPage.locator('[data-testid="collaborate-button"]').click();

    await expect(adminPage.locator('[data-testid="collaboration-modal"]')).toBeVisible();

    // Add editor
    await adminPage.locator('[data-testid="invite-email-input"]').fill('editor@company.com');
    await adminPage.locator('[data-testid="permission-level-select"]').selectOption('edit');
    await adminPage.locator('[data-testid="send-invite-button"]').click();

    // Add viewer
    await adminPage.locator('[data-testid="invite-email-input"]').fill('viewer@company.com');
    await adminPage.locator('[data-testid="permission-level-select"]').selectOption('view');
    await adminPage.locator('[data-testid="send-invite-button"]').click();

    await expect(adminPage.locator('[data-testid="collaborator-item"]')).toHaveCount(2);
    await adminPage.locator('[data-testid="close-collaboration-modal"]').click();

    // Editor joins collaboration
    await editorPage.goto('/login');
    await editorPage.locator('[data-testid="email-input"]').fill('editor@company.com');
    await editorPage.locator('[data-testid="password-input"]').fill('password123');
    await editorPage.locator('[data-testid="login-button"]').click();

    // Editor sees collaboration invitation
    await expect(editorPage.locator('[data-testid="collaboration-notification"]')).toBeVisible();
    await editorPage.locator('[data-testid="accept-collaboration-button"]').click();

    // Editor navigates to shared form
    const formUrl = await adminPage.url();
    await editorPage.goto(formUrl);

    // Verify editor can see admin's presence
    await expect(editorPage.locator('[data-testid="active-collaborators"]')).toContainText('admin@company.com');

    // Editor adds a field
    await editorPage.locator('[data-testid="add-field-button"]').click();
    await editorPage.locator('[data-testid="field-type-email"]').click();
    await editorPage.locator('[data-testid="field-name-input"]').fill('contact_email');
    await editorPage.locator('[data-testid="field-label-input"]').fill('Contact Email');
    await editorPage.locator('[data-testid="save-field-button"]').click();

    // Admin should see editor's changes in real-time
    await expect(adminPage.locator('[data-field-name="contact_email"]')).toBeVisible();
    await expect(adminPage.locator('[data-testid="active-collaborators"]')).toContainText('editor@company.com');

    // Test comment system
    await editorPage.locator('[data-field-name="project_name"]').click();
    await editorPage.locator('[data-testid="add-comment-button"]').click();
    await editorPage.locator('[data-testid="comment-input"]').fill('Should we make this field required?');
    await editorPage.locator('[data-testid="post-comment-button"]').click();

    // Admin sees comment
    await expect(adminPage.locator('[data-testid="comment-indicator"]')).toBeVisible();
    await adminPage.locator('[data-testid="comment-indicator"]').click();
    await expect(adminPage.locator('[data-testid="comment-text"]')).toContainText('Should we make this field required?');

    // Admin replies to comment
    await adminPage.locator('[data-testid="reply-input"]').fill('Good idea! Let me update that.');
    await adminPage.locator('[data-testid="post-reply-button"]').click();

    // Admin makes the suggested change
    await adminPage.locator('[data-field-name="project_name"]').click();
    await adminPage.locator('[data-testid="field-required-checkbox"]').check();
    await adminPage.locator('[data-testid="save-field-button"]').click();

    // Resolve comment
    await adminPage.locator('[data-testid="resolve-comment-button"]').click();

    // Editor sees resolved comment
    await expect(editorPage.locator('[data-testid="comment-resolved"]')).toBeVisible();

    // Viewer joins and has read-only access
    await viewerPage.goto('/login');
    await viewerPage.locator('[data-testid="email-input"]').fill('viewer@company.com');
    await viewerPage.locator('[data-testid="password-input"]').fill('password123');
    await viewerPage.locator('[data-testid="login-button"]').click();

    await viewerPage.goto(formUrl);

    // Viewer can see form but not edit
    await expect(viewerPage.locator('[data-testid="read-only-banner"]')).toBeVisible();
    await expect(viewerPage.locator('[data-testid="add-field-button"]')).not.toBeVisible();

    // Viewer can add comments
    await viewerPage.locator('[data-field-name="contact_email"]').click();
    await viewerPage.locator('[data-testid="add-comment-button"]').click();
    await viewerPage.locator('[data-testid="comment-input"]').fill('This looks great! Ready to publish?');
    await viewerPage.locator('[data-testid="post-comment-button"]').click();

    // Test version history
    await adminPage.locator('[data-testid="version-history-button"]').click();

    const versionHistory = adminPage.locator('[data-testid="version-history-item"]');
    await expect(versionHistory).toHaveCount(3); // Initial creation + 2 field additions

    await expect(versionHistory.nth(0)).toContainText('Added field "contact_email"');
    await expect(versionHistory.nth(0)).toContainText('editor@company.com');

    await expect(versionHistory.nth(1)).toContainText('Made field "project_name" required');
    await expect(versionHistory.nth(1)).toContainText('admin@company.com');

    // Test conflict resolution
    // Admin and editor both try to edit the same field simultaneously
    await adminPage.locator('[data-field-name="contact_email"]').click();
    await editorPage.locator('[data-field-name="contact_email"]').click();

    await adminPage.locator('[data-testid="field-label-input"]').fill('Primary Email Address');
    await editorPage.locator('[data-testid="field-label-input"]').fill('Business Email');

    await adminPage.locator('[data-testid="save-field-button"]').click();
    await editorPage.locator('[data-testid="save-field-button"]').click();

    // Editor should see conflict resolution dialog
    await expect(editorPage.locator('[data-testid="conflict-resolution-modal"]')).toBeVisible();
    await expect(editorPage.locator('[data-testid="their-version"]')).toContainText('Primary Email Address');
    await expect(editorPage.locator('[data-testid="my-version"]')).toContainText('Business Email');

    await editorPage.locator('[data-testid="choose-their-version"]').click();

    // Both users should now see the admin's version
    await expect(adminPage.locator('[data-field-name="contact_email"] [data-testid="field-label"]')).toContainText('Primary Email Address');
    await expect(editorPage.locator('[data-field-name="contact_email"] [data-testid="field-label"]')).toContainText('Primary Email Address');

    // Cleanup
    await adminContext.close();
    await editorContext.close();
    await viewerContext.close();
  });

  test('should handle team workspace management', async ({ page }) => {
    // Login as organization admin
    await page.goto('/login');
    await page.locator('[data-testid="email-input"]').fill('orgadmin@company.com');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();

    // Navigate to team management
    await page.locator('[data-testid="user-menu"]').click();
    await page.locator('[data-testid="team-settings-link"]').click();

    await expect(page).toHaveURL('/team');

    // View current team members
    await expect(page.locator('[data-testid="team-member-item"]')).toHaveCount(3);

    // Invite new team member
    await page.locator('[data-testid="invite-member-button"]').click();

    await page.locator('[data-testid="invite-email-input"]').fill('newmember@company.com');
    await page.locator('[data-testid="invite-first-name-input"]').fill('New');
    await page.locator('[data-testid="invite-last-name-input"]').fill('Member');
    await page.locator('[data-testid="invite-role-select"]').selectOption('editor');
    await page.locator('[data-testid="invite-teams-select"]').selectOption(['marketing', 'design']);
    await page.locator('[data-testid="send-invitation-button"]').click();

    await expect(page.locator('[data-testid="invitation-sent-message"]')).toBeVisible();

    // Manage team permissions
    await page.locator('[data-testid="team-member-item"]').first().locator('[data-testid="member-actions"]').click();
    await page.locator('[data-testid="edit-permissions-action"]').click();

    await expect(page.locator('[data-testid="permissions-modal"]')).toBeVisible();

    // Update permissions
    await page.locator('[data-testid="permission-create-forms"]').check();
    await page.locator('[data-testid="permission-delete-forms"]').uncheck();
    await page.locator('[data-testid="permission-view-analytics"]').check();
    await page.locator('[data-testid="save-permissions-button"]').click();

    // Create team workspace
    await page.locator('[data-testid="workspaces-tab"]').click();
    await page.locator('[data-testid="create-workspace-button"]').click();

    await page.locator('[data-testid="workspace-name-input"]').fill('Marketing Campaigns');
    await page.locator('[data-testid="workspace-description-input"]').fill('Forms for marketing campaigns and lead generation');
    await page.locator('[data-testid="workspace-members-select"]').selectOption(['marketing-team', 'design-team']);
    await page.locator('[data-testid="create-workspace-button"]').click();

    await expect(page.locator('[data-testid="workspace-created-message"]')).toBeVisible();

    // Configure workspace settings
    await page.locator('[data-testid="workspace-item"]').first().click();

    await expect(page).toHaveURL('**/workspaces/marketing-campaigns');

    await page.locator('[data-testid="workspace-settings-button"]').click();

    // Set up workspace branding
    await page.locator('[data-testid="workspace-logo-upload"]').setInputFiles('./tests/fixtures/marketing-logo.png');
    await page.locator('[data-testid="workspace-primary-color"]').fill('#e53e3e');
    await page.locator('[data-testid="workspace-font-family"]').selectOption('Montserrat');

    // Configure default form settings
    await page.locator('[data-testid="default-settings-tab"]').click();
    await page.locator('[data-testid="default-notification-email"]').fill('marketing@company.com');
    await page.locator('[data-testid="default-success-message"]').fill('Thank you for your interest in our marketing campaigns!');

    await page.locator('[data-testid="save-workspace-settings"]').click();

    // Verify workspace is configured
    await expect(page.locator('[data-testid="workspace-logo"]')).toBeVisible();
    await expect(page.locator('[data-testid="workspace-forms-list"]')).toBeVisible();
  });
});
```

### 4. Form Submission and Data Collection Journey

```typescript
// tests/e2e/journeys/form-submission-data-collection.e2e.ts
import { test, expect } from '@playwright/test';

test.describe('Form Submission and Data Collection Journey', () => {
  test('should handle complete submission workflow with file uploads', async ({ page }) => {
    // Start as anonymous user visiting public form
    await page.goto('/f/job-application-form');

    // Step 1: Form discovery and initial view
    await expect(page.locator('[data-testid="form-title"]')).toContainText('Job Application');
    await expect(page.locator('[data-testid="form-description"]')).toContainText('software engineer position');

    // Check form progress indicator
    await expect(page.locator('[data-testid="form-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="progress-step-1"]')).toHaveClass(/active/);

    // Step 2: Fill personal information (Page 1)
    await page.locator('[name="first_name"]').fill('Jane');
    await page.locator('[name="last_name"]').fill('Smith');
    await page.locator('[name="email"]').fill('jane.smith@email.com');
    await page.locator('[name="phone"]').fill('+1-555-123-4567');

    // Test email validation
    await page.locator('[name="email"]').fill('invalid-email');
    await page.locator('[name="first_name"]').focus(); // Trigger validation
    await expect(page.locator('[data-testid="email-error"]')).toContainText('valid email');

    await page.locator('[name="email"]').fill('jane.smith@email.com');
    await expect(page.locator('[data-testid="email-error"]')).not.toBeVisible();

    // Continue to next page
    await page.locator('[data-testid="next-page-button"]').click();
    await expect(page.locator('[data-testid="progress-step-2"]')).toHaveClass(/active/);

    // Step 3: Professional information (Page 2)
    await page.locator('[name="current_position"]').fill('Senior Frontend Developer');
    await page.locator('[name="current_company"]').fill('Tech Innovations Inc');
    await page.locator('[name="years_experience"]').selectOption('5-7');

    // Skills multi-select
    await page.locator('[data-testid="skills-dropdown"]').click();
    await page.locator('[data-testid="skill-javascript"]').check();
    await page.locator('[data-testid="skill-react"]').check();
    await page.locator('[data-testid="skill-typescript"]').check();
    await page.locator('[data-testid="skill-nodejs"]').check();
    await page.locator('[data-testid="skills-dropdown"]').click(); // Close dropdown

    await page.locator('[data-testid="next-page-button"]').click();
    await expect(page.locator('[data-testid="progress-step-3"]')).toHaveClass(/active/);

    // Step 4: File uploads (Page 3)
    await page.locator('[data-testid="resume-upload"]').setInputFiles('./tests/fixtures/resume.pdf');
    await expect(page.locator('[data-testid="resume-file-name"]')).toContainText('resume.pdf');

    await page.locator('[data-testid="cover-letter-upload"]').setInputFiles('./tests/fixtures/cover-letter.pdf');
    await expect(page.locator('[data-testid="cover-letter-file-name"]')).toContainText('cover-letter.pdf');

    // Optional portfolio upload
    await page.locator('[data-testid="portfolio-upload"]').setInputFiles('./tests/fixtures/portfolio.zip');
    await expect(page.locator('[data-testid="portfolio-file-name"]')).toContainText('portfolio.zip');

    // Test file size validation
    const largeFile = './tests/fixtures/large-file.pdf'; // > 10MB
    await page.locator('[data-testid="additional-docs-upload"]').setInputFiles(largeFile);
    await expect(page.locator('[data-testid="file-size-error"]')).toContainText('exceeds maximum size');

    await page.locator('[data-testid="next-page-button"]').click();
    await expect(page.locator('[data-testid="progress-step-4"]')).toHaveClass(/active/);

    // Step 5: Additional questions (Page 4)
    await page.locator('[name="availability_start"]').fill('2024-03-01');
    await page.locator('[name="salary_expectation"]').fill('95000');
    await page.locator('[name="remote_work_preference"]').selectOption('hybrid');

    // Long text field
    await page.locator('[name="why_interested"]').fill(`
      I am excited about this opportunity because your company's mission aligns perfectly with my career goals.
      I have been following your product development and am impressed by the innovative solutions you've created.
      My experience in React and TypeScript would allow me to contribute immediately to your frontend team.
    `.trim());

    // Character count validation
    const charCount = await page.locator('[data-testid="char-count-why-interested"]').textContent();
    expect(parseInt(charCount!)).toBeGreaterThan(200);

    await page.locator('[data-testid="next-page-button"]').click();
    await expect(page.locator('[data-testid="progress-step-5"]')).toHaveClass(/active/);

    // Step 6: Review and submit (Page 5)
    await expect(page.locator('[data-testid="review-page-title"]')).toContainText('Review Your Application');

    // Verify all entered data is displayed
    await expect(page.locator('[data-testid="review-first-name"]')).toContainText('Jane');
    await expect(page.locator('[data-testid="review-last-name"]')).toContainText('Smith');
    await expect(page.locator('[data-testid="review-email"]')).toContainText('jane.smith@email.com');
    await expect(page.locator('[data-testid="review-current-position"]')).toContainText('Senior Frontend Developer');
    await expect(page.locator('[data-testid="review-skills"]')).toContainText('JavaScript, React, TypeScript, Node.js');
    await expect(page.locator('[data-testid="review-resume"]')).toContainText('resume.pdf');

    // Edit option
    await page.locator('[data-testid="edit-personal-info"]').click();
    await expect(page.locator('[data-testid="progress-step-1"]')).toHaveClass(/active/);

    // Make a change
    await page.locator('[name="phone"]').fill('+1-555-987-6543');

    // Navigate back to review
    await page.locator('[data-testid="next-page-button"]').click(); // To page 2
    await page.locator('[data-testid="next-page-button"]').click(); // To page 3
    await page.locator('[data-testid="next-page-button"]').click(); // To page 4
    await page.locator('[data-testid="next-page-button"]').click(); // To review

    // Verify change is reflected
    await expect(page.locator('[data-testid="review-phone"]')).toContainText('+1-555-987-6543');

    // Agreement and CAPTCHA
    await page.locator('[data-testid="privacy-agreement"]').check();
    await page.locator('[data-testid="terms-agreement"]').check();

    // Solve CAPTCHA (in test environment, this might be auto-solved)
    await page.locator('[data-testid="captcha-checkbox"]').check();

    // Step 7: Submit application
    await page.locator('[data-testid="submit-application-button"]').click();

    // Loading state
    await expect(page.locator('[data-testid="submitting-indicator"]')).toBeVisible();

    // Success page
    await expect(page.locator('[data-testid="submission-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Thank you for your application');

    const confirmationNumber = await page.locator('[data-testid="confirmation-number"]').textContent();
    expect(confirmationNumber).toMatch(/^APP-\d{8}-[A-Z0-9]{4}$/);

    // Download submission receipt
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-testid="download-receipt-button"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('application-receipt.pdf');

    // Social sharing
    await page.locator('[data-testid="share-on-linkedin"]').click();
    // Verify LinkedIn share URL (would open in new tab)

    // Email confirmation check
    await expect(page.locator('[data-testid="email-confirmation-notice"]')).toContainText('jane.smith@email.com');
  });

  test('should handle form with conditional logic and dynamic fields', async ({ page }) => {
    await page.goto('/f/customer-feedback-advanced');

    // Initial rating selection triggers different question paths
    await page.locator('[name="overall_rating"]').selectOption('1'); // Poor rating

    // Conditional fields for negative feedback should appear
    await expect(page.locator('[name="improvement_areas"]')).toBeVisible();
    await expect(page.locator('[name="specific_issues"]')).toBeVisible();
    await expect(page.locator('[name="contact_for_follow_up"]')).toBeVisible();

    // Fill negative feedback path
    await page.locator('[name="improvement_areas"]').selectOption(['customer_service', 'product_quality']);
    await page.locator('[name="specific_issues"]').fill('The product arrived damaged and customer service was unresponsive.');
    await page.locator('[name="contact_for_follow_up"]').check();

    // Contact information should now be required
    await expect(page.locator('[name="contact_phone"]')).toBeVisible();
    await page.locator('[name="contact_phone"]').fill('+1-555-123-4567');
    await page.locator('[name="preferred_contact_time"]').selectOption('evening');

    // Change rating to positive
    await page.locator('[name="overall_rating"]').selectOption('5'); // Excellent rating

    // Negative feedback fields should hide, positive feedback fields should show
    await expect(page.locator('[name="improvement_areas"]')).not.toBeVisible();
    await expect(page.locator('[name="what_did_well"]')).toBeVisible();
    await expect(page.locator('[name="recommend_to_others"]')).toBeVisible();

    // Fill positive feedback path
    await page.locator('[name="what_did_well"]').fill('Excellent product quality and fast shipping!');
    await page.locator('[name="recommend_to_others"]').selectOption('definitely');
    await page.locator('[name="testimonial_permission"]').check();

    // Product category affects available options
    await page.locator('[name="product_category"]').selectOption('electronics');

    // Electronics-specific questions should appear
    await expect(page.locator('[name="product_model"]')).toBeVisible();
    await page.locator('[name="product_model"]').selectOption('smartphone-pro-max');

    // Warranty question appears for electronics
    await expect(page.locator('[name="warranty_satisfaction"]')).toBeVisible();
    await page.locator('[name="warranty_satisfaction"]').selectOption('very_satisfied');

    // Dynamic field addition based on user input
    await page.locator('[name="additional_products_used"]').check();

    // Additional product fields should appear dynamically
    await expect(page.locator('[name="additional_product_1"]')).toBeVisible();
    await page.locator('[name="additional_product_1"]').fill('Wireless headphones');

    await page.locator('[data-testid="add-another-product"]').click();
    await expect(page.locator('[name="additional_product_2"]')).toBeVisible();
    await page.locator('[name="additional_product_2"]').fill('Charging cable');

    // Submit form
    await page.locator('[data-testid="submit-feedback-button"]').click();

    // Confirmation based on feedback type
    await expect(page.locator('[data-testid="positive-feedback-thanks"]')).toBeVisible();
    await expect(page.locator('[data-testid="testimonial-follow-up"]')).toContainText('marketing team may contact you');
  });

  test('should handle form with payment integration', async ({ page }) => {
    await page.goto('/f/conference-registration-paid');

    // Basic registration info
    await page.locator('[name="attendee_name"]').fill('John Smith');
    await page.locator('[name="attendee_email"]').fill('john@company.com');
    await page.locator('[name="company_name"]').fill('Tech Corp');

    // Ticket selection affects pricing
    await page.locator('[name="ticket_type"]').selectOption('vip');
    await expect(page.locator('[data-testid="ticket-price"]')).toContainText('$299');

    // Add-ons with dynamic pricing
    await page.locator('[name="workshop_sessions"]').check();
    await page.locator('[data-testid="workshop-golang"]').check();
    await page.locator('[data-testid="workshop-kubernetes"]').check();

    await page.locator('[name="meal_plan"]').selectOption('all_meals');
    await page.locator('[name="accommodation"]').check();
    await page.locator('[name="accommodation_nights"]').selectOption('2');

    // Price calculation updates dynamically
    await expect(page.locator('[data-testid="subtotal"]')).toContainText('$449'); // VIP + workshops + meals + accommodation
    await expect(page.locator('[data-testid="tax-amount"]')).toContainText('$35.92');
    await expect(page.locator('[data-testid="total-amount"]')).toContainText('$484.92');

    // Discount code
    await page.locator('[data-testid="apply-discount-link"]').click();
    await page.locator('[name="discount_code"]').fill('EARLYBIRD20');
    await page.locator('[data-testid="apply-discount-button"]').click();

    await expect(page.locator('[data-testid="discount-applied"]')).toContainText('20% Early Bird Discount');
    await expect(page.locator('[data-testid="total-amount"]')).toContainText('$423.94');

    // Proceed to payment
    await page.locator('[data-testid="proceed-to-payment-button"]').click();

    // Payment method selection
    await expect(page.locator('[data-testid="payment-section"]')).toBeVisible();
    await page.locator('[name="payment_method"]').selectOption('credit_card');

    // Credit card form
    await page.locator('[name="card_number"]').fill('4242424242424242'); // Test card
    await page.locator('[name="expiry_month"]').selectOption('12');
    await page.locator('[name="expiry_year"]').selectOption('2025');
    await page.locator('[name="cvv"]').fill('123');

    await page.locator('[name="billing_name"]').fill('John Smith');
    await page.locator('[name="billing_address"]').fill('123 Main St');
    await page.locator('[name="billing_city"]').fill('San Francisco');
    await page.locator('[name="billing_state"]').selectOption('CA');
    await page.locator('[name="billing_zip"]').fill('94105');

    // Terms and payment processing
    await page.locator('[name="payment_terms"]').check();
    await page.locator('[data-testid="complete-payment-button"]').click();

    // Payment processing
    await expect(page.locator('[data-testid="payment-processing"]')).toBeVisible();

    // Payment success
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="transaction-id"]')).toMatch(/^TXN-\d{10}$/);

    // Download receipt and ticket
    const receiptPromise = page.waitForEvent('download');
    await page.locator('[data-testid="download-receipt-button"]').click();
    const receipt = await receiptPromise;
    expect(receipt.suggestedFilename()).toBe('conference-registration-receipt.pdf');

    const ticketPromise = page.waitForEvent('download');
    await page.locator('[data-testid="download-ticket-button"]').click();
    const ticket = await ticketPromise;
    expect(ticket.suggestedFilename()).toBe('conference-ticket.pdf');

    // Calendar integration
    await page.locator('[data-testid="add-to-calendar-button"]').click();
    await page.locator('[data-testid="add-to-google-calendar"]').click();
    // Verify calendar URL parameters
  });
});
```

### 5. Analytics and Reporting Journey

```typescript
// tests/e2e/journeys/analytics-reporting.e2e.ts
import { test, expect } from '@playwright/test';

test.describe('Analytics and Reporting Journey', () => {
  test('should provide comprehensive analytics dashboard experience', async ({ page }) => {
    // Login as form owner with analytics access
    await page.goto('/login');
    await page.locator('[data-testid="email-input"]').fill('analytics@company.com');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();

    // Navigate to analytics dashboard
    await page.goto('/analytics');

    // Step 1: Overview dashboard
    await expect(page.locator('[data-testid="analytics-overview"]')).toBeVisible();

    // Key metrics widgets
    await expect(page.locator('[data-testid="total-submissions-metric"]')).toContainText(/\d+/);
    await expect(page.locator('[data-testid="conversion-rate-metric"]')).toContainText(/%/);
    await expect(page.locator('[data-testid="average-completion-time"]')).toContainText(/\d+m/);
    await expect(page.locator('[data-testid="bounce-rate-metric"]')).toContainText(/%/);

    // Time period selector
    await page.locator('[data-testid="time-period-selector"]').click();
    await page.locator('[data-testid="time-period-last-30-days"]').click();

    // Metrics should update
    await expect(page.locator('[data-testid="metrics-updated-indicator"]')).toBeVisible();

    // Step 2: Submissions over time chart
    await expect(page.locator('[data-testid="submissions-chart"]')).toBeVisible();

    // Chart interactions
    await page.locator('[data-testid="chart-view-daily"]').click();
    await expect(page.locator('[data-testid="chart-granularity-indicator"]')).toContainText('Daily');

    await page.locator('[data-testid="chart-view-weekly"]').click();
    await expect(page.locator('[data-testid="chart-granularity-indicator"]')).toContainText('Weekly');

    // Hover over chart points for details
    await page.locator('[data-testid="submissions-chart"] [data-testid="chart-point"]').first().hover();
    await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
    await expect(page.locator('[data-testid="chart-tooltip"]')).toContainText('submissions');

    // Step 3: Form performance comparison
    await page.locator('[data-testid="form-performance-tab"]').click();

    await expect(page.locator('[data-testid="form-performance-table"]')).toBeVisible();

    // Sort by conversion rate
    await page.locator('[data-testid="sort-by-conversion-rate"]').click();

    const firstRow = page.locator('[data-testid="form-row"]').first();
    await expect(firstRow.locator('[data-testid="form-name"]')).toBeVisible();
    await expect(firstRow.locator('[data-testid="submission-count"]')).toContainText(/\d+/);
    await expect(firstRow.locator('[data-testid="conversion-rate"]')).toContainText(/%/);

    // Drill down into specific form
    await firstRow.locator('[data-testid="view-details-button"]').click();

    await expect(page).toHaveURL(/\/analytics\/forms\/[^\/]+/);

    // Step 4: Individual form analytics
    await expect(page.locator('[data-testid="form-analytics-header"]')).toBeVisible();

    // Form funnel analysis
    await expect(page.locator('[data-testid="funnel-chart"]')).toBeVisible();

    const funnelSteps = page.locator('[data-testid="funnel-step"]');
    await expect(funnelSteps).toHaveCount(4); // Started, Page 1, Page 2, Completed

    await expect(funnelSteps.nth(0)).toContainText('Started');
    await expect(funnelSteps.nth(3)).toContainText('Completed');

    // Click on funnel step for details
    await funnelSteps.nth(1).click();
    await expect(page.locator('[data-testid="step-details-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="drop-off-reasons"]')).toBeVisible();
    await page.locator('[data-testid="close-modal"]').click();

    // Field-level analytics
    await page.locator('[data-testid="field-analytics-tab"]').click();

    const fieldAnalytics = page.locator('[data-testid="field-analytics-item"]');
    await expect(fieldAnalytics.first()).toBeVisible();

    // Check field interaction rates
    await expect(fieldAnalytics.first().locator('[data-testid="field-name"]')).toBeVisible();
    await expect(fieldAnalytics.first().locator('[data-testid="completion-rate"]')).toContainText(/%/);
    await expect(fieldAnalytics.first().locator('[data-testid="avg-time-spent"]')).toContainText(/\d+s/);

    // Error analysis
    await page.locator('[data-testid="error-analytics-tab"]').click();

    await expect(page.locator('[data-testid="error-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="most-common-errors"]')).toBeVisible();

    const errorList = page.locator('[data-testid="error-item"]');
    if (await errorList.count() > 0) {
      await expect(errorList.first().locator('[data-testid="error-message"]')).toBeVisible();
      await expect(errorList.first().locator('[data-testid="error-frequency"]')).toContainText(/\d+/);
    }

    // Step 5: Device and browser analytics
    await page.locator('[data-testid="device-analytics-tab"]').click();

    // Device breakdown chart
    await expect(page.locator('[data-testid="device-breakdown-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="device-legend"]')).toContainText('Desktop');
    await expect(page.locator('[data-testid="device-legend"]')).toContainText('Mobile');
    await expect(page.locator('[data-testid="device-legend"]')).toContainText('Tablet');

    // Browser breakdown
    await expect(page.locator('[data-testid="browser-breakdown-chart"]')).toBeVisible();

    // Performance by device
    await expect(page.locator('[data-testid="performance-by-device-table"]')).toBeVisible();

    // Step 6: Geographic analytics
    await page.locator('[data-testid="geographic-analytics-tab"]').click();

    await expect(page.locator('[data-testid="world-map"]')).toBeVisible();
    await expect(page.locator('[data-testid="country-breakdown-table"]')).toBeVisible();

    // Click on country for details
    await page.locator('[data-testid="country-row"]').first().click();
    await expect(page.locator('[data-testid="country-details-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="city-breakdown"]')).toBeVisible();
    await page.locator('[data-testid="close-modal"]').click();

    // Step 7: Export and reporting
    await page.locator('[data-testid="export-data-button"]').click();

    await expect(page.locator('[data-testid="export-modal"]')).toBeVisible();

    // Configure export
    await page.locator('[data-testid="export-format-csv"]').check();
    await page.locator('[data-testid="export-date-range"]').fill('2024-01-01 to 2024-01-31');
    await page.locator('[data-testid="export-include-submissions"]').check();
    await page.locator('[data-testid="export-include-analytics"]').check();

    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-testid="start-export-button"]').click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/analytics-export.*\.csv$/);

    // Schedule automated report
    await page.locator('[data-testid="schedule-report-button"]').click();

    await page.locator('[data-testid="report-frequency-weekly"]').check();
    await page.locator('[data-testid="report-day-monday"]').check();
    await page.locator('[data-testid="report-recipients"]').fill('team@company.com, manager@company.com');
    await page.locator('[data-testid="schedule-report-confirm"]').click();

    await expect(page.locator('[data-testid="report-scheduled-confirmation"]')).toBeVisible();

    // Step 8: Custom dashboard creation
    await page.goto('/analytics/dashboard/custom');

    await page.locator('[data-testid="create-custom-dashboard"]').click();
    await page.locator('[data-testid="dashboard-name"]').fill('Executive Summary');

    // Add widgets
    await page.locator('[data-testid="add-widget-button"]').click();
    await page.locator('[data-testid="widget-type-metric"]').click();
    await page.locator('[data-testid="metric-total-submissions"]').click();
    await page.locator('[data-testid="add-widget-confirm"]').click();

    await page.locator('[data-testid="add-widget-button"]').click();
    await page.locator('[data-testid="widget-type-chart"]').click();
    await page.locator('[data-testid="chart-submissions-over-time"]').click();
    await page.locator('[data-testid="add-widget-confirm"]').click();

    // Arrange widgets
    await page.dragAndDrop(
      '[data-testid="widget-submissions-chart"]',
      '[data-testid="dashboard-grid-position-2"]'
    );

    // Save dashboard
    await page.locator('[data-testid="save-dashboard"]').click();
    await expect(page.locator('[data-testid="dashboard-saved-message"]')).toBeVisible();

    // Share dashboard
    await page.locator('[data-testid="share-dashboard-button"]').click();
    await page.locator('[data-testid="share-with-team"]').check();
    await page.locator('[data-testid="share-permissions-view"]').check();
    await page.locator('[data-testid="share-dashboard-confirm"]').click();

    await expect(page.locator('[data-testid="dashboard-shared-message"]')).toBeVisible();
  });

  test('should handle real-time analytics updates', async ({ page }) => {
    // Login and navigate to real-time dashboard
    await page.goto('/login');
    await page.locator('[data-testid="email-input"]').fill('analytics@company.com');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();

    await page.goto('/analytics/realtime');

    // Enable real-time mode
    await expect(page.locator('[data-testid="realtime-dashboard"]')).toBeVisible();
    await page.locator('[data-testid="enable-realtime-updates"]').check();

    await expect(page.locator('[data-testid="realtime-indicator"]')).toContainText('Live');

    // Current active users
    await expect(page.locator('[data-testid="active-users-count"]')).toContainText(/\d+/);

    // Real-time submission feed
    await expect(page.locator('[data-testid="realtime-submissions-feed"]')).toBeVisible();

    // Simulate new submission (in real scenario, this would be actual user activity)
    await page.evaluate(() => {
      // Trigger WebSocket event for new submission
      window.dispatchEvent(new CustomEvent('newSubmission', {
        detail: {
          formName: 'Contact Form',
          submittedAt: new Date().toISOString(),
          location: 'San Francisco, CA'
        }
      }));
    });

    // Verify real-time update
    await expect(page.locator('[data-testid="new-submission-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="submissions-count"]')).toHaveText(/\d+/);

    // Live form activity
    await expect(page.locator('[data-testid="live-form-activity"]')).toBeVisible();

    const activeFormsList = page.locator('[data-testid="active-form-item"]');
    if (await activeFormsList.count() > 0) {
      await expect(activeFormsList.first().locator('[data-testid="current-viewers"]')).toContainText(/\d+/);
      await expect(activeFormsList.first().locator('[data-testid="completion-rate"]')).toContainText(/%/);
    }

    // Geographic distribution of current activity
    await expect(page.locator('[data-testid="realtime-geo-map"]')).toBeVisible();

    // Traffic sources in real-time
    await expect(page.locator('[data-testid="realtime-traffic-sources"]')).toBeVisible();
    await expect(page.locator('[data-testid="direct-traffic-count"]')).toContainText(/\d+/);
    await expect(page.locator('[data-testid="social-traffic-count"]')).toContainText(/\d+/);
    await expect(page.locator('[data-testid="search-traffic-count"]')).toContainText(/\d+/);

    // Disable real-time updates
    await page.locator('[data-testid="enable-realtime-updates"]').uncheck();
    await expect(page.locator('[data-testid="realtime-indicator"]')).toContainText('Paused');
  });
});
```

## Cross-Platform and Accessibility Scenarios

### Mobile-First User Journeys

```typescript
// tests/e2e/journeys/mobile-user-experience.e2e.ts
import { test, expect, devices } from '@playwright/test';

test.describe('Mobile User Experience Journey', () => {
  test('should complete form submission on mobile device', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
      geolocation: { latitude: 37.7749, longitude: -122.4194 }, // San Francisco
      permissions: ['geolocation']
    });

    const page = await context.newPage();

    // Mobile form discovery through search
    await page.goto('https://google.com/search?q=tech+conference+registration+2024');

    // Click on form link from search results (simulated)
    await page.goto('/f/mobile-conference-registration');

    // Mobile-optimized form layout
    await expect(page.locator('[data-testid="mobile-form-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-progress-bar"]')).toBeVisible();

    // Touch-optimized input fields
    await page.locator('[name="name"]').tap();
    await page.locator('[name="name"]').fill('Mobile User');

    // Mobile keyboard handling
    await page.locator('[name="email"]').tap();
    await expect(page.locator('[data-testid="email-keyboard"]')).toBeVisible(); // Email keyboard
    await page.locator('[name="email"]').fill('mobile@example.com');

    // Phone number with country selector
    await page.locator('[data-testid="country-code-selector"]').tap();
    await page.locator('[data-testid="country-us"]').tap();
    await page.locator('[name="phone"]').fill('5551234567');

    // Location auto-fill using geolocation
    await page.locator('[data-testid="use-current-location"]').tap();
    await expect(page.locator('[name="city"]')).toHaveValue('San Francisco');
    await expect(page.locator('[name="state"]')).toHaveValue('CA');

    // Mobile-optimized date picker
    await page.locator('[name="birth_date"]').tap();
    await expect(page.locator('[data-testid="mobile-date-picker"]')).toBeVisible();
    await page.locator('[data-testid="date-year-1990"]').tap();
    await page.locator('[data-testid="date-month-june"]').tap();
    await page.locator('[data-testid="date-day-15"]').tap();
    await page.locator('[data-testid="date-picker-done"]').tap();

    // File upload on mobile
    await page.locator('[data-testid="mobile-file-upload"]').tap();
    await page.locator('[data-testid="camera-option"]').tap();
    // In real test, this would trigger camera; for testing, we simulate file selection
    await page.locator('[data-testid="photo-upload"]').setInputFiles('./tests/fixtures/mobile-photo.jpg');

    // Mobile swipe navigation
    await page.locator('[data-testid="next-page-swipe"]').swipe('left');
    await expect(page.locator('[data-testid="page-2"]')).toBeVisible();

    // Continue filling form on second page
    await page.locator('[name="preferences"]').selectOption('mobile_notifications');

    // Mobile-friendly multi-select
    await page.locator('[data-testid="interests-multiselect"]').tap();
    await page.locator('[data-testid="interest-technology"]').tap();
    await page.locator('[data-testid="interest-business"]').tap();
    await page.locator('[data-testid="multiselect-done"]').tap();

    // Swipe to final page
    await page.locator('[data-testid="next-page-swipe"]').swipe('left');

    // Review page with mobile layout
    await expect(page.locator('[data-testid="mobile-review-summary"]')).toBeVisible();

    // Mobile signature
    await page.locator('[data-testid="mobile-signature-pad"]').tap();
    // Simulate signature drawing
    await page.locator('[data-testid="signature-canvas"]').tap();
    await page.locator('[data-testid="signature-done"]').tap();

    // Submit with mobile-optimized button
    await page.locator('[data-testid="mobile-submit-button"]').tap();

    // Mobile success page
    await expect(page.locator('[data-testid="mobile-success-animation"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-share-buttons"]')).toBeVisible();

    // Share via mobile apps
    await page.locator('[data-testid="share-whatsapp"]').tap();
    // Verify WhatsApp share URL structure

    await context.close();
  });

  test('should handle progressive web app installation', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['Pixel 5']
    });

    const page = await context.newPage();

    await page.goto('/f/pwa-form');

    // PWA install prompt
    await expect(page.locator('[data-testid="pwa-install-banner"]')).toBeVisible();
    await page.locator('[data-testid="install-pwa-button"]').tap();

    // Simulate PWA installation
    await page.evaluate(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    await expect(page.locator('[data-testid="pwa-installed-message"]')).toBeVisible();

    // Offline functionality
    await context.setOffline(true);

    await page.reload();
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="offline-form-cache"]')).toBeVisible();

    // Fill form while offline
    await page.locator('[name="name"]').fill('Offline User');
    await page.locator('[name="email"]').fill('offline@example.com');

    await page.locator('[data-testid="submit-button"]').tap();
    await expect(page.locator('[data-testid="queued-for-sync"]')).toBeVisible();

    // Come back online
    await context.setOffline(false);
    await expect(page.locator('[data-testid="sync-in-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="sync-completed"]')).toBeVisible();

    await context.close();
  });
});
```

### Accessibility-Focused User Journeys

```typescript
// tests/e2e/journeys/accessibility-user-experience.e2e.ts
import { test, expect } from '@playwright/test';

test.describe('Accessibility User Experience Journey', () => {
  test('should support keyboard-only navigation', async ({ page }) => {
    await page.goto('/f/accessible-form');

    // Skip to content link
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="skip-to-content"]')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="main-content"]')).toBeFocused();

    // Form navigation with keyboard
    await page.keyboard.press('Tab');
    await expect(page.locator('[name="name"]')).toBeFocused();
    await page.keyboard.type('Keyboard User');

    await page.keyboard.press('Tab');
    await expect(page.locator('[name="email"]')).toBeFocused();
    await page.keyboard.type('keyboard@example.com');

    // Radio button navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('[name="preference"][value="option1"]')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[name="preference"][value="option2"]')).toBeFocused();
    await page.keyboard.press('Space');

    // Checkbox interaction
    await page.keyboard.press('Tab');
    await expect(page.locator('[name="newsletter"]')).toBeFocused();
    await page.keyboard.press('Space');

    // Select dropdown navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('[name="country"]')).toBeFocused();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // File upload accessibility
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="file-upload-button"]')).toBeFocused();
    await page.keyboard.press('Enter');
    // File dialog would open

    // Submit button
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="submit-button"]')).toBeFocused();
    await page.keyboard.press('Enter');

    // Success message focus management
    await expect(page.locator('[data-testid="success-message"]')).toBeFocused();
  });

  test('should provide screen reader announcements', async ({ page }) => {
    await page.goto('/f/screen-reader-form');

    // Form has proper heading structure
    await expect(page.locator('h1')).toHaveText('Contact Form');
    await expect(page.locator('h2')).toHaveText('Personal Information');

    // Fields have proper labels and descriptions
    const nameField = page.locator('[name="name"]');
    await expect(nameField).toHaveAttribute('aria-label', 'Full Name');
    await expect(nameField).toHaveAttribute('aria-required', 'true');
    await expect(nameField).toHaveAttribute('aria-describedby', 'name-help');

    // Error handling with announcements
    await page.locator('[data-testid="submit-button"]').click();

    const errorMessage = page.locator('[data-testid="name-error"]');
    await expect(errorMessage).toHaveAttribute('role', 'alert');
    await expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
    await expect(errorMessage).toBeVisible();

    // Dynamic content announcements
    await page.locator('[name="country"]').selectOption('usa');

    const stateField = page.locator('[name="state"]');
    await expect(stateField).toBeVisible();
    await expect(page.locator('[data-testid="state-field-announcement"]')).toHaveAttribute('aria-live', 'polite');

    // Progress announcements
    await page.locator('[name="name"]').fill('Screen Reader User');
    await page.locator('[name="email"]').fill('screenreader@example.com');
    await page.locator('[data-testid="next-page-button"]').click();

    await expect(page.locator('[data-testid="progress-announcement"]')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('[data-testid="progress-announcement"]')).toContainText('Page 2 of 3');
  });

  test('should support high contrast and reduced motion preferences', async ({ page }) => {
    // Test high contrast mode
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('/f/accessible-form');

    // Verify high contrast styles are applied
    await expect(page.locator('[data-testid="form-container"]')).toHaveCSS('border', /.*/);
    await expect(page.locator('[data-testid="submit-button"]')).toHaveCSS('border', /.*/);

    // Test reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();

    // Verify animations are disabled
    const animatedElement = page.locator('[data-testid="form-transition"]');
    await expect(animatedElement).toHaveCSS('animation-duration', '0s');
    await expect(animatedElement).toHaveCSS('transition-duration', '0s');

    // Test increased text size
    await page.addStyleTag({
      content: `
        * {
          font-size: 150% !important;
        }
      `
    });

    // Form should still be usable with larger text
    await expect(page.locator('[name="name"]')).toBeVisible();
    await expect(page.locator('[data-testid="submit-button"]')).toBeVisible();

    // Text should not overflow containers
    const formWidth = await page.locator('[data-testid="form-container"]').boundingBox();
    const buttonWidth = await page.locator('[data-testid="submit-button"]').boundingBox();

    expect(buttonWidth!.width).toBeLessThanOrEqual(formWidth!.width);
  });

  test('should support voice navigation commands', async ({ page }) => {
    await page.goto('/f/voice-accessible-form');

    // Simulate voice commands via data attributes
    await page.evaluate(() => {
      // Simulate voice command: "Click submit button"
      const submitButton = document.querySelector('[data-voice-command="submit"]');
      if (submitButton) {
        (submitButton as HTMLElement).focus();
        (submitButton as HTMLElement).click();
      }
    });

    // Voice navigation landmarks
    await page.evaluate(() => {
      // Simulate voice command: "Go to main content"
      const mainContent = document.querySelector('[role="main"]');
      if (mainContent) {
        (mainContent as HTMLElement).focus();
      }
    });

    await expect(page.locator('[role="main"]')).toBeFocused();

    // Voice form filling
    await page.evaluate(() => {
      // Simulate voice command: "Fill name field with John Smith"
      const nameField = document.querySelector('[name="name"]') as HTMLInputElement;
      if (nameField) {
        nameField.value = 'John Smith';
        nameField.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    await expect(page.locator('[name="name"]')).toHaveValue('John Smith');
  });
});
```

## Performance and Load Testing Scenarios

```typescript
// tests/e2e/journeys/performance-user-experience.e2e.ts
import { test, expect } from '@playwright/test';

test.describe('Performance User Experience Journey', () => {
  test('should maintain performance under typical load', async ({ page }) => {
    // Enable performance monitoring
    await page.coverage.startJSCoverage();
    await page.coverage.startCSSCoverage();

    const startTime = Date.now();

    await page.goto('/f/performance-test-form');

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // 3 second load time

    // Measure Core Web Vitals
    const coreWebVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals: any = {};

          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime;
            }
            if (entry.name === 'largest-contentful-paint') {
              vitals.lcp = entry.startTime;
            }
          });

          resolve(vitals);
        }).observe({ entryTypes: ['paint', 'largest-contentful-paint'] });

        setTimeout(() => resolve({}), 5000); // Timeout after 5 seconds
      });
    });

    // Verify performance thresholds
    if (coreWebVitals.fcp) {
      expect(coreWebVitals.fcp).toBeLessThan(1800); // FCP < 1.8s
    }
    if (coreWebVitals.lcp) {
      expect(coreWebVitals.lcp).toBeLessThan(2500); // LCP < 2.5s
    }

    // Test form interaction performance
    const interactionStart = Date.now();

    await page.locator('[name="large_text_field"]').fill('x'.repeat(1000));

    const interactionTime = Date.now() - interactionStart;
    expect(interactionTime).toBeLessThan(100); // Interaction should be responsive

    // Measure JavaScript and CSS usage
    const jsCoverage = await page.coverage.stopJSCoverage();
    const cssCoverage = await page.coverage.stopCSSCoverage();

    const totalJSBytes = jsCoverage.reduce((total, entry) => total + entry.text.length, 0);
    const usedJSBytes = jsCoverage.reduce((total, entry) => {
      return total + entry.ranges.reduce((used, range) => used + (range.end - range.start), 0);
    }, 0);

    const jsUsagePercent = (usedJSBytes / totalJSBytes) * 100;
    expect(jsUsagePercent).toBeGreaterThan(60); // At least 60% JS should be used

    // Memory usage check
    const metrics = await page.metrics();
    expect(metrics.JSHeapUsedSize).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
  });

  test('should handle slow network conditions gracefully', async ({ page, context }) => {
    // Simulate slow 3G network
    await context.route('**/*', route => {
      setTimeout(() => route.continue(), 500); // 500ms delay
    });

    await page.goto('/f/slow-network-form');

    // Loading indicators should be shown
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();

    // Progressive enhancement - basic form should work
    await expect(page.locator('[name="name"]')).toBeVisible();
    await expect(page.locator('[name="email"]')).toBeVisible();

    // Advanced features should load progressively
    await page.waitForTimeout(2000);
    await expect(page.locator('[data-testid="advanced-validation"]')).toBeVisible();

    // Form should still be submittable during slow load
    await page.locator('[name="name"]').fill('Slow Network User');
    await page.locator('[name="email"]').fill('slow@example.com');
    await page.locator('[data-testid="submit-button"]').click();

    // Submission should handle network delays
    await expect(page.locator('[data-testid="submitting-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('should optimize for large forms', async ({ page }) => {
    await page.goto('/f/large-form-performance');

    // Form with 100+ fields should still perform well
    const fieldCount = await page.locator('[data-testid="form-field"]').count();
    expect(fieldCount).toBeGreaterThan(100);

    // Virtualization should handle large field lists
    const visibleFields = await page.locator('[data-testid="form-field"]:visible').count();
    expect(visibleFields).toBeLessThan(fieldCount); // Not all fields rendered at once

    // Scroll performance
    const scrollStart = Date.now();

    await page.mouse.wheel(0, 2000); // Scroll down
    await page.waitForTimeout(100);

    const scrollTime = Date.now() - scrollStart;
    expect(scrollTime).toBeLessThan(200); // Smooth scrolling

    // Dynamic field loading
    await expect(page.locator('[data-testid="field-50"]')).toBeVisible();

    await page.mouse.wheel(0, 5000); // Scroll to bottom
    await expect(page.locator('[data-testid="field-100"]')).toBeVisible();

    // Auto-save performance with debouncing
    const autoSaveStart = Date.now();

    await page.locator('[name="field_1"]').fill('Performance test value');
    await page.waitForSelector('[data-testid="auto-saved-indicator"]');

    const autoSaveTime = Date.now() - autoSaveStart;
    expect(autoSaveTime).toBeLessThan(2000); // Auto-save within 2 seconds
  });
});
```

## Best Practices for User Journey Testing

### 1. Test Organization and Maintenance

- **Scenario-Based Structure**: Organize tests by complete user workflows
- **Page Object Inheritance**: Extend base page objects for journey-specific needs
- **Data Management**: Use realistic test data that reflects actual user patterns
- **Cross-Platform Testing**: Test critical journeys on multiple devices and browsers

### 2. User-Centric Focus

- **Real User Goals**: Test scenarios that match actual user intentions
- **Progressive Enhancement**: Verify functionality works with and without JavaScript
- **Error Recovery**: Test how users recover from errors and interruptions
- **Accessibility Integration**: Include accessibility testing in all user journeys

### 3. Performance Awareness

- **Realistic Network Conditions**: Test on various connection speeds
- **Core Web Vitals**: Monitor performance metrics during user interactions
- **Memory Management**: Verify applications don't leak memory during long sessions
- **Battery Usage**: Consider mobile battery impact for long forms

### 4. Maintenance Guidelines

- **Regular Updates**: Keep scenarios current with application changes
- **Data Refresh**: Update test data to reflect current user patterns
- **Performance Baselines**: Regularly review and update performance expectations
- **Cross-Browser Verification**: Test on browsers used by actual users

## Relationships
- **Parent Nodes:** [foundation/testing/index.md] - categorizes - User journey tests as part of overall testing strategy
- **Child Nodes:** None
- **Related Nodes:**
  - [foundation/testing/e2e-testing-strategy.md] - implements - User journeys using E2E testing framework
  - [foundation/testing/api-testing-patterns.md] - validates - API interactions within user journeys
  - [foundation/components/*/api.md] - exercises - Component APIs through complete user workflows

## Navigation Guidance
- **Access Context**: Reference when implementing E2E tests that represent complete user workflows
- **Common Next Steps**: Review specific E2E testing patterns or component API documentation
- **Related Tasks**: User acceptance testing, workflow validation, accessibility testing, performance testing
- **Update Patterns**: Update when new user workflows are introduced or existing workflows change

## Metadata
- **Created:** 2025-01-22
- **Last Updated:** 2025-01-22
- **Updated By:** Claude/TEST-001-2 Implementation

## Change History
- 2025-01-22: Initial user journey test scenarios document creation with comprehensive workflow testing examples