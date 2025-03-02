import SentryService from './services/sentry';
import apiLoader from './api';
import loader from './loaders';

export default {
  loaders: [loader],
  services: [SentryService],
  routers: [{ router: apiLoader, service: SentryService.RESOLVE_KEY }],
};
