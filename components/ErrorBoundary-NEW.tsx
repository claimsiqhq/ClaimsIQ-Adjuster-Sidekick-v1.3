// Enhanced Error Boundary with Sentry integration
// Replace the existing ErrorBoundary.tsx with this file

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { colors } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Update state
    this.setState({
      error,
      errorInfo,
    });

    // Report to Sentry
    Sentry.withScope((scope) => {
      scope.setContext('errorInfo', {
        componentStack: errorInfo.componentStack,
      });
      Sentry.captureException(error);
    });

    // Log to console in development
    if (__DEV__) {
      console.error('Error caught by boundary:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error!}
            resetError={this.resetError}
          />
        );
      }

      // Default fallback UI
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Ionicons name="warning-outline" size={64} color={colors.error} />

            <Text style={styles.title}>Something went wrong</Text>

            <Text style={styles.message}>
              {this.state.error?.message ||
                'An unexpected error occurred. The error has been reported.'}
            </Text>

            {__DEV__ && this.state.errorInfo && (
              <ScrollView style={styles.stackContainer}>
                <Text style={styles.stackTitle}>Error Details (DEV):</Text>
                <Text style={styles.stackTrace}>
                  {this.state.error?.stack}
                </Text>
                <Text style={styles.stackTitle}>Component Stack:</Text>
                <Text style={styles.stackTrace}>
                  {this.state.errorInfo.componentStack}
                </Text>
              </ScrollView>
            )}

            <Pressable style={styles.button} onPress={this.resetError}>
              <Text style={styles.buttonText}>Try Again</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.secondaryButton]}
              onPress={() => {
                // Report to Sentry again (user-initiated)
                Sentry.showReportDialog({
                  eventId: Sentry.lastEventId(),
                });
              }}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Report Issue
              </Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// Wrap with Sentry's error boundary for additional tracking
export default Sentry.wrap(ErrorBoundary);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgSoft,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.core,
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  stackContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    maxHeight: 200,
    width: '100%',
  },
  stackTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4ade80',
    marginBottom: 8,
    marginTop: 8,
  },
  stackTrace: {
    fontSize: 11,
    color: '#d1d5db',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    color: colors.primary,
  },
});
