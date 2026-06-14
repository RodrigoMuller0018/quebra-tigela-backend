import {
  IsDateString,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateRequestDto {
  @IsMongoId() artistId!: string;
  @IsMongoId() serviceId!: string;

  @IsOptional()
  @IsMongoId()
  scheduleId?: string;

  @IsDateString() eventDate!: string;

  @Matches(TIME_REGEX, { message: 'startTime deve estar no formato HH:mm (24h)' })
  startTime!: string;

  @Matches(TIME_REGEX, { message: 'endTime deve estar no formato HH:mm (24h)' })
  endTime!: string;

  @IsString()
  @MaxLength(300)
  location!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  details?: string;
}
