import { IsDateString, IsString } from 'class-validator';

export class SetMilestoneDto {
  /** e.g. "accidentDate" (special-cased by the frontend) or "Surgery Date". */
  @IsString()
  label: string;

  @IsDateString()
  date: string;
}
