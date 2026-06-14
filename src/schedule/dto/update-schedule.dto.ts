import {
  IsDateString,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  scheduleStatusValues,
  type ScheduleStatus,
} from './create-schedule.dto';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpdateScheduleDto {
  @IsOptional()
  @IsMongoId()
  artistId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @Matches(TIME_REGEX, { message: 'startTime deve estar no formato HH:mm (24h)' })
  startTime?: string;

  @IsOptional()
  @Matches(TIME_REGEX, { message: 'endTime deve estar no formato HH:mm (24h)' })
  endTime?: string;

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
}
