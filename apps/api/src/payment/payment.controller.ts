import { Controller, Post, Get, Body, UseGuards, UsePipes, ValidationPipe, Request, Query, Param, Res, Header, Headers, HttpCode } from '@nestjs/common';
import type { Response } from 'express';
import { PaymentService } from './payment.service';
import { ActivePackageQueryDto, AdminOrdersQueryDto, InitializePaymentDto, PaymentCallbackDto, RefundRequestDto, UserOrdersQueryDto } from './payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@repo/shared';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

@Controller('payment')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('status')
  getStatus() { return this.paymentService.getPublicReadiness(); }

  @Get('merchant')
  getMerchant() { return this.paymentService.getMerchant(); }

  @Get('checkout-context/:packageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  getCheckoutContext(@Request() req, @Param('packageId') packageId: string, @Query() query: ActivePackageQueryDto) {
    return this.paymentService.getCheckoutContext(req.user.userId, packageId, query.studentId);
  }

  @Post('initialize')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  initializePayment(@Request() req, @Body() dto: InitializePaymentDto) {
    return this.paymentService.initializeCheckoutForm(req.user.userId, dto, req.ip);
  }

  // iyzico sends application/x-www-form-urlencoded POST. Verification is performed
  // here before a 303 GET redirect, so it also works with third-party browser redirects.
  @Post('provider-callback')
  @SkipThrottle()
  async providerCallback(@Body() dto: PaymentCallbackDto, @Res() response: Response) {
    let result: { status: string; orderId?: string };
    try { result = await this.paymentService.handleCallback(dto.token); }
    catch { result = await this.paymentService.callbackFailure(dto.token); }
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    return response.redirect(303, this.paymentService.getFrontendResultUrl(result));
  }

  @Post('provider-webhook')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 180, ttl: 60000 } })
  async providerWebhook(@Body() body: unknown, @Headers('x-iyz-signature-v3') signature: unknown): Promise<void> {
    await this.paymentService.handleProviderWebhook(body, signature);
  }

  // Compatibility for previously opened checkout sessions.
  @Post('callback')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  handleCallback(@Body() dto: PaymentCallbackDto) { return this.paymentService.handleCallback(dto.token); }

  @Get('my-orders')
  @UseGuards(JwtAuthGuard)
  getMyOrders(@Request() req, @Query() query: UserOrdersQueryDto) { return this.paymentService.getUserOrders(req.user.userId, query); }

  @Get('students')
  @UseGuards(JwtAuthGuard)
  getStudents(@Request() req) { return this.paymentService.getStudents(req.user.userId); }

  @Get('active-package')
  @UseGuards(JwtAuthGuard)
  getActivePackage(@Request() req, @Query() query: ActivePackageQueryDto) { return this.paymentService.getActivePackage(req.user.userId, query); }

  @Get('orders/:id')
  @UseGuards(JwtAuthGuard)
  getOrder(@Request() req, @Param('id') id: string) { return this.paymentService.getOrderForUser(req.user.userId, id); }

  @Post('orders/:id/reconcile')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  reconcileForUser(@Request() req, @Param('id') id: string) { return this.paymentService.reconcileForUser(req.user.userId, id); }

  @Post('orders/:id/resume')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  resumeOrder(@Request() req, @Param('id') id: string) { return this.paymentService.resumeOrder(req.user.userId, id); }

  @Post('orders/:id/cancel')
  @UseGuards(JwtAuthGuard)
  cancelOrder(@Request() req, @Param('id') id: string) { return this.paymentService.cancelOrder(req.user.userId, id); }

  @Post('orders/:id/refund-request')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  requestRefund(@Request() req, @Param('id') id: string, @Body() dto: RefundRequestDto) { return this.paymentService.requestRefund(req.user.userId, id, dto.reason); }

  @Get('admin/readiness')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getReadiness(@Request() req) {
    await this.paymentService.requireAdmin(req.user.userId);
    return this.paymentService.getAdminReadiness();
  }

  @Get('admin/orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getAllOrders(@Request() req, @Query() query: AdminOrdersQueryDto) {
    await this.paymentService.requireAdmin(req.user.userId);
    return this.paymentService.getAllOrders(query);
  }

  @Get('admin/orders/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getAdminOrder(@Request() req, @Param('id') id: string) {
    await this.paymentService.requireAdmin(req.user.userId);
    return this.paymentService.getAdminOrder(id);
  }

  @Post('admin/orders/:id/reconcile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async reconcileOrder(@Request() req, @Param('id') id: string) {
    await this.paymentService.requireAdmin(req.user.userId);
    return this.paymentService.reconcileOrder(id);
  }
}
