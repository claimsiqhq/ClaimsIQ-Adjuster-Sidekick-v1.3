import { Alert } from 'react-native';

/**
 * A centralized error handling function.
 * @param error The error object caught in a try/catch block.
 * @param userMessage A user-friendly message to display in an Alert.
 */
export function handleAppError(error: any, userMessage: string = 'An unexpected error occurred.') {
  // Log the detailed error for developers
  console.error('[Error Service]:', error);

  // Show a simple, clean alert to the user
  Alert.alert('Error', userMessage);
}