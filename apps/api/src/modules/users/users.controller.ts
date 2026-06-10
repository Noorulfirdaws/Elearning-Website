import { Controller, Get, Patch, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch('me')
  updateProfile(@CurrentUser('id') id: string, @Body() body: any) {
    return this.usersService.updateProfile(id, body);
  }

  @Patch('me/password')
  changePassword(
    @CurrentUser('id') id: string,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.usersService.changePassword(id, body.currentPassword, body.newPassword);
  }

  @Get('me/notifications/settings')
  getNotifSettings(@CurrentUser('id') id: string) {
    return this.usersService.getNotificationSettings(id);
  }

  @Patch('me/notifications/settings')
  updateNotifSettings(@CurrentUser('id') id: string, @Body() body: Record<string, boolean>) {
    return this.usersService.updateNotificationSettings(id, body);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findById(@Param('id') id: string) {
    // Only admins can look up arbitrary user profiles — prevents IDOR
    return this.usersService.findById(id);
  }

  // Statistiques admin dashboard
  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  getAdminStats() {
    return this.usersService.getAdminStats();
  }

  // Admin endpoints
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  getAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
    @Query('role') role: UserRole,
  ) {
    return this.usersService.getAll(+page || 1, +limit || 20, search, role);
  }

  @Patch(':id/ban')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  banUser(
    @CurrentUser('id') adminId: string,
    @Param('id') userId: string,
    @Body('reason') reason: string,
  ) {
    return this.usersService.banUser(adminId, userId, reason);
  }

  @Patch(':id/unban')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  unbanUser(@CurrentUser('id') adminId: string, @Param('id') userId: string) {
    return this.usersService.unbanUser(adminId, userId);
  }

  @Put(':id/role')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  changeRole(
    @CurrentUser('id') adminId: string,
    @Param('id') userId: string,
    @Body('role') role: UserRole,
  ) {
    return this.usersService.changeRole(adminId, userId, role);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  deleteUser(@CurrentUser('id') adminId: string, @Param('id') userId: string) {
    return this.usersService.deleteUser(adminId, userId);
  }
}
