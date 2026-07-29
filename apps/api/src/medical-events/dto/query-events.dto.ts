import { IsDateString, IsOptional, IsString } from 'class-validator';

/**
 * Mirrors the filter bar's query params 1:1 (docs/Architecture.md §9,
 * Medical-Timeline-Phase1-Implementation-Plan.md §4) so filtering always
 * re-fetches from the server rather than filtering already-loaded data.
 */
export class QueryEventsDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  bodyPart?: string;

  @IsOptional()
  @IsString()
  medicineType?: string;

  @IsOptional()
  @IsString()
  recordType?: string;

  /** Keyword search over summary text. */
  @IsOptional()
  @IsString()
  q?: string;
}
