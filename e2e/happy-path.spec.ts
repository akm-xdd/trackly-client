import { expect, test } from '@playwright/test';

test.describe('Trackly Happy Path', () => {
  test('complete issue creation workflow', async ({ page }) => {
    // Start from home page - should redirect to login
    await page.goto('/');
    
    // Should redirect to login since not authenticated
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h2')).toContainText('Sign in to Trackly');
    
    // Login with test reporter user
    await page.fill('input[type="email"]', 'reporter@trackly.com');
    await page.fill('input[type="password"]', 'report');
    
    // Wait for login button to be ready and click it
    const loginButton = page.locator('button[type="submit"]');
    await expect(loginButton).toBeEnabled();
    await loginButton.click();
    
    // Wait for navigation after login - be more flexible about timing
    await page.waitForURL('/', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Navigate to issues page
    await page.click('a[href="/issues"]');
    await expect(page).toHaveURL('/issues');
    await expect(page.locator('h1')).toContainText('Issues');
    
    // Create new issue
    await page.click('text=Create Issue');
    await expect(page).toHaveURL('/issues/create');
    await expect(page.locator('h1')).toContainText('Create New Issue');
    
    // Fill out issue form
    const issueTitle = 'E2E Test Issue - ' + Date.now();
    await page.fill('#title', issueTitle);
    await page.fill('#description', 'This is an automated test issue created by Playwright E2E test.');
    await page.selectOption('#severity', 'HIGH');
    
    // Submit the form and wait for navigation
    await page.click('button[type="submit"]');
    await page.waitForURL('/issues', { timeout: 10000 });
    
    // Wait for the issue to appear in the list
    await expect(page.locator('text=' + issueTitle)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=HIGH').first()).toBeVisible();
    
    // Click on the issue link (the entire list item is clickable)
    await page.locator('a').filter({ hasText: issueTitle }).click();
    
    // Wait for navigation to issue detail page
    await page.waitForURL(/\/issues\/[a-f0-9-]+/, { timeout: 10000 });
    
    // Verify we're on the issue detail page
    await expect(page.url()).toMatch(/\/issues\/[a-f0-9-]+/);
    await expect(page.locator('h1')).toContainText(issueTitle);
  });

  test('admin can access user management', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@trackly.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for successful login
    await page.waitForURL('/', { timeout: 10000 });
    
    // Should see Users link in navigation (admin only)
    await expect(page.locator('a[href="/users"]')).toBeVisible();
    
    // Navigate to users page
    await page.click('a[href="/users"]');
    await expect(page).toHaveURL('/users');
    await expect(page.locator('h1')).toContainText('User Management');
    
    // Should see test users
    await expect(page.locator('text=admin@trackly.com')).toBeVisible();
    await expect(page.locator('text=reporter@trackly.com')).toBeVisible();
  });

  test('role-based access control works', async ({ page }) => {
    // Test REPORTER cannot access user management
    await page.goto('/login');
    await page.fill('input[type="email"]', 'reporter@trackly.com');
    await page.fill('input[type="password"]', 'report');
    await page.click('button[type="submit"]');
    
    // Wait for login
    await page.waitForURL('/', { timeout: 10000 });
    
    // REPORTER should NOT see Users link
    await expect(page.locator('a[href="/users"]')).not.toBeVisible();
    
    // Try direct navigation - should redirect or show access denied
    await page.goto('/users');
    
    // Wait a moment for any redirects or error messages to appear
    await page.waitForTimeout(2000);
    
    // Check current URL and page content
    const currentUrl = page.url();
    const pageContent = await page.textContent('body');
    
    // Should either:
    // 1. Not be on the users page (redirected away)
    // 2. Show access denied message
    // 3. Show "Only administrators can access" message
    const notOnUsersPage = !currentUrl.includes('/users') || currentUrl === 'http://localhost:5173/';
    const hasAccessDenied = pageContent?.includes('Access Denied') || false;
    const hasAdminOnlyMessage = pageContent?.includes('Only administrators can access') || false;
    const hasUserManagementTitle = pageContent?.includes('User Management') || false;
    
    // Should either be redirected away OR show access denied OR not show user management content
    expect(notOnUsersPage || hasAccessDenied || hasAdminOnlyMessage || !hasUserManagementTitle).toBeTruthy();
  });
});