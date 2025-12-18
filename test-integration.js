/**
 * ============================================================================
 * DREAM-API INTEGRATION TEST
 * ============================================================================
 *
 * Tests the glue - customer creation, usage tracking, limit enforcement.
 * Run with: node test-integration.js
 *
 * ============================================================================
 */

const API_BASE = 'https://api-multi.k-c-sheffield012376.workers.dev';
// Provide keys via environment to avoid committing secrets.
const SK = process.env.DREAM_API_SK || 'sk_test_xxx';
const PK = process.env.DREAM_API_PK || 'pk_test_xxx';

// Test config
const NUM_CUSTOMERS = 5; // Quick test to verify flow
// Generate unique password per user to avoid breach detection
function generatePassword(index) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pwd = 'Dx';
  for (let i = 0; i < 12; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd + index + '!';
}

// Stats
const stats = {
  customersCreated: 0,
  customersFailed: 0,
  usageTracked: 0,
  limitsHit: 0,
  checkoutsGenerated: 0,
  errors: []
};

// Generate unique email
function generateEmail(index) {
  const timestamp = Date.now();
  return `testuser_${timestamp}_${index}@test-dream-api.com`;
}

// API helper
async function api(method, endpoint, body = null, extraHeaders = {}) {
  const headers = {
    'Authorization': `Bearer ${SK}`,
    'Content-Type': 'application/json',
    ...extraHeaders
  };

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${endpoint}`, opts);
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

// Test 1: Fetch tiers via dashboard endpoint (authenticated)
async function testFetchTiers() {
  console.log('\n📋 Fetching tiers via dashboard...');
  const { ok, data } = await api('GET', `/api/dashboard`, null, {
    'X-Publishable-Key': PK
  });
  if (ok && data.tiers) {
    console.log(`   Found ${data.tiers.length} tiers:`);
    data.tiers.forEach(t => {
      console.log(`   - ${t.name}: $${t.price}/mo, ${t.limit} calls, priceId: ${t.priceId || 'none'}`);
    });
    return data.tiers;
  } else {
    console.log('   ❌ Failed to fetch dashboard:', data);
    return [];
  }
}

// Test 2: Create a customer
async function testCreateCustomer(email, plan = 'free') {
  const { ok, data } = await api('POST', '/api/customers', {
    email,
    password: generatePassword(stats.customersCreated),
    firstName: 'Test',
    lastName: 'User',
    plan
  });

  if (ok && data.customer) {
    stats.customersCreated++;
    return data.customer;
  } else {
    stats.customersFailed++;
    stats.errors.push(`Create customer failed: ${JSON.stringify(data)}`);
    return null;
  }
}

// Test 3: Track usage
async function testTrackUsage(userId, plan) {
  const { ok, status, data } = await api('POST', '/api/data', null, {
    'X-User-Id': userId,
    'X-User-Plan': plan
  });

  if (ok) {
    stats.usageTracked++;
    return { success: true, usage: data.usage };
  } else if (status === 403) {
    // Limit hit - this is expected!
    stats.limitsHit++;
    return { success: false, limitHit: true, usage: data };
  } else {
    stats.errors.push(`Track usage failed: ${JSON.stringify(data)}`);
    return { success: false, error: data };
  }
}

// Test 4: Generate checkout URL (using priceId)
async function testCreateCheckout(userId, priceId) {
  const { ok, data } = await api('POST', '/api/create-checkout',
    { priceId, successUrl: 'https://example.com/success', cancelUrl: 'https://example.com/cancel' },
    { 'X-User-Id': userId, 'Origin': 'https://example.com' }
  );

  if (ok && data.url) {
    stats.checkoutsGenerated++;
    return data.url;
  } else {
    stats.errors.push(`Create checkout failed: ${JSON.stringify(data)}`);
    return null;
  }
}

// Test 5: Check usage
async function testGetUsage(userId, plan) {
  const { ok, data } = await api('GET', '/api/usage', null, {
    'X-User-Id': userId,
    'X-User-Plan': plan
  });
  return ok ? data : null;
}

// Main test runner
async function runTests() {
  console.log('🚀 DREAM-API Integration Test');
  console.log('================================');
  console.log(`API: ${API_BASE}`);
  console.log(`Customers to create: ${NUM_CUSTOMERS}`);
  console.log(`Password: (unique per user)`);

  const startTime = Date.now();

  // Fetch tiers first
  const tiers = await testFetchTiers();
  const freeTier = tiers.find(t => t.name.toLowerCase() === 'free');
  const freeLimit = freeTier?.limit || 2;
  console.log(`\n   Free tier limit: ${freeLimit} calls`);

  // Create customers and test usage limits
  console.log(`\n👤 Creating ${NUM_CUSTOMERS} customers and testing usage limits...`);

  for (let i = 0; i < NUM_CUSTOMERS; i++) {
    const email = generateEmail(i);
    process.stdout.write(`\r   Customer ${i + 1}/${NUM_CUSTOMERS}...`);

    // Create customer
    const customer = await testCreateCustomer(email, 'free');
    if (!customer) continue;

    const userId = customer.id;

    // Track usage until limit hit
    let limitHit = false;
    for (let call = 1; call <= freeLimit + 2; call++) {
      const result = await testTrackUsage(userId, 'free');
      if (result.limitHit) {
        limitHit = true;
        break;
      }
    }

    // If we're on customer 0, also test checkout generation
    if (i === 0 && customer) {
      const proTier = tiers.find(t => t.name.toLowerCase() === 'pro');
      if (proTier?.priceId) {
        const checkoutUrl = await testCreateCheckout(userId, proTier.priceId);
        if (checkoutUrl) {
          console.log(`\n   ✅ Checkout URL generated: ${checkoutUrl.substring(0, 60)}...`);
        }
      } else {
        console.log(`\n   ⚠️ No Pro tier priceId found, skipping checkout test`);
      }
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  // Print results
  console.log('\n\n================================');
  console.log('📊 RESULTS');
  console.log('================================');
  console.log(`✅ Customers created: ${stats.customersCreated}/${NUM_CUSTOMERS}`);
  console.log(`❌ Customers failed:  ${stats.customersFailed}`);
  console.log(`📈 Usage calls tracked: ${stats.usageTracked}`);
  console.log(`🚫 Limits hit (expected): ${stats.limitsHit}`);
  console.log(`💳 Checkouts generated: ${stats.checkoutsGenerated}`);
  console.log(`⏱️  Duration: ${duration}s`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors (${stats.errors.length}):`);
    stats.errors.slice(0, 5).forEach(e => console.log(`   - ${e}`));
    if (stats.errors.length > 5) {
      console.log(`   ... and ${stats.errors.length - 5} more`);
    }
  }

  // Summary
  console.log('\n================================');
  if (stats.customersCreated === NUM_CUSTOMERS && stats.limitsHit > 0) {
    console.log('✅ ALL TESTS PASSED - Glue is working!');
  } else if (stats.customersCreated > 0) {
    console.log('⚠️  PARTIAL SUCCESS - Check errors above');
  } else {
    console.log('❌ TESTS FAILED - Check API connection and keys');
  }
  console.log('================================\n');
}

// Run
runTests().catch(console.error);
