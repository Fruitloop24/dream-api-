# QUICKSTART - 30 Second Resume

## Where We Are
✅ **Backend done** - Usage tracking working (5 free, 500 paid)
⚠️ **Frontend needs** - Display usage stats in dashboard

---

## Start Services (2 terminals)

**Terminal 1:**
```bash
cd /home/mini/Documents/dream-api/front-auth-api && npm run dev
```

**Terminal 2:**
```bash
cd /home/mini/Documents/dream-api/frontend && npm run dev
```

Open: **http://localhost:5173**

---

## What to Build Next

### 1. Show Usage Stats (15 min)

**File:** `frontend/src/pages/DashboardNew.tsx`

**Add this after user loads:**
```typescript
const [usage, setUsage] = useState(null);

// Fetch usage stats
useEffect(() => {
  const fetchUsage = async () => {
    const token = await getToken();
    const res = await fetch(`${FRONT_AUTH_API}/verify-auth`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setUsage(data.usage);
  };

  if (hasPaid) fetchUsage();
}, [hasPaid]);
```

**Display it:**
```jsx
{usage && (
  <div className="usage-stats">
    <h3>API Usage This Month</h3>
    <p>{usage.count} / {usage.limit} calls</p>
    <div className="progress-bar">
      <div style={{width: `${(usage.count/usage.limit)*100}%`}} />
    </div>
    <span className="plan-badge">{usage.plan.toUpperCase()}</span>
  </div>
)}
```

### 2. Fix Layout (5 min)

Dashboard off-center → Add CSS:
```css
.dashboard-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}
```

### 3. Upgrade CTA (10 min)

When near limit:
```jsx
{usage && usage.remaining <= 2 && usage.plan === 'free' && (
  <div className="upgrade-prompt">
    <p>⚠️ Only {usage.remaining} calls remaining!</p>
    <button onClick={handleUpgrade}>
      Upgrade to 500 calls/month →
    </button>
  </div>
)}
```

---

## Testing Checklist

- [ ] Sign up new user
- [ ] See "0 / 5 calls" in dashboard
- [ ] Make API call (use browser console)
- [ ] See "1 / 5 calls" update
- [ ] Make 5 calls → See limit warning
- [ ] Click upgrade → Stripe checkout
- [ ] Pay → See "6 / 500 calls"

---

## Files You'll Touch

```
frontend/src/pages/DashboardNew.tsx  ← Main work here
frontend/src/index.css               ← CSS fixes
```

---

## API Response Format

When you call any endpoint, you get:
```json
{
  "success": true,
  "usage": {
    "count": 3,
    "limit": 5,
    "plan": "free",
    "remaining": 2,
    "periodStart": "2025-11-01",
    "periodEnd": "2025-11-30"
  }
}
```

Just parse and display it!

---

## Docs to Reference

- **STATUS.md** - Current state & progress
- **TOMORROW.md** - Detailed plan + UI mockups
- **CLAUDE.md** - Full dev guide (scroll to "Quick Start")

---

*You got this! 30 minutes to a working dashboard. 🚀*
