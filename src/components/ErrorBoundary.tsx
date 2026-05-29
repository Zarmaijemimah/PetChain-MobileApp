import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';

// ---------------------------------------------------------------------------
// PII scrubbing — strip names, emails, phone numbers, addresses before
// sending any string to Sentry so we never leak user data.
// ---------------------------------------------------------------------------
const PII_PATTERNS: Array<[RegExp, string]> = [
  // email
  [/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '[email]'],
  // phone (E.164 and common formats)
  [/\+?[\d][\d\s\-().]{6,14}\d/g, '[phone]'],
  // common "name: value" patterns
  [/(name|address|street|city|zip|postal)[^\w].*?(?=[,\n}]|$)/gi, '[pii]'],
];

export function scrubPII(value: string): string {
  let result = value;
  for (const [pattern, replacement] of PII_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Sentry integration — imported lazily so the app still works if Sentry
// is not yet installed (e.g. during local dev without the native module).
// ---------------------------------------------------------------------------
let SentryModule: typeof import('@sentry/react-native') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SentryModule = require('@sentry/react-native');
} catch {
  // Sentry not available — errors will still be caught, just not reported
}

function captureToSentry(
  error: Error,
  context: ErrorBoundaryContext,
  errorInfo: ErrorInfo
): void {
  if (!SentryModule) return;

  SentryModule.withScope((scope) => {
    // Attach structured context — no PII
    scope.setTag('screen', context.screenName);
    if (context.petId) scope.setTag('pet_id', context.petId);
    if (context.userId) scope.setTag('user_id', context.userId);

    scope.setContext('component_stack', {
      stack: scrubPII(errorInfo.componentStack ?? ''),
    });

    // Breadcrumb so we know which screen crashed
    SentryModule!.addBreadcrumb({
      category: 'error_boundary',
      message: scrubPII(`Crash on screen: ${context.screenName}`),
      level: 'error',
      data: {
        petId: context.petId ?? null,
        userId: context.userId ?? null,
      },
    });

    SentryModule!.captureException(error);
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ErrorBoundaryContext {
  screenName: string;
  petId?: string;
  userId?: string;
}

interface Props {
  children: ReactNode;
  context: ErrorBoundaryContext;
  /** Optional custom fallback — receives a retry callback */
  fallback?: (onRetry: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// ---------------------------------------------------------------------------
// ErrorBoundary component
// ---------------------------------------------------------------------------
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    captureToSentry(error, this.props.context, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(this.handleRetry);
    }

    return (
      <DefaultFallback
        screenName={this.props.context.screenName}
        onRetry={this.handleRetry}
      />
    );
  }
}

// ---------------------------------------------------------------------------
// Default fallback UI
// ---------------------------------------------------------------------------
interface FallbackProps {
  screenName: string;
  onRetry: () => void;
}

function DefaultFallback({ screenName, onRetry }: FallbackProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      accessible
      accessibilityLabel="Error screen"
    >
      <Text style={styles.emoji} accessibilityElementsHidden>
        🐾
      </Text>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.subtitle}>
        An unexpected error occurred on the {screenName} screen. Our team has
        been notified.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Report and retry"
      >
        <Text style={styles.buttonText}>Report &amp; Retry</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default ErrorBoundary;
