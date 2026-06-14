import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ValidateNested } from 'class-validator';
import { CreateScheduleDto } from './create-schedule.dto';

export class BatchCreateScheduleDto {
  @ValidateNested({ each: true })
  @Type(() => CreateScheduleDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  schedules!: CreateScheduleDto[];
}
