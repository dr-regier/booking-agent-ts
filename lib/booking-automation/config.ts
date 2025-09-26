// Configuration for booking automation
export const AUTOMATION_CONFIG = {
  // Use real API search only when explicitly enabled
  useRealSearch: process.env.USE_REAL_BOOKING_SEARCH === 'true',

  // API configuration
  apiTimeout: 30000, // 30 seconds for API requests
  searchTimeout: 10 * 60 * 1000, // 10 minutes for complete search process

  // Result limits
  maxPropertiesPerSearch: 8,
  maxTotalProperties: 16,

  // AI evaluation settings
  evaluationTimeout: 60000, // 60 seconds per property evaluation
  maxEvaluationRetries: 2,
};