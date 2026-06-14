import { IsIn } from 'class-validator';

export const allowedRequestStatusTransitions = [
  'accepted',
  'awaiting_confirmation',
  'completed',
  'rejected',
  'cancelled',
] as const;

export type RequestStatusInput =
  (typeof allowedRequestStatusTransitions)[number];

export class UpdateRequestStatusDto {
  @IsIn(allowedRequestStatusTransitions)
  status!: RequestStatusInput;
}
