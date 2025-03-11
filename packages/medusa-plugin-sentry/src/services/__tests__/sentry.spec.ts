import axios from 'axios';
import { MockManager } from 'medusa-test-utils';
import SentryService from '../sentry';
import { EventBusService } from '@medusajs/medusa';
import { SentryWebHookEvent } from '../../types';
import * as Sentry from '@sentry/node';

// Mock Sentry methods
jest.mock('@sentry/node', () => ({
	setUser: jest.fn(),
	captureException: jest.fn(),
	captureMessage: jest.fn(),
	setTag: jest.fn(),
	setTags: jest.fn(),
	setContext: jest.fn(),
}));

describe('SentryService', () => {
	let axiosGetSpy;
	let sentryService;

	// Updated EventBusService mock for Medusa v2
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
			emitOnIssue: true,
			emitOnComment: true,
			emitOnEventOrMetricAlert: true,
			emitOnInstallOrDeleted: true,
		},
		environment: 'test',
	};

	beforeAll(() => {
		// Updated axios mock approach
		axiosGetSpy = jest.spyOn(axios, 'get').mockImplementation(() =>
			Promise.resolve({
				data: { data: [], meta: {} },
				headers: { link: 'results="true";cursor="0:100:0"' },
			})
		);

		// Initialize SentryService with the updated constructor pattern
		sentryService = new SentryService(
			{
				manager: MockManager,
				eventBusService: eventBusServiceMock,
				// Add container mock for Medusa v2
				container: {
					resolve: jest.fn((key) => {
						if (key === 'eventBusService') return eventBusServiceMock;
						return null;
					}),
				},
			},
			config
		);
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
		axiosGetSpy.mockRejectedValueOnce(new Error('Network error'));
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

	// Additional tests for new functionality
	it('should fetch transaction statistics from Sentry', async () => {
		const res = await sentryService.fetchTransactionsStats({
			organisation: 'org',
			project: 'pro',
			statsPeriod: '24h',
			token: config.apiToken,
			transaction: 'test-transaction',
		});

		expect(axiosGetSpy).toHaveBeenCalledTimes(1);
		expect(axiosGetSpy).toHaveBeenCalledWith(expect.stringContaining('/events-stats/'), expect.any(Object));
		expect(res).toEqual({ data: [], meta: {} });
	});

	it('should handle error webhook events', async () => {
		const data = { actor: {}, action: {}, data: {}, installation: {} };
		await sentryService.handleErrors(data);
		expect(eventBusServiceMock.emit).toHaveBeenCalledWith(SentryWebHookEvent.SENTRY_RECEIVED_ERROR, data);
	});

	it('should handle comments webhook events', async () => {
		const data = { actor: {}, action: {}, data: {}, installation: {} };
		await sentryService.handleComments(data);
		expect(eventBusServiceMock.emit).toHaveBeenCalledWith(SentryWebHookEvent.SENTRY_RECEIVED_COMMENT, data);
	});

	it('should handle alerts webhook events', async () => {
		const data = { actor: {}, action: {}, data: {}, installation: {} };
		await sentryService.handleAlerts(data);
		expect(eventBusServiceMock.emit).toHaveBeenCalledWith(
			SentryWebHookEvent.SENTRY_RECEIVED_EVENT_OR_METRIC_ALERT,
			data
		);
	});

	it('should handle installation webhook events', async () => {
		const data = { actor: {}, action: {}, data: {}, installation: {} };
		await sentryService.handleInstallation(data);
		expect(eventBusServiceMock.emit).toHaveBeenCalledWith(
			SentryWebHookEvent.SENTRY_RECEIVED_INSTALL_OR_DELETED,
			data
		);
	});

	// Test for user context functionality (to be implemented)
	it('should set user context in Sentry', async () => {
		// Add this method to SentryService
		sentryService.setUserContext('user-123', 'user@example.com');

		expect(Sentry.setUser).toHaveBeenCalledWith({
			id: 'user-123',
			email: 'user@example.com',
		});
	});

	// Test error filters (to be implemented)
	it('should use error filters when configured', async () => {
		// Setup a custom service with error filters
		const serviceWithFilters = new SentryService(
			{
				manager: MockManager,
				eventBusService: eventBusServiceMock,
				container: {
					resolve: jest.fn(() => eventBusServiceMock),
				},
			},
			{
				...config,
				errorFilters: {
					ignoredErrors: ['Ignored error'],
					ignoreStatusCodes: [404, 422],
				},
			}
		);

		// Test that the filters are properly applied
		// This would require implementing shouldCaptureError or similar method
		// in the SentryService class
		expect(serviceWithFilters.shouldCaptureError(new Error('Ignored error'))).toBe(false);
		expect(serviceWithFilters.shouldCaptureError(new Error('Critical error'))).toBe(true);
	});
});
