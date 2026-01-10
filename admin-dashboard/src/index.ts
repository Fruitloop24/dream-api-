/**
 * Admin Dashboard - Dream API Platform Overview
 *
 * Simple dashboard showing all devs, their end-users, and billing metrics.
 * Protected by Cloudflare Access (email whitelist).
 */

interface Env {
  DB: D1Database;
  CLERK_SECRET_KEY?: string;
}

interface Platform {
  platformId: string;
  clerkUserId: string;
  stripeCustomerId: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: number | null;
  trialEndsAt: number | null;
  createdAt: string;
}

interface ClerkUser {
  id: string;
  email_addresses: { email_address: string }[];
  first_name: string | null;
  last_name: string | null;
}

interface EndUserCount {
  platformId: string;
  test_users: number;
  live_users: number;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // API endpoint for JSON data
    if (url.pathname === '/api/data') {
      return await getJsonData(env);
    }

    // Main dashboard page
    return new Response(getDashboardHtml(), {
      headers: { 'Content-Type': 'text/html' },
    });
  },
};

async function getJsonData(env: Env): Promise<Response> {
  // Get all platforms
  const platforms = await env.DB.prepare(`
    SELECT platformId, clerkUserId, stripeCustomerId, subscriptionStatus, currentPeriodEnd, trialEndsAt, createdAt
    FROM platforms
    ORDER BY createdAt DESC
  `).all<Platform>();

  // Get end-user counts per platform
  const endUserCounts = await env.DB.prepare(`
    SELECT
      platformId,
      SUM(CASE WHEN publishableKey LIKE 'pk_test_%' THEN 1 ELSE 0 END) as test_users,
      SUM(CASE WHEN publishableKey LIKE 'pk_live_%' THEN 1 ELSE 0 END) as live_users
    FROM end_users
    GROUP BY platformId
  `).all<EndUserCount>();

  // Get total counts
  const totals = await env.DB.prepare(`
    SELECT
      (SELECT COUNT(*) FROM platforms) as total_platforms,
      (SELECT COUNT(*) FROM platforms WHERE subscriptionStatus = 'active') as paying_platforms,
      (SELECT COUNT(*) FROM platforms WHERE subscriptionStatus = 'trialing') as trialing_platforms,
      (SELECT COUNT(*) FROM end_users WHERE publishableKey LIKE 'pk_live_%') as total_live_users,
      (SELECT COUNT(*) FROM end_users WHERE publishableKey LIKE 'pk_test_%') as total_test_users
  `).first<{
    total_platforms: number;
    paying_platforms: number;
    trialing_platforms: number;
    total_live_users: number;
    total_test_users: number;
  }>();

  // Fetch emails from Clerk API
  const emailMap = new Map<string, { email: string; name: string }>();
  if (env.CLERK_SECRET_KEY && platforms.results) {
    const userIds = platforms.results.map(p => p.clerkUserId).filter(Boolean);
    // Fetch users in batches (Clerk API)
    for (const userId of userIds) {
      try {
        const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
          headers: { Authorization: `Bearer ${env.CLERK_SECRET_KEY}` },
        });
        if (res.ok) {
          const user: ClerkUser = await res.json();
          const email = user.email_addresses?.[0]?.email_address || '';
          const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || '';
          emailMap.set(userId, { email, name });
        }
      } catch (e) {
        // Skip on error
      }
    }
  }

  // Merge end-user counts and emails into platforms
  const countMap = new Map(endUserCounts.results?.map(c => [c.platformId, c]) || []);
  const enrichedPlatforms = platforms.results?.map(p => ({
    ...p,
    test_users: countMap.get(p.platformId)?.test_users || 0,
    live_users: countMap.get(p.platformId)?.live_users || 0,
    email: emailMap.get(p.clerkUserId)?.email || '',
    name: emailMap.get(p.clerkUserId)?.name || '',
  })) || [];

  // Calculate MRR (only PAYING platforms * $19, trialing = $0)
  const mrr = (totals?.paying_platforms || 0) * 19;

  // Calculate actual overage per dev (only count users over 2000 per dev)
  let totalOverageUsers = 0;
  for (const p of enrichedPlatforms) {
    if (p.live_users > 2000) {
      totalOverageUsers += p.live_users - 2000;
    }
  }
  const estimatedOverage = totalOverageUsers * 0.03;

  return new Response(JSON.stringify({
    totals: {
      ...totals,
      mrr,
      estimatedOverage,
    },
    platforms: enrichedPlatforms,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dream API Admin</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background: #0f172a; color: #e2e8f0; }
    .card { background: #1e293b; border-radius: 12px; padding: 20px; }
    .tab { padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
    .tab:hover { background: #334155; }
    .tab.active { background: #3b82f6; color: white; }
    .pulse { animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  </style>
</head>
<body class="min-h-screen p-8">
  <div class="max-w-7xl mx-auto">
    <div class="flex justify-between items-start mb-8">
      <div>
        <h1 class="text-3xl font-bold mb-2">Dream API Admin</h1>
        <p class="text-slate-400">Platform overview - for your eyes only</p>
      </div>
      <div class="text-right text-sm text-slate-500">
        <div>Last refresh: <span id="last-refresh">-</span></div>
        <div class="text-xs mt-1">Auto-refreshes every 30s</div>
      </div>
    </div>

    <!-- Metrics -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" id="metrics">
      <div class="card">
        <div class="text-slate-400 text-sm">Total Devs</div>
        <div class="text-2xl font-bold" id="total-devs">-</div>
      </div>
      <div class="card">
        <div class="text-slate-400 text-sm">Paying Devs</div>
        <div class="text-2xl font-bold text-green-400" id="active-devs">-</div>
        <div class="text-xs text-slate-500 mt-1" id="paying-breakdown">-</div>
      </div>
      <div class="card">
        <div class="text-slate-400 text-sm">MRR</div>
        <div class="text-2xl font-bold text-emerald-400" id="mrr">-</div>
        <div class="text-xs text-slate-500 mt-1">base @ $19/dev</div>
      </div>
      <div class="card">
        <div class="text-slate-400 text-sm">Est. Overage</div>
        <div class="text-2xl font-bold" id="overage">-</div>
        <div class="text-xs text-slate-500 mt-1">@ $0.03/user over 2k</div>
      </div>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="card">
        <div class="text-slate-400 text-sm">Live End-Users</div>
        <div class="text-2xl font-bold text-blue-400" id="live-users">-</div>
        <div class="text-xs text-slate-500 mt-1" id="devs-in-overage">0 devs in overage</div>
      </div>
      <div class="card">
        <div class="text-slate-400 text-sm">Test End-Users</div>
        <div class="text-2xl font-bold text-slate-500" id="test-users">-</div>
        <div class="text-xs text-slate-500 mt-1">free forever</div>
      </div>
      <div class="card">
        <div class="text-slate-400 text-sm">Devs with Users</div>
        <div class="text-2xl font-bold text-purple-400" id="devs-with-users">-</div>
        <div class="text-xs text-slate-500 mt-1">actually building</div>
      </div>
      <div class="card">
        <div class="text-slate-400 text-sm">Avg Users/Dev</div>
        <div class="text-2xl font-bold text-cyan-400" id="avg-users">-</div>
        <div class="text-xs text-slate-500 mt-1">live users only</div>
      </div>
    </div>

    <!-- Tabs + Table -->
    <div class="card">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">Developers</h2>
        <div class="flex gap-2 text-sm" id="tabs">
          <div class="tab active" data-filter="all">All <span class="text-slate-400" id="count-all"></span></div>
          <div class="tab" data-filter="paying">Paying <span class="text-green-400" id="count-paying"></span></div>
          <div class="tab" data-filter="trialing">Trialing <span class="text-blue-400" id="count-trialing"></span></div>
          <div class="tab" data-filter="with-users">With Users <span class="text-purple-400" id="count-with-users"></span></div>
          <div class="tab" data-filter="empty">Empty <span class="text-slate-500" id="count-empty"></span></div>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-slate-400 border-b border-slate-700">
              <th class="pb-3">Email</th>
              <th class="pb-3">Status</th>
              <th class="pb-3">Trial Ends</th>
              <th class="pb-3">Live Users</th>
              <th class="pb-3">Overage</th>
              <th class="pb-3">Test</th>
              <th class="pb-3">Created</th>
            </tr>
          </thead>
          <tbody id="platforms-table">
            <tr><td colspan="7" class="py-4 text-slate-500">Loading...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Legend -->
    <div class="mt-4 text-xs text-slate-500 flex gap-6">
      <div><span class="inline-block w-3 h-3 rounded bg-green-500 mr-1"></span> &lt;1000 users (safe)</div>
      <div><span class="inline-block w-3 h-3 rounded bg-yellow-500 mr-1"></span> 1000-2000 (approaching limit)</div>
      <div><span class="inline-block w-3 h-3 rounded bg-red-500 mr-1"></span> &gt;2000 (overage)</div>
    </div>
  </div>

  <script>
    let allPlatforms = [];
    let currentFilter = 'all';

    async function loadData() {
      const res = await fetch('/api/data');
      const data = await res.json();
      allPlatforms = data.platforms;

      // Update last refresh
      document.getElementById('last-refresh').textContent = new Date().toLocaleTimeString();

      // Calculate additional metrics
      const devsWithUsers = data.platforms.filter(p => p.live_users > 0 || p.test_users > 0).length;
      const devsWithLiveUsers = data.platforms.filter(p => p.live_users > 0).length;
      const devsInOverage = data.platforms.filter(p => p.live_users > 2000).length;
      const avgUsersPerDev = devsWithLiveUsers > 0 ? Math.round(data.totals.total_live_users / devsWithLiveUsers) : 0;

      // Update metrics
      document.getElementById('total-devs').textContent = data.totals.total_platforms;
      document.getElementById('active-devs').textContent = data.totals.paying_platforms;
      document.getElementById('paying-breakdown').textContent = '+ ' + data.totals.trialing_platforms + ' trialing';
      document.getElementById('mrr').textContent = '$' + data.totals.mrr.toFixed(2);
      const overageEl = document.getElementById('overage');
      overageEl.textContent = '$' + data.totals.estimatedOverage.toFixed(2);
      overageEl.className = 'text-2xl font-bold ' + (data.totals.estimatedOverage > 0 ? 'text-amber-400' : 'text-green-400');
      document.getElementById('live-users').textContent = data.totals.total_live_users.toLocaleString();
      document.getElementById('devs-in-overage').textContent = devsInOverage + ' dev' + (devsInOverage === 1 ? '' : 's') + ' in overage';
      document.getElementById('test-users').textContent = data.totals.total_test_users;
      document.getElementById('devs-with-users').textContent = devsWithUsers;
      document.getElementById('avg-users').textContent = avgUsersPerDev;

      // Update tab counts
      const payingCount = data.totals.paying_platforms;
      const trialingCount = data.totals.trialing_platforms;
      const emptyCount = data.platforms.filter(p => p.live_users === 0 && p.test_users === 0).length;
      document.getElementById('count-all').textContent = '(' + data.platforms.length + ')';
      document.getElementById('count-paying').textContent = '(' + payingCount + ')';
      document.getElementById('count-trialing').textContent = '(' + trialingCount + ')';
      document.getElementById('count-with-users').textContent = '(' + devsWithUsers + ')';
      document.getElementById('count-empty').textContent = '(' + emptyCount + ')';

      renderTable();
    }

    function renderTable() {
      const tbody = document.getElementById('platforms-table');

      let filtered = allPlatforms;
      if (currentFilter === 'paying') {
        filtered = allPlatforms.filter(p => p.subscriptionStatus === 'active');
      } else if (currentFilter === 'trialing') {
        filtered = allPlatforms.filter(p => p.subscriptionStatus === 'trialing');
      } else if (currentFilter === 'with-users') {
        filtered = allPlatforms.filter(p => p.live_users > 0 || p.test_users > 0);
      } else if (currentFilter === 'empty') {
        filtered = allPlatforms.filter(p => p.live_users === 0 && p.test_users === 0);
      }

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="py-4 text-slate-500">No developers match this filter</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(p => {
        const statusColor = {
          'trialing': 'text-blue-400',
          'active': 'text-green-400',
          'past_due': 'text-amber-400',
          'canceled': 'text-red-400',
        }[p.subscriptionStatus] || 'text-slate-500';

        // Live users color based on threshold
        let liveColor = 'text-green-400';
        let liveIndicator = '';
        if (p.live_users >= 2000) {
          liveColor = 'text-red-400 font-bold';
          liveIndicator = ' <span class="pulse">!</span>';
        } else if (p.live_users >= 1000) {
          liveColor = 'text-yellow-400';
        } else if (p.live_users === 0) {
          liveColor = 'text-slate-500';
        }

        // Calculate per-dev overage
        const overage = Math.max(0, p.live_users - 2000) * 0.03;
        const overageDisplay = overage > 0
          ? '<span class="text-red-400 font-semibold">$' + overage.toFixed(2) + '</span>'
          : '<span class="text-slate-600">-</span>';

        const createdDate = new Date(p.createdAt).toLocaleDateString();

        // Trial end date
        let trialDisplay = '-';
        if (p.trialEndsAt) {
          const trialDate = new Date(p.trialEndsAt);
          const daysLeft = Math.ceil((trialDate - Date.now()) / (1000 * 60 * 60 * 24));
          if (daysLeft > 0) {
            trialDisplay = '<span class="text-blue-400">' + daysLeft + 'd left</span>';
          } else {
            trialDisplay = '<span class="text-slate-500">ended</span>';
          }
        } else if (p.subscriptionStatus === 'active') {
          trialDisplay = '<span class="text-green-400">paid</span>';
        }

        // Email display
        const emailDisplay = p.email || '<span class="text-slate-600">no email</span>';

        return \`<tr class="border-b border-slate-800 hover:bg-slate-800/50">
          <td class="py-3 text-sm">\${emailDisplay}</td>
          <td class="py-3"><span class="\${statusColor}">\${p.subscriptionStatus || 'none'}</span></td>
          <td class="py-3">\${trialDisplay}</td>
          <td class="py-3 \${liveColor}">\${p.live_users.toLocaleString()}\${liveIndicator}</td>
          <td class="py-3">\${overageDisplay}</td>
          <td class="py-3 text-slate-500">\${p.test_users}</td>
          <td class="py-3 text-slate-400">\${createdDate}</td>
        </tr>\`;
      }).join('');
    }

    // Tab click handlers
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        renderTable();
      });
    });

    loadData();
    setInterval(loadData, 30000);
  </script>
</body>
</html>`;
}
