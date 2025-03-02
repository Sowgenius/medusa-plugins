import { Request, Response } from 'express';
// Update import path for validator
import { validator } from '@medusajs/utils';
import SentryService from '../../services/sentry';
import { IsOptional, IsString } from 'class-validator';

export default (token: string) => {
  return async (req: Request, res: Response) => {
    const { organisation, project, statsPeriod, perPage, cursor, query } = await validator(
      GetSentryTransactionsParams,
      req.query
    );

    // Update service resolution for v2
    const sentryService: SentryService = req.scope.resolve("sentryService");
    const result = await sentryService.fetchTransactions({
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

export class GetSentryTransactionsParams {
  @IsString()
  organisation: string;

  @IsString()
  project: string;

  @IsString()
  statsPeriod: string;

  @IsOptional()
  @IsString()
  perPage?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  query?: string;
}
