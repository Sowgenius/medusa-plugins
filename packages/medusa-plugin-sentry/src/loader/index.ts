import { AwilixContainer } from 'awilix';
import { Logger } from '@medusajs/medusa';
import { SentryOptions } from '../types';

export default async (
  container: AwilixContainer,
  config: SentryOptions,
  options
): Promise<void> => {
  const logger: Logger = container.resolve('logger');
  
  try {
    logger.info("Initializing Sentry plugin...");
    
    // Register our service with the container
    // No need to manually register in v2 - decorators handle it
    
    logger.info("Sentry plugin initialized");
  } catch (error) {
    logger.error("Failed to initialize Sentry plugin");
    logger.error(error);
  }
};
