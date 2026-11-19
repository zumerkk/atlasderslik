import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, GoneException, Req } from '@nestjs/common';
import { PackagesService } from './packages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('packages')
export class PackagesController {
    constructor(private readonly packagesService: PackagesService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Body() body: unknown, @Req() req: any) {
        return this.packagesService.create(body, req.user.userId);
    }

    @Get()
    findAll() {
        return this.packagesService.findActive();
    }

    @Get('active')
    findActive() {
        return this.packagesService.findActive();
    }

    @Get('admin')
    @UseGuards(JwtAuthGuard)
    findAdmin(@Req() req: any) {
        return this.packagesService.findAll(req.user.userId);
    }

    @Get('admin/:id')
    @UseGuards(JwtAuthGuard)
    findAdminOne(@Param('id') id: string, @Req() req: any) {
        return this.packagesService.findAdminOne(id, req.user.userId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.packagesService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    update(@Param('id') id: string, @Body() body: unknown, @Req() req: any) {
        return this.packagesService.update(id, body, req.user.userId);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Param('id') id: string, @Req() req: any) {
        return this.packagesService.remove(id, req.user.userId);
    }

    @Post('purchase')
    @UseGuards(JwtAuthGuard)
    purchase() {
        throw new GoneException('Satın alma işlemi güvenli ödeme sayfasından başlatılmalıdır.');
    }
}
