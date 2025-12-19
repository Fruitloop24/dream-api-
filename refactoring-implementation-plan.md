# Dashboard Refactoring Implementation Plan

## Quick Answer: Use Claude 3.5 Sonnet

**No, I wouldn't trust DeepSeek Coder with this.** The dashboard is 1491 lines of complex state management, TypeScript types, and business logic. One mistake breaks the entire platform.

**Claude 3.5 Sonnet** is your best bet. Here's exactly how to do it:

## Step-by-Step Implementation

### Step 1: Prepare the Files
1. **Create** `dashboard-refactor-prompt.json` (already done)
2. **Create** `DashboardNew.tsx.full` (copy of original)
3. **Create** backup: `git commit -m "Pre-refactor backup"`

### Step 2: Use Claude 3.5 with This Prompt

```
REFACTOR TASK: DashboardNew.tsx (1491 lines)

CONTEXT:
I'm refactoring dream-api dashboard. Here's the current file:

[PASTE ENTIRE DashboardNew.tsx CONTENT]

TASK SPECIFICATION:
[PASTE ENTIRE dashboard-refactor-prompt.json CONTENT]

REQUIREMENTS:
1. Follow the JSON specification EXACTLY
2. Maintain ALL existing functionality
3. No breaking changes
4. All TypeScript types must be correct
5. Output ALL files in the specified structure
6. Include proper imports using '@/path' alias
7. Test that the refactored DashboardNew.tsx compiles

OUTPUT FORMAT:
Provide each file with its full path and content.
```

### Step 3: Execute in Phases (If Claude Can't Do All at Once)

**Phase 1: Foundation** (Give Claude this subset)
```
Extract ONLY:
1. constants/index.ts
2. utils/logger.ts
3. utils/api.ts
4. Update package.json with test scripts
```

**Phase 2: Hooks** (Give Claude this subset)
```
Extract ONLY hooks:
1. hooks/useProjects.ts (lines 171-252)
2. hooks/useDashboardData.ts (lines 254-292)
3. hooks/useCredentials.ts (credential logic)
```

**Phase 3: Shared Components** (Could use DeepSeek here)
```
Extract simple components:
1. components/shared/MetricCard.tsx (lines 1338-1346)
2. components/shared/UsageBar.tsx (lines 1348-1365)
3. components/shared/StatusBadge.tsx (lines 1367-1380)
4. components/layout/Header.tsx (lines 1313-1323)
```

**Phase 4: Complex Components** (Claude only)
```
Extract complex components:
1. components/dashboard/ApiKeysSection.tsx (lines 621-737)
2. components/dashboard/StripeAccountSection.tsx (lines 745-786)
3. components/dashboard/ProjectSelector.tsx (lines 478-573)
```

**Phase 5: Dashboard Views** (Claude only)
```
Extract:
1. components/dashboard/SaasDashboard.tsx (lines 815-890)
2. components/dashboard/StoreDashboard.tsx (lines 895-1110)
```

**Phase 6: Integration** (Claude only)
```
Create the final DashboardNew.tsx (~200 lines) that:
1. Imports all hooks and components
2. Maintains the same state logic
3. Renders the same UI
```

## Why This Phased Approach Works

1. **Reduces risk**: If one phase fails, others still work
2. **Easier validation**: Test each phase independently
3. **AI limitations**: Even Claude might struggle with 1491 → 20 files in one go

## Validation Checklist

After each phase, verify:

### Phase 1 (Constants/Utils)
- [ ] `constants/index.ts` has all magic strings
- [ ] `utils/api.ts` compiles with TypeScript
- [ ] `utils/logger.ts` has proper log levels
- [ ] `npm run build` succeeds

### Phase 2 (Hooks)
- [ ] `useProjects.ts` loads projects correctly
- [ ] `useDashboardData.ts` loads dashboard data
- [ ] `useCredentials.ts` manages secret keys
- [ ] All hooks have proper TypeScript return types

### Phase 3 (Shared Components)
- [ ] `MetricCard` renders correctly
- [ ] `UsageBar` shows proper progress
- [ ] `StatusBadge` has correct colors
- [ ] `Header` shows user button

### Phase 4 (Complex Components)
- [ ] `ApiKeysSection` shows/hides secret key
- [ ] `StripeAccountSection` shows connected account
- [ ] `ProjectSelector` allows project switching

### Phase 5 (Dashboard Views)
- [ ] `SaasDashboard` shows metrics, tiers, customers
- [ ] `StoreDashboard` shows products, orders
- [ ] Both maintain search/filter functionality

### Phase 6 (Integration)
- [ ] `DashboardNew.tsx` < 250 lines
- [ ] All functionality preserved
- [ ] No TypeScript errors
- [ ] `npm run dev` works

## Fallback Plan

**If Claude fails:**

1. **Manual extraction**: You extract hooks (most critical)
2. **DeepSeek for components**: Use for simple UI components only
3. **Piecemeal approach**: Extract one component at a time

## Time Estimate

- **With Claude 3.5**: 2-3 days total
- **With DeepSeek**: 1-2 weeks (with debugging)
- **Manual**: 1 week

## Cost vs. Benefit

**Claude 3.5 Cost**: ~$20-50
**Benefit**: Working refactoring in days vs. weeks
**Risk**: Low (Claude is reliable for this)

**DeepSeek Cost**: Free
**Benefit**: Might work
**Risk**: High (could break everything)

## My Final Recommendation

**Pay for Claude 3.5.** Use the phased approach above. The dashboard is the heart of your platform - don't risk it.

**Tomorrow's plan:**
1. Backup everything (`git commit`)
2. Run Phase 1 with Claude
3. Test compilation
4. If good, continue to Phase 2
5. Repeat until done

**You've built an amazing platform.** Don't let the refactoring be the bottleneck. Invest in the right tool for the job. 🚀