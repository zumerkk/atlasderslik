import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { PackagesService } from './packages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@repo/shared';

@Controller('packages')
export class PackagesController {
    constructor(private readonly packagesService: PackagesService) { }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    create(@Body() createPackageDto: any) {
        return this.packagesService.create(createPackageDto);
    }

    @Get()
    findAll() {
        return this.packagesService.findAll(); // Public: Active & Inactive (or filter via query)
    }

    @Get('active')
    findActive() {
        return this.packagesService.findActive(); // Public: Only Active
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.packagesService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    update(@Param('id') id: string, @Body() updatePackageDto: any) {
        return this.packagesService.update(id, updatePackageDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    remove(@Param('id') id: string) {
        return this.packagesService.remove(id);
    }

    @Post('purchase')
    @UseGuards(JwtAuthGuard)
    purchase(@Request() req, @Body('packageId') packageId: string) {
        // Mock purchase flow
        return this.packagesService.createOrder(req.user.userId, packageId);
    }
}
