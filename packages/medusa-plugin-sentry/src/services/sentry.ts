import { EventBusService, TransactionBaseService, Service } from '@medusajs/medusa';
import axios from 'axios';
import { EntityManager } from 'typeorm';
import { MedusaContainer } from '@medusajs/types';
import {
  SentryFetchResult,
  SentryOptions,
  SentryStatsFetchResult,
  SentryWebHookData,
  SentryWebHookEvent,
} from '../types';
import { isFunction } from '../utils';

/**
 * Service for integrating Sentry error and performance monitoring into MedusaJS.
 * Documentation:
 * - MedusaJS Services: https://docs.medusajs.com/development/fundamentals/services
 * - Sentry API: https://docs.sentry.io/api/
 */
type InjectedDeps = {
  manager: EntityManager;
  eventBusService: EventBusService;
  container: MedusaContainer;
};

@Service()
export default class SentryService extends TransactionBaseService {
  //replace with v2 service identifier pattern 
  static readonly RESOLVE_KEY = 'SentryService';
  protected readonly sentryApiBaseUrl = 'https://sentry.io/api/0/organizations';

  //protected manager_: EntityManager;
  //protected transactionManager_: EntityManager | undefined;
  protected readonly config_: SentryOptions;
  protected readonly eventBusService_: EventBusService;
  //protected readonly container_: MedusaContainer;

  /*constructor({ manager, eventBusService, container }: InjectedDeps, config: SentryOptions) {
    super(arguments[0]);
    this.manager_ = manager;
    this.config_ = config;
    this.eventBusService_ = eventBusService;
    this.container_ = container;
  }*/ 
  constructor({ manager, eventBusService, container }: InjectedDeps, config: SentryOptions) {
    super(manager);
    this.config_ = config;
    this.eventBusService_ = eventBusService;
  }

  /**
   * Fetches paginated transaction data from Sentry for a specific project.
   * @param organisation The Sentry organization name.
   * @param project The project name.
   * @param query Filter query (see Sentry docs).
   * @param statsPeriod The period to fetch data for (default: 24h).
   * @param perPage Number of transactions per page.
   * @param token API token for authentication.
   * @param cursor Cursor for pagination.
   */
  async fetchTransactions({
    organisation,
    project,
    query,
    statsPeriod,
    perPage,
    token,
    cursor,
  }: {
    organisation: string;
    project: string;
    token: string;
    query?: string;
    statsPeriod?: string;
    perPage?: string | number;
    cursor?: string;
  }): Promise<SentryFetchResult> {
    perPage = Math.min(Number(perPage ?? 100), 100);
    const queryParams = {
      field: ['transaction', 'tpm()', 'p50()', 'p75()', 'p95()', 'failure_rate', 'apdex()'],
      per_page: perPage,
      project,
      query: `event.type:transaction${query ? ' AND ' + query : ''}`,
      statsPeriod,
      sort: '-transaction',
      cursor,
    };
    return await this.fetchSentryData({ organisation, token, perPage, queryParams });
  }

  /**
   * Fetches transaction event details from Sentry.
   * @param transaction Specific transaction name.
   * @param organisation The Sentry organization.
   * @param project The project name.
   * @param query Optional filter query.
   * @param statsPeriod The period to fetch data for.
   * @param perPage Number of results per page.
   * @param token API token for authentication.
   * @param cursor Cursor for pagination.
   */
  async fetchTransactionEvents({
    transaction,
    organisation,
    project,
    query,
    statsPeriod,
    perPage,
    token,
    cursor,
  }: {
    transaction: string;
    organisation: string;
    project: string;
    token: string;
    query?: string;
    statsPeriod?: string;
    perPage?: string | number;
    cursor?: string;
  }): Promise<SentryFetchResult> {
    perPage = Math.min(Number(perPage ?? 100), 100);
    const queryParams = {
      field: ['id', 'transaction.duration', 'timestamp', 'spans.db', 'project'],
      per_page: perPage,
      project,
      query: `event.type:transaction AND transaction:"${transaction}"${query ? ' AND ' + query : ''}`,
      statsPeriod,
      sort: '-timestamp',
      cursor,
    };
    return await this.fetchSentryData({ organisation, token, perPage, queryParams });
  }

  /**
   * Handles issue-related webhooks from Sentry and emits Medusa events.
   * @param data Webhook payload from Sentry.
   *This method is responsible for handling Sentry webhooks and emitting Medusa events using proper trasnsaction management for v2 
   */
  async handleIssues(data: SentryWebHookData): Promise<void> {
    return this.atomicPhase_(async (transactionManager) => {
      if (isFunction(this.config_.webHookOptions.emitOnIssue)) {
        return await this.config_.webHookOptions.emitOnIssue(this.container_, data);
      }
      await this.eventBusService_
      .withTransaction(transactionManager)
      .emit(SentryWebHookEvent.SENTRY_RECEIVED_ISSUE, data);
    });
  }

  /**
   * Fetches data from the Sentry API.
   * @param organisation The Sentry organization.
   * @param token API authentication token.
   * @param queryParams Query parameters for filtering.
   * @param customTargetPathSegment (Optional) Custom API endpoint.
   */
  async fetchSentry<Tdata = unknown>({
    organisation,
    token,
    queryParams,
    customTargetPathSegment,
  }: {
    organisation: string;
    token: string;
    queryParams: Record<string, string | number | string[]>;
    customTargetPathSegment?: string;
  }): Promise<Tdata> {
    const url = `${this.sentryApiBaseUrl}/${organisation}/${customTargetPathSegment ?? 'events/'}`;
    const searchParams = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((val) => searchParams.append(key, val));
      } else {
        value && searchParams.append(key, value.toString());
      }
    });
    const { data } = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      params: searchParams,
    });
    return data as Tdata;
  }
}

