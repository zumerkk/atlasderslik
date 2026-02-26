import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@repo/shared';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    @Roles(UserRole.ADMIN)
    create(@Body() createUserDto: any) {
        return this.usersService.create(createUserDto);
    }

    @Get()
    @Roles(UserRole.ADMIN)
    findAll() {
        return this.usersService.findAll();
    }

    @Get(':id')
    @Roles(UserRole.ADMIN)
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN)
    update(@Param('id') id: string, @Body() updateUserDto: any) {
        return this.usersService.update(id, updateUserDto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }

    // ─── Password Management (Admin Only) ─────────────────────

    /**
     * Generate a random password for a user.
     * Returns the temporary password (plaintext) for admin to share.
     */
    @Post(':id/generate-password')
    @Roles(UserRole.ADMIN)
    async generatePassword(@Param('id') id: string) {
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
    @Roles(UserRole.ADMIN)
    async setPassword(@Param('id') id: string, @Body() body: { password: string }) {
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
    @Roles(UserRole.ADMIN)
    async resetPassword(@Param('id') id: string) {
        const result = await this.usersService.generatePassword(id);
        return {
            message: 'Şifre başarıyla sıfırlandı.',
            temporaryPassword: result.temporaryPassword,
            user: result.user,
        };
    }
}
