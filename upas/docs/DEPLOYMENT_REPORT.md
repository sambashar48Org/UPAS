# UPAS Deployment Report — Phase 5K

## Deployment Summary

| Item | Value |
|------|-------|
| **Site URL** | https://upas-protective-analysis.netlify.app |
| **Version** | 1.0.0-RC1 |
| **Deploy ID** | 6a5f41b1f33863f2be980d71 |
| **Date** | 2026-07-21 |
| **Git Commit** | 7c8058f |
| **GitHub** | https://github.com/sambashar48Org/UPAS |
| **Netlify Site ID** | f126b920-a550-4446-888f-cd6ec87fd06e |

## Build Details

| Asset | Size (raw) | Size (gzip) |
|-------|-----------|-------------|
| `index.html` | 0.53 kB | 0.37 kB |
| `index.css` | 30.86 kB | 6.41 kB |
| `index.js` | 1,641.40 kB | 453.74 kB |
| **Total** | ~1.7 MB | ~460 kB |

**Build Tool**: Vite 8.1.4 + Rolldown
**Build Time**: 1.29s
**Modules Transformed**: 687

## Verification Results

| Check | Status |
|-------|--------|
| Site returns HTTP 200 | PASS |
| HTML loads with correct RTL/AR meta | PASS |
| CSS asset accessible (30,869 bytes) | PASS |
| JS bundle accessible (1,641,409 bytes) | PASS |
| Favicon accessible | PASS |
| Icons SVG accessible | PASS |
| All assets served over HTTPS | PASS |

## Static Assets

```
dist/
  index.html       (entry point, Arabic RTL)
  favicon.svg      (app icon)
  icons.svg        (UI icons)
  assets/
    index-BQTUUjNU.css   (30.86 KB)
    index-vSxMZPJl.js    (1,641.40 KB)
```

## Remaining Notes

- Single-page application with client-side routing (React Router v7)
- No server-side rendering — all routing handled by the browser
- Netlify `/*` redirect to `/index.html` may be needed for direct URL access to sub-routes
- The JS bundle is large (1.6 MB) due to Three.js inclusion; code-splitting can be added in future phases
- Two non-critical build warnings (INEFFECTIVE_DYNAMIC_IMPORT) — no user impact