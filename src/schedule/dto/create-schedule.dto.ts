import {
  IsDateString,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export const scheduleStatusValues = [
  'available',
  'pending',
  'booked',
  'completed',
  'cancelled',
] as const;
export type ScheduleStatus = (typeof scheduleStatusValues)[number];

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateScheduleDto {
  @IsMongoId()
  artistId!: string;

  @IsDateString()
  date!: string;

  @Matches(TIME_REGEX, { message: 'startTime deve estar no formato HH:mm (24h)' })
  startTime!: string;

  @Matches(TIME_REGEX, { message: 'endTime deve estar no formato HH:mm (24h)' })
  endTime!: string;

  @IsOptional()
  @IsIn(scheduleStatusValues)
  status?: ScheduleStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsMongoId()
  serviceId?: string;

  @IsOptional()
  @IsMongoId()
  clientId?: string;
}
