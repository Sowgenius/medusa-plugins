import type { SentryPluginOptions } from "./types"

/**
 * Loads and merges configuration from environment variables and options
 */
export default async function loadConfig(options: Record<string, any> = {}): Promise<SentryPluginOptions> {
  return {
    dsn: process.env.SENTRY_DSN || options.dsn,
    environment: process.env.SENTRY_ENVIRONMENT || options.environment || process.env.NODE_ENV,
    enableTracing: process.env.SENTRY_ENABLE_TRACING !== undefined 
      ? process.env.SENTRY_ENABLE_TRACING === "true"
      : options.enableTracing ?? true,
    tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE !== undefined
      ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE)
      : options.tracesSampleRate ?? 1.0,
    profilesSampleRate: process.env.SENTRY_PROFILES_SAMPLE_RATE !== undefined
      ? parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE)
      : options.profilesSampleRate ?? 1.0,
    debug: process.env.SENTRY_DEBUG === "true" || options.debug === true,
    serverName: process.env.SENTRY_SERVER_NAME || options.serverName,
    release: process.env.SENTRY_RELEASE || options.release,
    ...options,
  }
}
