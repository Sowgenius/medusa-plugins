import SentryService from "./services/sentry"
import loadConfig from "./config"
import type { PluginOptions } from "@medusajs/medusa"
import type { Express, Request, Response, NextFunction } from "express"

/**
 * @param {Object} options - options defined in `medusa-config.js`
 *                           or environment variables
 * @param {MedusaContainer} container - the Medusa container
 * @param {Express} app - the Express app
 * @return {void}
 */
export default async (
  options: PluginOptions,
  container: any,
  app: Express
): Promise<void> => {
  // Merge config with environment variables
  const configuredOptions = await loadConfig(options)
  
  // Register Sentry Service
  container.registerAdd("sentryService", () => {
    return new SentryService(container, configuredOptions)
  })

  // Optionally add middleware
  if (options.captureHttpTraffic !== false) {
    const sentry = container.resolve("sentryService")
    
    // Request handler must be the first middleware
    app.use(sentry.getRequestHandler())
    
    // Error handler must be before any other error middleware
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      sentry.captureException(err)
      next(err)
    })
  }
}
