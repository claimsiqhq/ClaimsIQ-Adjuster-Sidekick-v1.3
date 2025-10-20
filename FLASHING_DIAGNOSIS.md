# Flashing Screen Diagnosis

## What "Flashing Very Fast" Means

The app is in a **crash-restart loop**:
1. App starts
2. Hits error in initial render
3. React/Expo catches error
4. App restarts
5. Loop repeats = flashing

## Most Likely Causes

### 1. SplashScreen Issue
- SplashScreen.preventAutoHideAsync() called
- But hideAsync() might fail or timeout
- App stuck showing splash, crashes, retries

### 2. Auth State Loop
- onAuthStateChange triggers immediately
- Causes state update
- Component re-renders
- Triggers again = infinite loop

### 3. Redirect Loop
- <Redirect href="/auth/login" /> navigates
- Login screen redirects somewhere
- That redirects back
- Infinite navigation loop

## Recommended Fix

**SIMPLIFY THE ROOT LAYOUT:**

Remove complex auth logic and use simpler pattern:
- Don't prevent splash auto-hide
- Don't use onAuthStateChange in root
- Use simpler redirect logic

I'm in ASK MODE - switch to AGENT MODE so I can apply the fix!
