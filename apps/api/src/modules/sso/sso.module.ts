import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SsoController } from './sso.controller';
import { SsoService } from './sso.service';
import { PrismaService } from '../../config/prisma.service';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [JwtModule.register({}), TenantsModule],
  controllers: [SsoController],
  providers: [SsoService, PrismaService],
  exports: [SsoService],
})
export class SsoModule {}
