# Outstanding Issues & Missing Functionality

## ❌ Critical Issues Found

### 1. **NO LOGO/BRANDING** ⚠️
- **Location:** `assets/images/` folder is EMPTY
- **Impact:** App icon and splash screen missing
- **Login screen:** No logo, just text title
- **Files missing:**
  - `assets/images/app-icon.png` (referenced in app.json)
  - `assets/images/splash.png` (referenced in app.json)

### 2. **INCOMPLETE COLOR THEME** ⚠️
- **Problem:** Theme is missing key colors
- **Current theme has:** 11 colors
- **Missing colors:**
  - `textLight` - Used but not defined (causes errors)
  - `success` - For success states (#10B981)
  - `error` - For error states (#EF4444)
  - `warning` - For warning states (#F59E0B)
  - `info` - For info states (#3B82F6)

### 3. **HARDCODED COLORS** ⚠️
- **Found:** 82 instances of hardcoded hex colors in app code
- **Examples:**
  - `#6b7280`, `#9AA0A6`, `#5F6771` (grays)
  - `#10B981`, `#EF4444`, `#F59E0B` (status colors)
  - `#1a1a1a`, `#000` (blacks)
  - `#fff` (white)
- **Should be:** Using `colors.` from theme

---

## 🔍 DETAILED ANALYSIS

### Issue 1: Logo/Branding

#### app.json references:
```json
"icon": "./assets/images/app-icon.png",  // ❌ DOESN'T EXIST
"splash": { "image": "./assets/images/splash.png" }  // ❌ DOESN'T EXIST
```

#### Login screen:
- Just shows "Claims iQ · Login" text
- No logo/icon
- No branding imagery
- Looks unprofessional

#### What's needed:
- App icon: 1024x1024 PNG
- Splash screen: 2048x2048 PNG (or adaptive)
- Login logo: 200x200 PNG
- Brand colors visible everywhere

---

### Issue 2: Incomplete Theme

#### Current theme.colors:
```typescript
primary: '#7C3AED',      // ✅ Purple - good
secondary: '#EC4899',    // ✅ Pink - good
gold: '#FBBF24',         // ✅ Gold - good
core: '#2B2F36',         // ✅ Main text - good
bgSoft: '#F5F3F7',       // ✅ Background - good
white: '#FFFFFF',        // ✅ White - good
line: '#E5E7EB',         // ✅ Border - good
light: '#F1EEFF',        // ✅ Light purple - good
sand: '#FEF3C7',         // ✅ Sand - good
```

#### Missing (used but not defined):
```typescript
textLight - Used in tab bar, causes error
success - For success messages/badges
error - For error states
warning - For warning states
info - For info messages
```

---

### Issue 3: Hardcoded Colors

#### Examples of inconsistency:

**File: app/auth/login.tsx**
- Line 96: `color: '#6b7280'` ❌ Should be `colors.textLight`
- Line 98: `color: '#6b7280'` ❌ Should be `colors.textLight`

**File: app/(tabs)/claims.tsx**
- Line 73: `color: '#5F6771'` ❌ Should be `colors.textLight`

**File: app/(tabs)/today.tsx**
- Multiple grays: `#5F6771`, `#9AA0A6` ❌
- Success green: `#10B981` ❌ Should be `colors.success`
- Error red: `#EF4444` ❌ Should be `colors.error`
- Warning yellow: `#F59E0B` ❌ Should be `colors.warning`

**File: app/lidar/scan.tsx**
- Line: `backgroundColor: '#000'` ❌ Should be `colors.black`
- Line: `color: '#aaa'` ❌ Should be `colors.textLight`
- Line: `backgroundColor: '#1a1a1a'` ❌ Should be `colors.darkBg`

**File: components/ErrorBoundary.tsx**
- Lines: `#C53030`, `#9B2C2C`, `#742A2A` ❌ Should use theme colors

---

## 🎨 BRANDING ANALYSIS

### Current Branding: WEAK
- ❌ No logo anywhere
- ❌ Purple primary color but not prominent
- ⚠️ Colors used inconsistently
- ⚠️ Generic look, not branded

### Should Be: STRONG
- ✅ Logo on login, splash, home
- ✅ Purple/pink prominent throughout
- ✅ Consistent color usage
- ✅ Professional branded experience

---

## 📊 IMPACT ASSESSMENT

### Logo Missing:
- **Impact:** App looks generic, unprofessional
- **User Experience:** No brand recognition
- **App Store:** Required for submission
- **Severity:** HIGH

### Theme Incomplete:
- **Impact:** Crashes when using `colors.textLight`
- **User Experience:** Inconsistent visuals
- **Maintainability:** Hard to change colors
- **Severity:** MEDIUM-HIGH

### Color Inconsistency:
- **Impact:** Brand not prominent, hard to maintain
- **User Experience:** Looks inconsistent
- **Severity:** MEDIUM

---

## ✅ RECOMMENDED FIXES

See: BRANDING_AND_COLOR_FIXES.md (to be created)

1. Create logo and assets
2. Extend color theme
3. Replace all hardcoded colors
4. Add logo to login screen
5. Make purple/pink more prominent

