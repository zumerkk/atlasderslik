import { Controller, Post, Get, Body, UseGuards, Request, Query } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@repo/shared';

@Controller('payment')
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) { }

    /**
     * Initialize iyzico Checkout Form
     * Requires authentication — student must be logged in
     */
    @Post('initialize')
    @UseGuards(JwtAuthGuard)
    async initializePayment(
        @Request() req,
        @Body('packageId') packageId: string,
    ) {
        return this.paymentService.initializeCheckoutForm(req.user.userId, packageId);
    }

    /**
     * iyzico callback — verifies payment result
     * Public endpoint (called by frontend after iyzico redirect)
     */
    @Post('callback')
    async handleCallback(@Body('token') token: string) {
        return this.paymentService.handleCallback(token);
    }

    /**
     * Get current user's orders
     */
    @Get('my-orders')
    @UseGuards(JwtAuthGuard)
    async getMyOrders(@Request() req) {
        return this.paymentService.getUserOrders(req.user.userId);
    }

    /**
     * Get current user's active package
     */
    @Get('active-package')
    @UseGuards(JwtAuthGuard)
    async getActivePackage(@Request() req) {
        return this.paymentService.getActivePackage(req.user.userId);
    }

    /**
     * Admin: list all orders (for reports)
     */
    @Get('admin/orders')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async getAllOrders(@Query('status') status?: string) {
        return this.paymentService.getAllOrders(status);
    }
}
