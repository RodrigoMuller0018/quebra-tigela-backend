import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './schemas/user.schema';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/current-user.decorator';

function ensureOwner(paramId: string, user: JwtUser) {
  if (paramId !== user.sub && user.role !== 'admin') {
    throw new ForbiddenException(
      'Você só pode acessar/modificar seu próprio perfil',
    );
  }
}

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
    // TODO: restringir a admin quando role admin existir
    return this.service.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  find(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
  ): Promise<User | null> {
    ensureOwner(id, user);
    return this.service.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateUserDto>,
    @CurrentUser() user: JwtUser,
  ): Promise<User> {
    ensureOwner(id, user);
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
  ): Promise<{ deleted: boolean }> {
    ensureOwner(id, user);
    return this.service.remove(id);
  }
}
