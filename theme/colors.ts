// theme/colors.ts
// Centralized color palette for the Claims iQ Sidekick app

export const colors = {
  // Core brand colors (Purple & Pink theme)
  primary: '#7C3AED',      // Purple - primary actions, buttons, highlights
  secondary: '#EC4899',    // Pink - secondary actions, accents
  gold: '#FBBF24',         // Gold/Amber - highlights, warnings
  
  // Text colors
  core: '#2B2F36',         // Main text color (dark gray)
  textLight: '#6B7280',    // Light text (gray) - labels, subtitles
  textMuted: '#9CA3AF',    // Muted text - placeholders, disabled
  
  // Background colors
  bgSoft: '#F5F3F7',       // Soft background (light purple tint)
  bgAlt: '#E5E7EB',        // Alternative background (gray)
  white: '#FFFFFF',        // White - cards, inputs
  black: '#000000',        // Black - overlays, dark UI
  darkBg: '#1A1A1A',       // Dark background - AR views
  
  // UI elements
  line: '#E5E7EB',         // Border/divider lines
  light: '#F1EEFF',        // Light purple tint for badges/highlights
  sand: '#FEF3C7',         // Sand/yellow tint for warning states
  
  // Semantic/Status colors
  success: '#10B981',      // Green - success states, completed
  error: '#EF4444',        // Red - errors, dangerous actions
  warning: '#F59E0B',      // Orange - warnings, caution
  info: '#3B82F6',         // Blue - informational
  
  // Semantic backgrounds
  successBg: '#D1FAE5',    // Light green background
  errorBg: '#FEE2E2',      // Light red background
  warningBg: '#FEF3C7',    // Light yellow background
  infoBg: '#DBEAFE',       // Light blue background
  
  // Aliases for expert's code compatibility
  bg: '#F5F3F7',          // Alias for bgSoft
  border: '#E5E7EB',      // Alias for line
  text: '#2B2F36',        // Alias for core
  textSoft: '#6B7280',    // Alias for textLight
} as const;

export type ColorKey = keyof typeof colors;

