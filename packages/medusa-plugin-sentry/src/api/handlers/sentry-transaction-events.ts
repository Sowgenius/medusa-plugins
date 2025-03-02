import { Request, Response } from 'express';
// Update import path for validator
import { validator } from '@medusajs/utils';
import SentryService from '../../services/sentry';
import { IsOptional, IsString } from 'class-validator';
import { GetSentryTransactionsParams } from './sentry-transaction';

export default (token: string) => {
  return async (req: Request, res: Response) => {
    const { transaction, organisation, project, statsPeriod, perPage, cursor, query } = await validator(
      GetSentryTransactionEventsParams,
      req.query
    );

    // Update service resolution for v2
    const sentryService: SentryService = req.scope.resolve("sentryService");
    const result = await sentryService.fetchTransactionEvents({
      transaction,
      organisation,
      project,
      query,
      statsPeriod,
      perPage,
      cursor,
      token,
    });
    res.json(result);
  };
};

export class GetSentryTransactionEventsParams extends GetSentryTransactionsParams {
  @IsString()
  transaction: string;

  @IsOptional()
  @IsString()
  query?: string;
}
