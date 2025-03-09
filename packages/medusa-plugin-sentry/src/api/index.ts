import express, { Router } from 'express';
import cors from 'cors';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
// Update middleware import paths
import { authenticate } from '@medusajs/medusa';
// Use modern LoaderOptions approach for v2
import { LoaderOptions } from '@medusajs/medusa';

import { SentryOptions, SentryWebHookOptions } from '../types';
import sentryTransactionsHandler from './handlers/sentry-transaction';
import sentryTransactionEventsHandler from './handlers/sentry-transaction-events';
import sentryTransactionsStatsHandler from './handlers/sentry-transactions-stats';
import sentryWebHookHandler from './handlers/sentry-web-hook';

export default function (options: LoaderOptions): Router {
  const router = Router();
  const { configModule } = options;
  const pluginOptions: SentryOptions = options.options;

  const {
    integrations,
    requestHandlerOptions = {},
    enableTracing = true,
    enableRequestHandler = true,
    webHookOptions,
    apiToken,
    environment,
    ...sentryOptions
  } = pluginOptions;

  Sentry.init({
    ...sentryOptions,
    integrations: Array.isArray(integrations) 
      ? integrations 
      : integrations(router, Sentry, Tracing),
  });

  if (enableRequestHandler) {
    router.use(Sentry.Handlers.requestHandler(requestHandlerOptions));
  }

  if (enableTracing) {
    router.use(Sentry.Handlers.tracingHandler());
  }

  //attachSentryErrorHandler();
  router.use(Sentry.Handlers.erroHandler({
    shouldHandleError: () => true,
  }));

  //Attach routes 
  if (webHookOptions) {
    attachSentryWebHook(router, webHookOptions);
  }

  if (apiToken) {
    attachAdminEndPoints(router, options, pluginOptions);
  }

  return router;
}

/**
 * Attach the sentry error handler in the medusa core
 */
function attachSentryErrorHandler() {
  // V2 might handle this differently, consider integrating with built-in
  // error handling middleware instead of monkey-patching
  try {
    const { errorHandler } = require('@medusajs/medusa');
    const originalErrorHandler = errorHandler;
    // Replace with proper middleware extension
    errorHandler = () => {
      return (err, req, res, next) => {
        Sentry.Handlers.errorHandler({
          shouldHandleError: () => true,
        })(err, req, res, () => void 0);
        originalErrorHandler()(err, req, res, next);
      };
    };
  } catch (error) {
    console.warn("Could not attach Sentry error handler to Medusa error middleware");
  }
}

/**
 * Attach sentry web hook
 * @param router
 * @param webHookOptions
 */
function attachSentryWebHook(router: Router, webHookOptions: SentryWebHookOptions): void {
  router.post(
    '/admin' + webHookOptions.path,
    express.json(),
    express.urlencoded({ extended: true }),
    sentryWebHookHandler(webHookOptions)
  );
}

/**
 * Attach specific sentry end point to fetch data under the admin domain
 * @param router
 * @param options
 * @param pluginOptions
 */
function attachAdminEndPoints(router, options: LoaderOptions, pluginOptions) {
  const { apiToken } = pluginOptions;
  const { configModule } = options;
  
  // Get CORS settings from configuration
  const adminCors = configModule?.projectConfig?.admin_cors || "localhost:7000,localhost:7001";

  const corsOptions = {
    origin: adminCors.split(','),
    credentials: true,
  };

  router.use('/admin/sentry-transactions', cors(corsOptions));
  router.get('/admin/sentry-transactions', authenticate(), sentryTransactionsHandler(apiToken));

  router.use('/admin/sentry-transactions-stats', cors(corsOptions));
  router.get(
    '/admin/sentry-transactions-stats',
    authenticate(),
    sentryTransactionsStatsHandler(apiToken)
  );

  router.use('/admin/sentry-transaction-events', cors(corsOptions));
  router.get(
    '/admin/sentry-transaction-events',
    authenticate(),
    sentryTransactionEventsHandler(apiToken)
  );

