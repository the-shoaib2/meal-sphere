/**
 * Centralized React Query keys for the Meal Sphere application.
 * Using constants ensures consistency and prevents typos in query invalidation.
 */

export const QUERY_KEYS = {
  // Groups
  GROUPS: 'groups',
  GROUP_DETAILS: 'group',
  GROUP_STATS: 'group-stats',
  USER_GROUPS: 'user-groups',
  JOIN_REQUESTS: 'join-requests',
  JOIN_REQUEST_STATUS: 'join-request-status',
  GROUP_MEMBERS: 'group-members',
  GROUP_ACTIVITIES: 'group-activities',
  GROUP_ACCESS: 'group-access',
  GROUP_BALANCES: 'group-balances',

  // Analytics & Stats
  USER_STATS: 'user-stats',

  // Voting
  VOTES: 'votes',

  // Meals
  MEALS_SYSTEM: 'meals-system',
  MEAL_CONFIG: 'meal-config',
  USER_MEAL_STATS: 'user-meal-stats',
  
  // Periods
  PERIODS: 'periods',
  CURRENT_PERIOD: 'current-period',
  PERIOD_DETAILS: 'period-details',

  // User
  USER_PROFILE: 'user-profile',
  USER_BALANCE: 'user-balance',
  NOTIFICATIONS: 'notifications',

  // Shopping & Expenses
  SHOPPING_LIST: 'shopping-list',
  SHOPPING_ITEMS: 'shopping-items',
  EXTRA_EXPENSES: 'extra-expenses',
  
  // Billing & Calculations
  CALCULATIONS: 'calculations',
  PAYMENTS: 'payments',
  ACCOUNT_BALANCES: 'account-balances',
} as const;
