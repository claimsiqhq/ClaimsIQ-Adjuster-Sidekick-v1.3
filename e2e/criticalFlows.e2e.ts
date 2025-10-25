// E2E tests for critical user flows

describe('ClaimsIQ Critical Flows', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { camera: 'YES', photos: 'YES', location: 'inuse' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Authentication Flow', () => {
    it('should login successfully with valid credentials', async () => {
      // Wait for login screen
      await waitFor(element(by.id('login-email-input')))
        .toBeVisible()
        .withTimeout(5000);

      // Enter credentials
      await element(by.id('login-email-input')).typeText('test@claimsiq.ai');
      await element(by.id('login-password-input')).typeText('password123');

      // Tap login button
      await element(by.id('login-button')).tap();

      // Should navigate to home screen
      await waitFor(element(by.id('home-screen')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should show error with invalid credentials', async () => {
      await element(by.id('login-email-input')).typeText('invalid@test.com');
      await element(by.id('login-password-input')).typeText('wrongpass');
      await element(by.id('login-button')).tap();

      // Should show error message
      await waitFor(element(by.text('Invalid credentials')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Claim Creation Flow', () => {
    beforeEach(async () => {
      // Ensure logged in
      await loginAsTestUser();
    });

    it('should create a new claim', async () => {
      // Navigate to claims tab
      await element(by.id('tab-claims')).tap();

      // Tap create claim FAB
      await element(by.id('create-claim-fab')).tap();

      // Fill in claim details
      await element(by.id('claim-number-input')).typeText('TEST-001');
      await element(by.id('insured-name-input')).typeText('John Doe');
      await element(by.id('loss-date-picker')).tap();
      await element(by.text('OK')).tap();

      // Save claim
      await element(by.id('save-claim-button')).tap();

      // Should show success and navigate to claim details
      await waitFor(element(by.id('claim-details-screen')))
        .toBeVisible()
        .withTimeout(5000);

      await expect(element(by.text('TEST-001'))).toBeVisible();
    });
  });

  describe('Photo Capture Flow', () => {
    beforeEach(async () => {
      await loginAsTestUser();
    });

    it('should capture and upload a photo', async () => {
      // Navigate to capture tab
      await element(by.id('tab-capture')).tap();

      // Tap camera button
      await element(by.id('camera-capture-button')).tap();

      // Wait for camera to load
      await waitFor(element(by.id('camera-view')))
        .toBeVisible()
        .withTimeout(3000);

      // Take photo
      await element(by.id('camera-shutter-button')).tap();

      // Should return to gallery with new photo
      await waitFor(element(by.id('photo-gallery')))
        .toBeVisible()
        .withTimeout(5000);

      // First photo should show uploading or done status
      await waitFor(element(by.id('photo-item-0')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should assign photo to claim', async () => {
      // Navigate to gallery
      await element(by.id('tab-capture')).tap();
      await element(by.text('Gallery')).tap();

      // Enable select mode
      await element(by.id('select-button')).tap();

      // Select first photo
      await element(by.id('photo-item-0')).tap();

      // Tap assign button
      await element(by.id('assign-button')).tap();

      // Search for claim
      await element(by.id('claim-search-input')).typeText('TEST-001');

      // Select claim
      await element(by.text('TEST-001')).tap();

      // Should show success
      await waitFor(element(by.text('Success')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Workflow Generation Flow', () => {
    beforeEach(async () => {
      await loginAsTestUser();
    });

    it('should generate AI workflow for claim', async () => {
      // Navigate to claim details
      await navigateToClaimDetails('TEST-001');

      // Tap generate workflow button
      await element(by.id('generate-workflow-button')).tap();

      // Should show loading
      await expect(element(by.id('workflow-loading'))).toBeVisible();

      // Wait for workflow to generate
      await waitFor(element(by.id('workflow-steps-list')))
        .toBeVisible()
        .withTimeout(30000); // AI can take time

      // Should have workflow steps
      await expect(element(by.id('workflow-step-0'))).toBeVisible();
    });
  });

  describe('PDF Export Flow', () => {
    beforeEach(async () => {
      await loginAsTestUser();
    });

    it('should export claim as PDF', async () => {
      // Navigate to claim details
      await navigateToClaimDetails('TEST-001');

      // Tap export button
      await element(by.id('export-pdf-button')).tap();

      // Should show loading
      await expect(element(by.id('pdf-generating-loader'))).toBeVisible();

      // Wait for PDF generation
      await waitFor(element(by.text('PDF Generated')))
        .toBeVisible()
        .withTimeout(15000);

      // Should show share dialog
      await expect(element(by.id('share-dialog'))).toBeVisible();
    });
  });

  describe('Offline Mode Flow', () => {
    beforeEach(async () => {
      await loginAsTestUser();
    });

    it('should work offline and sync when online', async () => {
      // Go offline
      await device.setURLBlacklist(['*']);

      // Create claim offline
      await element(by.id('tab-claims')).tap();
      await element(by.id('create-claim-fab')).tap();
      await element(by.id('claim-number-input')).typeText('OFFLINE-001');
      await element(by.id('save-claim-button')).tap();

      // Should show offline indicator
      await expect(element(by.id('offline-indicator'))).toBeVisible();

      // Go back online
      await device.setURLBlacklist([]);

      // Trigger sync
      await element(by.id('sync-button')).tap();

      // Should sync successfully
      await waitFor(element(by.text('Synced')))
        .toBeVisible()
        .withTimeout(10000);
    });
  });
});

// Helper functions
async function loginAsTestUser() {
  const isLoggedIn = await element(by.id('home-screen')).exists();

  if (!isLoggedIn) {
    await element(by.id('login-email-input')).typeText('test@claimsiq.ai');
    await element(by.id('login-password-input')).typeText('password123');
    await element(by.id('login-button')).tap();

    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(10000);
  }
}

async function navigateToClaimDetails(claimNumber: string) {
  await element(by.id('tab-claims')).tap();
  await element(by.id('search-bar')).typeText(claimNumber);
  await element(by.text(claimNumber)).tap();

  await waitFor(element(by.id('claim-details-screen')))
    .toBeVisible()
    .withTimeout(5000);
}
