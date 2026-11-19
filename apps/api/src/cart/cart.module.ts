import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentModule } from '../payment/payment.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { Cart, CartSchema } from './schemas/cart.schema';

@Module({
  imports: [PaymentModule, MongooseModule.forFeature([{ name: Cart.name, schema: CartSchema }])],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}
