# App Assets

## Required Images

### App Icon
- **File:** `app-icon.png`
- **Size:** 1024x1024 px
- **Format:** PNG with transparency
- **Design:** Purple gradient with "iQ" text or Claims iQ logo
- **Currently:** Using generated placeholder (purple square with "iQ")

### Splash Screen
- **File:** `splash.png`
- **Size:** 2048x2048 px (or adaptive 1284x2778)
- **Format:** PNG
- **Background:** `#F0E6FA` (light purple from app.json)
- **Design:** Claims iQ logo centered

---

## Temporary Solution

Since no logo assets exist, the app now uses:
- **Login Screen:** Text-based logo with purple "iQ" badge
- **App Icon:** Default Expo icon (will show in build)
- **Splash:** Default Expo splash (will show in build)

---

## To Add Real Logo:

1. Create/get your Claims iQ logo files
2. Place in this directory:
   - `app-icon.png` (1024x1024)
   - `splash.png` (2048x2048)
3. Rebuild with: `eas build --platform ios --profile preview`

The purple/pink color scheme is now properly applied throughout!

