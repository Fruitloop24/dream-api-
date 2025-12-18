/**
 * Test App Configuration
 *
 * Copy this file to config.js and fill in your values.
 * config.js is gitignored - your keys stay local.
 */

window.TEST_CONFIG = {
  // End-user Clerk app (from api-multi/.dev.vars)
  clerkPublishableKey: 'pk_test_YOUR_END_USER_CLERK_KEY',

  // Your project's secret key (from dashboard after creating a project)
  secretKey: 'sk_test_YOUR_SECRET_KEY',

  // API base URL
  apiUrl: 'https://api-multi.k-c-sheffield012376.workers.dev',

  // Test user credentials (create via POST /api/customers first)
  testUser: {
    email: 'your-test-user@example.com',
    password: 'YourTestPassword123!',
  },
};
