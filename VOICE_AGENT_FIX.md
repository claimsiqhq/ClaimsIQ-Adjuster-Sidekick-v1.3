# Voice Agent - Crash Fixed

## Root Cause
The Voice Agent tab was crashing on load due to:

1. **Module-Level Initialization**: `AudioRecorderPlayer` was being instantiated at the module level (when the file loaded), causing a crash if the native module wasn't ready yet
2. **Missing Buffer Polyfill**: The `buffer` package wasn't polyfilled globally for React Native
3. **No Error Handling**: The screen had no error boundary to catch initialization failures

## Fixes Implemented

### 1. Lazy Initialization (`modules/voice/services/geminiService.ts`)
```typescript
// Before: Crashed at module load
const audioRecorderPlayer = new AudioRecorderPlayer();

// After: Lazy initialization
let audioRecorderPlayer: AudioRecorderPlayer | null = null;

function getAudioRecorderPlayer(): AudioRecorderPlayer {
  if (!audioRecorderPlayer) {
    try {
      audioRecorderPlayer = new AudioRecorderPlayer();
    } catch (error) {
      console.error('Failed to initialize AudioRecorderPlayer:', error);
      throw new Error('Audio recording is not available on this device');
    }
  }
  return audioRecorderPlayer;
}
```

### 2. Buffer Polyfill (`app/_layout.tsx`)
```typescript
import { Buffer } from 'buffer';

// Polyfill Buffer for React Native
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}
```

### 3. Error Handling (`app/(tabs)/voice.tsx`)
```typescript
export default function VoiceAgentScreen() {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  let hookData;
  try {
    hookData = useLiveSupport();
  } catch (error: any) {
    // Show friendly error screen instead of crashing
    if (!hasError) {
      setHasError(true);
      setErrorMessage(error.message || 'Failed to initialize Voice Agent');
    }
    hookData = { /* fallback values */ };
  }

  if (hasError) {
    return <ErrorScreen message={errorMessage} />;
  }

  // ... normal render
}
```

## Testing
1. **Navigate to Voice tab** - Should load without crashing
2. **Click the mic button** - Should request permissions and start recording
3. **If Gemini API key is missing** - Should show friendly error message instead of crashing

## Requirements
- Gemini API key must be configured in `app.json` or `app.config.js`:
  ```json
  {
    "expo": {
      "extra": {
        "geminiApiKey": "YOUR_API_KEY_HERE"
      }
    }
  }
  ```

## Files Modified
- ✅ `modules/voice/services/geminiService.ts` - Lazy initialization + error handling
- ✅ `app/(tabs)/voice.tsx` - Error boundary
- ✅ `app/_layout.tsx` - Buffer polyfill

