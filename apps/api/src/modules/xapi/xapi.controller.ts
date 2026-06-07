import { Controller, Get, Put, Post, Delete, Body, Param, Query, Headers, Req, Res, HttpCode } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { XapiService, XApiStatement } from './xapi.service';
import { Public } from '../../common/decorators/public.decorator';

// xAPI LRS endpoints - these use HTTP Basic Auth (username=key, password=secret)
// For simplicity we use the standard /xapi path

@ApiTags('xapi')
@Controller('xapi')
export class XapiController {
  constructor(private readonly xapiService: XapiService) {}

  // Statement Resource
  @Public()
  @Put('statements')
  @HttpCode(204)
  async putStatement(@Body() statement: XApiStatement) {
    await this.xapiService.putStatement(statement);
  }

  @Public()
  @Post('statements')
  async postStatements(@Body() body: XApiStatement | XApiStatement[]) {
    const statements = Array.isArray(body) ? body : [body];
    const ids = await this.xapiService.putStatements(statements);
    return ids;
  }

  @Public()
  @Get('statements')
  async getStatements(
    @Query('statementId') statementId: string,
    @Query('agent') agent: string,
    @Query('verb') verb: string,
    @Query('activity') activity: string,
    @Query('registration') registration: string,
    @Query('since') since: string,
    @Query('until') until: string,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
  ) {
    if (statementId) {
      const stmt = await this.xapiService.getStatement(statementId);
      return { statement: stmt };
    }
    return this.xapiService.getStatements({
      agent, verb, activity, registration, since, until,
      limit: limit ? +limit : 50,
      offset: offset ? +offset : 0,
    });
  }

  // State Resource
  @Public()
  @Put('activities/state')
  @HttpCode(204)
  putState(
    @Query('activityId') activityId: string,
    @Query('agent') agent: string,
    @Query('stateId') stateId: string,
    @Query('registration') registration: string,
    @Body() body: any,
  ) {
    return this.xapiService.putState(activityId, agent, stateId, body, registration);
  }

  @Public()
  @Get('activities/state')
  getState(
    @Query('activityId') activityId: string,
    @Query('agent') agent: string,
    @Query('stateId') stateId: string,
  ) {
    return this.xapiService.getState(activityId, agent, stateId);
  }

  @Public()
  @Delete('activities/state')
  @HttpCode(204)
  deleteState(
    @Query('activityId') activityId: string,
    @Query('agent') agent: string,
    @Query('stateId') stateId: string,
  ) {
    return this.xapiService.deleteState(activityId, agent, stateId);
  }

  // Activity Profile Resource
  @Public()
  @Put('activities/profile')
  @HttpCode(204)
  putProfile(
    @Query('activityId') activityId: string,
    @Query('profileId') profileId: string,
    @Body() body: any,
  ) {
    return this.xapiService.putActivityProfile(activityId, profileId, body);
  }

  @Public()
  @Get('activities/profile')
  getProfile(@Query('activityId') activityId: string, @Query('profileId') profileId: string) {
    return this.xapiService.getActivityProfile(activityId, profileId);
  }

  // About Resource (required by xAPI spec)
  @Public()
  @Get('about')
  about() {
    return {
      version: ['1.0.3'],
      extensions: {
        'https://lms.platform/xapi/features': ['statements', 'state', 'activities/profile'],
      },
    };
  }
}
