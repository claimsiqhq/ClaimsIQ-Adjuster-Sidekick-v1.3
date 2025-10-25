// Consistent spacing system for ClaimsIQ
// Use these values for margin, padding, gaps throughout the app

export const spacing = {
  // Base spacing unit (4px)
  unit: 4,

  // Common spacing values
  xs: 4,     // 4px
  sm: 8,     // 8px
  md: 12,    // 12px
  lg: 16,    // 16px
  xl: 20,    // 20px
  xxl: 24,   // 24px
  xxxl: 32,  // 32px

  // Specific use cases
  screenPadding: 16,
  cardPadding: 16,
  sectionPadding: 20,
  listItemPadding: 12,
  buttonPadding: 14,
  inputPadding: 12,

  // Vertical spacing
  sectionGap: 20,
  listGap: 8,
  formGap: 16,

  // Safe areas
  headerHeight: 60,
  tabBarHeight: 60,
  bottomSafe: 34, // iPhone notch
} as const;

export type SpacingKey = keyof typeof spacing;
