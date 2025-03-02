import axios from 'axios';
import { MockManager } from 'medusa-test-utils';
import SentryService from '../sentry';
import { EventBusService } from '@medusajs/medusa';
import { SentryWebHookEvent } from '../../types';

describe('SentryService', () => {
  let axiosGetSpy;
  let sentryService;

  const eventBusServiceMock = {
    withTransaction: function () {
      return this;
    },
    emit: jest.fn().mockResolvedValue(undefined),
  } as unknown as EventBusService;

  const config = {
    apiToken: 'fake_api_token',
    dsn: 'fake_dsn',
    integrations: jest.fn(),
    tracesSampleRate: 1.0,
    webHookOptions: {
      path: '/sentry',
      secret: 'fake_secret',
      emitOnError: true,
    },
  };

  beforeAll(() => {
    axiosGetSpy = jest.spyOn(axios, 'get').mockResolvedValue({
      data: { data: [], meta: {} },
      headers: { link: 'results="true";cursor="0:100:0"' },
    });
    sentryService = new SentryService({ manager: MockManager, eventBusService: eventBusServiceMock }, config);
  });

  afterAll(() => {
    axiosGetSpy.mockRestore();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch transactions from Sentry', async () => {
    const res = await sentryService.fetchTransactions({
      organisation: 'org',
      project: 'pro',
      statsPeriod: '24h',
      perPage: 100,
      token: config.apiToken,
      cursor: '',
    });

    expect(axiosGetSpy).toHaveBeenCalledTimes(1);
    expect(axiosGetSpy).toHaveBeenCalledWith(expect.stringContaining('/events/'), expect.any(Object));
    expect(res).toEqual({ data: [], meta: {}, next_cursor: '0:100:0', prev_cursor: undefined });
  });

  it('should handle issues and emit event', async () => {
    const data = { actor: {}, action: {}, data: {}, installation: {} };
    await sentryService.handleIssues(data);
    expect(eventBusServiceMock.emit).toHaveBeenCalledWith(SentryWebHookEvent.SENTRY_RECEIVED_ISSUE, data);
  });

  it('should fetch data from Sentry API', async () => {
    const res = await sentryService.fetchSentry({
      organisation: 'org',
      token: config.apiToken,
      queryParams: { field: ['transaction'], per_page: 50 },
    });

    expect(axiosGetSpy).toHaveBeenCalledTimes(1);
    expect(res).toEqual({ data: [], meta: {} });
  });

  it('should log errors when fetching transactions fails', async () => {
    axiosGetSpy.mockRejectedValue(new Error('Network error'));
    await expect(
      sentryService.fetchTransactions({
        organisation: 'org',
        project: 'pro',
        statsPeriod: '24h',
        perPage: 100,
        token: config.apiToken,
        cursor: '',
      })
    ).rejects.toThrow('Network error');
  });
});

