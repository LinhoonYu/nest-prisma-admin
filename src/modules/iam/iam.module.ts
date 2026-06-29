import { Module } from '@nestjs/common';

import { DeptModule } from './dept/dept.module';
import { MenuModule } from './menu/menu.module';
import { PermissionModule } from './permission/permission.module';
import { RoleModule } from './role/role.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [DeptModule, RoleModule, MenuModule, PermissionModule, UserModule],
})
export class IamModule {}
