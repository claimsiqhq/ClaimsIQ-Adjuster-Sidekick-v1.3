# Environment Variables Setup

## Required Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_API_KEY=your-anon-key-here

# Development Credentials (optional - for auto-fill in dev mode)
EXPO_PUBLIC_DEV_EMAIL=dev@example.com
EXPO_PUBLIC_DEV_PASSWORD=devpassword123
```

## Supabase Edge Functions Secrets

Set these in the Supabase dashboard under **Functions > Secrets**:

```bash
OPENAI_API_KEY=sk-...
```

## Notes

- Never commit the `.env` file to version control
- The `.env` file is already in `.gitignore`
- All Expo public variables must be prefixed with `EXPO_PUBLIC_`
- Restart the dev server after changing environment variables

