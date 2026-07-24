import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '~/common/decorators/current-user.decorator';
import { IdParam } from '~/common/dto/id-param.dto';
import { Perm } from '~/common/decorators/perm.decorator';

import { CreateMenuDto, MenuQueryDto, UpdateMenuDto } from './dto/menu.dto';
import { menuPermissions } from './menu.permissions';
import { MenuService } from './menu.service';

@ApiTags('菜单管理')
@Controller('menus')
export class MenuController {
  constructor(private menuService: MenuService) {}

  @Get()
  @ApiOperation({ summary: '菜单树' })
  tree(
    @Query() query: MenuQueryDto,
    @CurrentUser('userId') userId: string,
    @Req() req: FastifyRequest,
  ) {
    const raw = req.headers['accept-language'] as string | string[] | undefined;
    const locale = (Array.isArray(raw) ? raw[0] : raw) || 'zh-cn';
    return this.menuService.tree(query, userId, locale);
  }

  @Get(':id')
  @ApiOperation({ summary: '菜单详情' })
  @Perm(menuPermissions.READ)
  detail(@Param() { id }: IdParam, @Req() req: FastifyRequest) {
    const raw = req.headers['accept-language'] as string | string[] | undefined;
    const locale = (Array.isArray(raw) ? raw[0] : raw) || 'zh-cn';
    return this.menuService.detail(BigInt(id), locale);
  }

  @Post()
  @ApiOperation({ summary: '新增菜单' })
  @Perm(menuPermissions.CREATE)
  create(
    @Body() dto: CreateMenuDto,
    @CurrentUser('userId') userId: string,
    @Req() req: FastifyRequest,
  ) {
    const raw = req.headers['accept-language'] as string | string[] | undefined;
    const locale = (Array.isArray(raw) ? raw[0] : raw) || 'zh-cn';
    return this.menuService.create(dto, BigInt(userId), locale);
  }

  @Put(':id')
  @ApiOperation({ summary: '修改菜单' })
  @Perm(menuPermissions.UPDATE)
  update(
    @Param() { id }: IdParam,
    @Body() dto: UpdateMenuDto,
    @CurrentUser('userId') userId: string,
    @Req() req: FastifyRequest,
  ) {
    const raw = req.headers['accept-language'] as string | string[] | undefined;
    const locale = (Array.isArray(raw) ? raw[0] : raw) || 'zh-cn';
    return this.menuService.update(BigInt(id), dto, BigInt(userId), locale);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除菜单' })
  @Perm(menuPermissions.DELETE)
  remove(@Param() { id }: IdParam, @CurrentUser('userId') userId: string) {
    return this.menuService.remove(BigInt(id), BigInt(userId));
  }
}
