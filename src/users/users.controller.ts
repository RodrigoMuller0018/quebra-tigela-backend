import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './schemas/user.schema';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(): Promise<User[]> {
    return this.service.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  find(@Param('id') id: string): Promise<User | null> {
    return this.service.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateUserDto>,
  ): Promise<User> {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @Delete(':id')
  remove(@Param('id') id: string): Promise<{ deleted: boolean }> {
    return this.service.remove(id);
  }
}
