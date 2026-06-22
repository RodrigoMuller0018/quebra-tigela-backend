import { SetMetadata } from '@nestjs/common';

export const Papeis = (...args: string[]) => SetMetadata('papeis', args);
