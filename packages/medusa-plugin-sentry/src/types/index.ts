import { NodeOptions } from '@sentry/node/types/types';
import { Router } from 'express';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { RequestHandlerOptions } from '@sentry/node/types/handlers';
import { Integration } from '@sentry/types/types-ts3.8/integration';

// Improve type safety by replacing "unknown" with more specific types
export type SentryWebHookOptions = {
  path: string;
  secret: string;
  emitOnIssue?: boolean | ((container: Record<string, any>, data: SentryWebHookData) => Promise<void>);
  emitOnError?: boolean | ((container: Record<string, any>, data: SentryWebHookData) => Promise<void>);
  emitOnComment?: boolean | ((container: Record<string, any>, data: SentryWebHookData) => Promise<void>);
  emitOnEventOrMetricAlert?: boolean | ((container: Record<string, any>, data: SentryWebHookData) => Promise<void>);
  emitOnInstallOrDeleted?: boolean | ((container: Record<string, any>, data: SentryWebHookData) => Promise<void>);
};

export type SentryOptions = Omit<NodeOptions, 'integrations'> & {
  integrations: Integration[] | ((router: Router, sentry: typeof Sentry, tracing: typeof Tracing) => Integration[]);
  apiToken?: string;
  requestHandlerOptions?: RequestHandlerOptions;
  enableRequestHandler?: boolean;
  enableTracing?: boolean;
  webHookOptions?: SentryWebHookOptions;
  environment?: string;
};

export enum SentryWebHookEvent {
  SENTRY_RECEIVED_ISSUE = 'SentryReceivedIssue',
  SENTRY_RECEIVED_ERROR = 'SentryReceivedError',
  SENTRY_RECEIVED_COMMENT = 'SentryReceivedComment',
  SENTRY_RECEIVED_EVENT_OR_METRIC_ALERT = 'SentryReceivedEventOrMetricAlert',
  SENTRY_RECEIVED_INSTALL_OR_DELETED = 'SentryReceivedInstallOrDeleted',
}

// Improve webhook data typing
export type SentryWebHookData = {
  actor: {
    id: string;
    name?: string;
    type?: string;
    [key: string]: any;
  };
  action: string;
  data: {
    [key: string]: any;
  };
  installation: {
    uuid: string;
    [key: string]: any;
  };
};

export type SentryFetchResult = {
  data: Record<string, string>[];
  meta: Record<string, any>;
  prev_cursor: string;
  next_cursor: string;
};

export type SentryStatsFetchResult = {
  [stat: string]: {
    data: [number, [{ count: number }]][];
  };
};
