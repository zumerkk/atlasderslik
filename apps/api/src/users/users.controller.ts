import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request, UsePipes, ValidationPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@repo/shared';
import { SkipThrottle } from '@nestjs/throttler';
import { AdminCreateUserDto, AdminUpdateUserDto, AssignParentDto, UserStatusDto, SetPasswordDto } from './users.dto';
import { publicUser } from './user-response';

@SkipThrottle()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
    async create(@Body() createUserDto: AdminCreateUserDto) {
        return publicUser(await this.usersService.create(createUserDto));
    }

    @Get()
    @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
    findAll(@Query('role') role?: string) {
        return this.usersService.findAll(role);
    }

    @Get(':id')
    @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
    async update(@Request() req, @Param('id') id: string, @Body() updateUserDto: AdminUpdateUserDto) {
        await this.usersService.requireAdminTarget(req.user.userId, id);
        return this.usersService.update(id, updateUserDto);
    }

    @Patch(':id/status')
    @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
    setStatus(@Request() req, @Param('id') id: string, @Body() body: UserStatusDto) {
        return this.usersService.setActive(id, body.isActive, req.user.userId);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
    async remove(@Request() req, @Param('id') id: string) {
        // Preserve purchases and family history when an account is closed.
        return this.usersService.setActive(id, false, req.user.userId);
    }

    @Post(':id/assign-parent')
    @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
    async assignParent(@Request() req, @Param('id') id: string, @Body() body: AssignParentDto) {
        await this.usersService.requireAdminTarget(req.user.userId, id);
        return this.usersService.assignParent(id, body.parentId);
    }

    // ─── Password Management (Admin Only) ─────────────────────

    /**
     * Generate a random password for a user.
     * Returns the temporary password (plaintext) for admin to share.
     */
    @Post(':id/generate-password')
    @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
    async generatePassword(@Request() req, @Param('id') id: string) {
        await this.usersService.requireAdminTarget(req.user.userId, id);
        const result = await this.usersService.generatePassword(id);
        return {
            message: 'Şifre başarıyla oluşturuldu.',
            temporaryPassword: result.temporaryPassword,
            user: result.user,
        };
    }

    /**
     * Manually set a password for a user.
     */
    @Post(':id/set-password')
    @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
    async setPassword(@Request() req, @Param('id') id: string, @Body() body: SetPasswordDto) {
        await this.usersService.requireAdminTarget(req.user.userId, id);
        const user = await this.usersService.setPassword(id, body.password);
        return {
            message: 'Şifre başarıyla güncellendi.',
            user,
        };
    }

    /**
     * Reset password (alias for generate-password).
     */
    @Post(':id/reset-password')
    @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
    async resetPassword(@Request() req, @Param('id') id: string) {
        await this.usersService.requireAdminTarget(req.user.userId, id);
        const result = await this.usersService.generatePassword(id);
        return {
            message: 'Şifre başarıyla sıfırlandı.',
            temporaryPassword: result.temporaryPassword,
            user: result.user,
        };
    }
}
