import { test, expect } from '@playwright/test';

test.describe('AI CX Chatbot', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage before each test
    await page.goto('http://localhost:3000');
  });

  test('should open chat widget when icon is clicked', async ({ page }) => {
    // Find the floating action button (the cloud icon)
    const fab = page.locator('button.fixed.bottom-6');
    await fab.click();

    // Check if the chat window is visible
    const chatWindow = page.locator('text=AI Assistant');
    await expect(chatWindow).toBeVisible();
  });

  test('should send a message and receive a response', async ({ page }) => {
    // 1. Open Chat
    await page.locator('button.fixed.bottom-6').click();

    // 2. Type a message
    const input = page.locator('input[placeholder="Ask about banking, hours, fees..."]');
    await input.fill('What are your hours?');
    await input.press('Enter');

    // 3. Expect a user message bubble
    await expect(page.locator('text=What are your hours?')).toBeVisible();

    // 4. Expect a bot response (Wait for it to appear)
    // We look for a bubble that is NOT the user's
    const botMessage = page.locator('.bg-white.text-gray-800').last();
    await expect(botMessage).toBeVisible({ timeout: 10000 });
  });

  test('should trigger login modal for banking intents', async ({ page }) => {
    await page.locator('button.fixed.bottom-6').click();

    const input = page.locator('input[placeholder="Ask about banking, hours, fees..."]');
    await input.fill('Check my balance');
    await input.press('Enter');

    // Expect Login Modal
    const modal = page.locator('text=Authentication Required');
    await expect(modal).toBeVisible();
  });
});