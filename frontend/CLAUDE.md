# dream-api Frontend

Developer dashboard + marketing site for dream-api.

## Architecture

```
src/
├── config.ts          # BRANDING - edit this to change ALL pages
├── App.tsx            # Router
├── pages/
│   ├── LandingNew.tsx # Marketing landing page
│   ├── DashboardNew.tsx # Developer dashboard
│   ├── Credentials.tsx
│   └── ApiTierConfig.tsx
├── components/
│   ├── layout/        # Header, ProjectSelector, etc.
│   ├── dashboard/     # SaasDashboard, StoreDashboard, etc.
│   └── shared/        # Reusable components
├── hooks/             # useProjects, useCredentials, useDashboardData
└── constants/         # API URLs, types, status styles
```

## Branding System (config.ts)

**To change branding, edit `src/config.ts`:**

```typescript
// Theme: 'dark' or 'light'
theme: 'dark',

// Accent: 'blue', 'emerald', 'violet', 'rose', 'amber', 'sky'
accentColor: 'blue',
```

**Use in components:**
```typescript
import { getTheme, getAccent, CONFIG } from '../config';

const theme = getTheme();
const accent = getAccent();

// Theme classes
theme.pageBg      // 'bg-gray-900' (dark) or 'bg-slate-50' (light)
theme.cardBg      // Card backgrounds
theme.heading     // Text color for headings
theme.muted       // Muted text color

// Accent classes
accent.bg         // 'bg-blue-600'
accent.text       // 'text-blue-400'
accent.bgHover    // 'hover:bg-blue-500'
```

## Key Files

| File | What to edit |
|------|--------------|
| `config.ts` | ALL branding, content, links, pricing |
| `constants/index.ts` | API URLs, types, status colors |
| `pages/LandingNew.tsx` | Landing page structure |
| `pages/DashboardNew.tsx` | Dashboard layout |

## Adding New Pages

1. Create page in `src/pages/`
2. Import from config:
   ```typescript
   import { getTheme, getAccent, CONFIG } from '../config';
   ```
3. Use theme classes for consistent styling
4. Add route in `App.tsx`

## Don't Modify

- `hooks/` - Data fetching logic
- `constants/index.ts` types - Used throughout app

## Local Development

```bash
npm install
npm run dev  # http://localhost:5173
```

## Environment Variables

```
VITE_DREAM_PUBLISHABLE_KEY=pk_test_xxx
VITE_FRONT_AUTH_API_URL=http://localhost:8788
VITE_OAUTH_API_URL=http://localhost:8789
```
