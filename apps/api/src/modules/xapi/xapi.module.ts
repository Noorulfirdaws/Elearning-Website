import { Module } from '@nestjs/common';
import { XapiController } from './xapi.controller';
import { XapiService } from './xapi.service';
import { PrismaService } from '../../config/prisma.service';

@Module({
  controllers: [XapiController],
  providers: [XapiService, PrismaService],
  exports: [XapiService],
})
export class XapiModule {}
