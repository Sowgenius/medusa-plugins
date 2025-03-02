import { Request, Response } from 'express';
import SentryService from '../../services/sentry';
import { verifySignature } from '../../utils';
import { SentryWebHookOptions } from '../../types';

export default (webHookOptions: SentryWebHookOptions) => {
  return async (req: Request, res: Response) => {
    if (!verifySignature(req, webHookOptions.secret)) {
      return res.sendStatus(401);
    }

    res.status(200);

    // Parse the JSON body fields off of the request
    const { action, data, installation, actor } = req.body;
    const { uuid } = installation || {};

    // Identify the resource triggering the webhook in Sentry
    const resource = req.header('sentry-hook-resource');
    if (!action || !data || !uuid || !resource) {
      return res.sendStatus(400);
    }

    // Update service resolution for v2
    const sentryService: SentryService = req.scope.resolve("sentryService");

    const dataToEmit = {
      actor,
      action,
      data,
      installation,
    };

    // Add try/catch for better error handling
    try {
      // Handle webhooks related to issues
      if (webHookOptions.emitOnIssue && resource === 'issue') {
        await sentryService.handleIssues(dataToEmit);
      }

      // Handle webhooks related to errors
      if (webHookOptions.emitOnError && resource === 'error') {
        await sentryService.handleErrors(dataToEmit);
      }

      // Handle webhooks related to comments
      if (webHookOptions.emitOnComment && resource === 'comment') {
        await sentryService.handleComments(dataToEmit);
      }

      // Handle webhooks related to alerts
      if (webHookOptions.emitOnEventOrMetricAlert && (resource === 'event_alert' || resource === 'metric_alert')) {
        await sentryService.handleAlerts(dataToEmit);
      }

      // Handle uninstallation webhook
      if (webHookOptions.emitOnInstallOrDeleted && resource === 'installation' && action === 'deleted') {
        await sentryService.handleInstallation(dataToEmit);
      }

      res.status(200).send();
    } catch (error) {
      console.error("Error processing Sentry webhook:", error);
      res.status(500).send("Error processing webhook");
    }
  };
};;
