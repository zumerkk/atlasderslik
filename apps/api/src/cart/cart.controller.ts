import { Body, Controller, Delete, Get, Post, Put, Request, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@repo/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CartCheckoutDto, CartItemDto, CartRevisionDto } from './cart.dto';
import { CartService } from './cart.service';

@Controller('cart')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT, UserRole.PARENT)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class CartController {
  constructor(private readonly carts: CartService) {}

  @Get()
  get(@Request() req: { user: { userId: string } }) { return this.carts.get(req.user.userId); }

  @Put('item')
  put(@Request() req: { user: { userId: string } }, @Body() dto: CartItemDto) { return this.carts.put(req.user.userId, dto); }

  @Delete()
  remove(@Request() req: { user: { userId: string } }, @Body() dto: CartRevisionDto) { return this.carts.clear(req.user.userId, dto); }

  @Post('checkout')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  checkout(@Request() req: { user: { userId: string }; ip: string }, @Body() dto: CartCheckoutDto) {
    return this.carts.checkout(req.user.userId, dto, req.ip);
  }
}
