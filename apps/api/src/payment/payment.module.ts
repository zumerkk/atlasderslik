import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { Order, OrderSchema } from '../packages/schemas/order.schema';
import { Package, PackageSchema } from '../packages/schemas/package.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Grade, GradeSchema } from '../education/schemas/grade.schema';
import { StudentEnrollment, StudentEnrollmentSchema } from '../education/schemas/student-enrollment.schema';
import { Cart, CartSchema } from '../cart/schemas/cart.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Order.name, schema: OrderSchema },
            { name: Package.name, schema: PackageSchema },
            { name: User.name, schema: UserSchema },
            { name: Grade.name, schema: GradeSchema },
            { name: StudentEnrollment.name, schema: StudentEnrollmentSchema },
            { name: Cart.name, schema: CartSchema },
        ]),
    ],
    controllers: [PaymentController],
    providers: [PaymentService],
    exports: [PaymentService],
})
export class PaymentModule { }
