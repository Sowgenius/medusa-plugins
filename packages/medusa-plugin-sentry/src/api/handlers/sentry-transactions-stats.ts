import { Request, Response } from 'express';
// Update import path for validator
import { validator } from '@medusajs/utils';
import SentryService from '../../services/sentry';
import { IsOptional, IsString } from 'class-validator';

export default (token: string) => {
  return async (req: Request, res: Response) => {
    const { transaction, organisation, project, statsPeriod } = await validator(
      GetSentryTransactionsStatsParams,
      req.query
    );

    // Update service resolution for v2
    const sentryService: SentryService = req.scope.resolve("sentryService");
    const result = await sentryService.fetchTransactionsStats({
      transaction,
      organisation,
      project,
      statsPeriod,
      token,
    });
    res.json(result);
  };
};

export class GetSentryTransactionsStatsParams {
  @IsString()
  organisation: string;

  @IsString()
  project: string;

  @IsString()
  statsPeriod: string;

  @IsString()
  @IsOptional()
  transaction?: string;
}
