// Centralized error tracking with Sentry integration
// Replaces all console.error calls with structured error reporting

import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';
import { useUI } from '@/store/useAppStore';

// ==================== CONFIGURATION ====================

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const ENV = process.env.EXPO_PUBLIC_ENV || 'development';

// Initialize Sentry
export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENV,
    enabled: ENV !== 'development',  // Disable in dev to avoid noise

    // Performance monitoring
    tracesSampleRate: ENV === 'production' ? 0.2 : 1.0,

    // Release versioning
    release: `claimsiq@${require('../../package.json').version}`,
    dist: Platform.OS,

    // Native crash reporting
    enableNative: true,
    enableNativeCrashHandling: true,

    // Auto session tracking
    enableAutoSessionTracking: true,

    // Performance integrations
    integrations: [
      new Sentry.ReactNativeTracing({
        tracingOrigins: ['localhost', 'supabase.co', /^\//],
        routingInstrumentation: new Sentry.ReactNavigationInstrumentation(),
      }),
    ],

    // Before send hook - sanitize sensitive data
    beforeSend(event) {
      // Remove sensitive data from breadcrumbs and context
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.data) {
            delete breadcrumb.data.password;
            delete breadcrumb.data.apiKey;
            delete breadcrumb.data.token;
          }
          return breadcrumb;
        });
      }

      return event;
    },
  });
}

// ==================== ERROR TRACKING FUNCTIONS ====================

export interface ErrorContext {
  screen?: string;
  action?: string;
  claimId?: string;
  userId?: string;
  [key: string]: any;
}

/**
 * Capture and report an error to Sentry
 */
export function captureError(
  error: Error | string,
  context?: ErrorContext,
  level: Sentry.SeverityLevel = 'error'
) {
  const errorObj = typeof error === 'string' ? new Error(error) : error;

  // Add to UI error stack
  try {
    const { addError } = useUI.getState();
    addError({
      id: Date.now().toString(),
      message: errorObj.message,
      code: (errorObj as any).code,
      stack: errorObj.stack,
      timestamp: new Date().toISOString(),
      context,
    });
  } catch (e) {
    console.warn('Failed to add error to UI state', e);
  }

  // Send to Sentry
  Sentry.withScope((scope) => {
    scope.setLevel(level);

    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, { value });
      });
    }

    Sentry.captureException(errorObj);
  });

  // Log to console in development
  if (__DEV__) {
    console.error('[Error]', errorObj.message, context);
  }
}

/**
 * Capture a message (non-error event)
 */
export function captureMessage(
  message: string,
  context?: ErrorContext,
  level: Sentry.SeverityLevel = 'info'
) {
  Sentry.withScope((scope) => {
    scope.setLevel(level);

    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, { value });
      });
    }

    Sentry.captureMessage(message);
  });

  if (__DEV__) {
    console.log(`[${level}]`, message, context);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set user context for error reports
 */
export function setUser(userId: string | null, email?: string, extra?: Record<string, any>) {
  if (userId) {
    Sentry.setUser({
      id: userId,
      email,
      ...extra,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Set tag for filtering errors
 */
export function setTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

/**
 * Start a performance transaction
 */
export function startTransaction(name: string, operation: string) {
  return Sentry.startTransaction({
    name,
    op: operation,
  });
}

/**
 * Track screen navigation
 */
export function trackScreen(screenName: string) {
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `Navigated to ${screenName}`,
    level: 'info',
  });
}

// ==================== SPECIFIC ERROR HANDLERS ====================

/**
 * Handle network errors
 */
export function captureNetworkError(error: Error, url: string, method: string) {
  captureError(error, {
    screen: 'Network',
    action: 'API Call',
    url,
    method,
  }, 'warning');
}

/**
 * Handle database errors
 */
export function captureDatabaseError(error: Error, table: string, operation: string) {
  captureError(error, {
    screen: 'Database',
    action: operation,
    table,
  }, 'error');
}

/**
 * Handle authentication errors
 */
export function captureAuthError(error: Error, action: string) {
  captureError(error, {
    screen: 'Auth',
    action,
  }, 'warning');
}

/**
 * Handle edge function errors
 */
export function captureEdgeFunctionError(
  error: Error,
  functionName: string,
  payload?: any
) {
  captureError(error, {
    screen: 'Edge Function',
    action: functionName,
    payload: JSON.stringify(payload),
  }, 'error');
}

// ==================== WRAP ASYNC FUNCTIONS ====================

/**
 * Wraps an async function to automatically capture errors
 */
export function withErrorTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: ErrorContext
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureError(error as Error, context);
      throw error;
    }
  }) as T;
}

// ==================== REPLACE CONSOLE.ERROR ====================

/**
 * Override console.error to capture all errors
 * Call this during app initialization
 */
export function interceptConsoleErrors() {
  const originalError = console.error;

  console.error = (...args: any[]) => {
    // Call original console.error
    originalError.apply(console, args);

    // Capture first argument if it's an Error
    if (args[0] instanceof Error) {
      captureError(args[0], {
        source: 'console.error',
        additionalArgs: args.slice(1),
      });
    } else if (typeof args[0] === 'string') {
      captureMessage(args[0], {
        source: 'console.error',
        additionalArgs: args.slice(1),
      }, 'error');
    }
  };
}

// ==================== PERFORMANCE MONITORING ====================

/**
 * Measure function execution time
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const transaction = startTransaction(name, 'function');

  try {
    const result = await fn();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('unknown_error');
    throw error;
  } finally {
    transaction.finish();
  }
}

// ==================== EXPORTS ====================

export default {
  init: initSentry,
  captureError,
  captureMessage,
  addBreadcrumb,
  setUser,
  setTag,
  trackScreen,
  captureNetworkError,
  captureDatabaseError,
  captureAuthError,
  captureEdgeFunctionError,
  withErrorTracking,
  interceptConsoleErrors,
  measurePerformance,
};
