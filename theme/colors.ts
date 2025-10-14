// theme/colors.ts
// Centralized color palette for the Claims iQ Sidekick app

export const colors = {
  // Core brand colors
  primary: '#7C3AED',      // Purple - primary actions
  secondary: '#EC4899',    // Pink - secondary actions
  gold: '#FBBF24',         // Gold/Amber - highlights
  
  // Text colors
  core: '#2B2F36',         // Main text color (dark gray)
  
  // Background colors
  bgSoft: '#F5F3F7',       // Soft background (light purple tint)
  bgAlt: '#E5E7EB',        // Alternative background (gray)
  white: '#FFFFFF',        // White
  
  // UI elements
  line: '#E5E7EB',         // Border/divider lines
  light: '#F1EEFF',        // Light purple tint for badges/highlights
  sand: '#FEF3C7',         // Sand/yellow tint for warning states
} as const;

export type ColorKey = keyof typeof colors;

