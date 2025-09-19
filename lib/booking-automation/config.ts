// Configuration for booking automation
export const AUTOMATION_CONFIG = {
  // Use real automation only in production or when explicitly enabled
  useRealSearch: process.env.USE_REAL_BOOKING_SEARCH === 'true' || process.env.NODE_ENV === 'production',

  // Browser configuration
  headless: process.env.NODE_ENV === 'production', // headless in production, visible in development

  // Timeouts (in milliseconds)
  pageTimeout: 30000,
  searchTimeout: 20 * 60 * 1000, // 20 minutes for thorough search

  // Limits
  maxPropertiesPerSite: 8,
  maxTotalProperties: 16,

  // Delays for human-like behavior
  minActionDelay: 1000,
  maxActionDelay: 3000,
  evaluationDelay: 2000,
};