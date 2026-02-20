import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PackagesService } from './packages.service';
import { PackagesController } from './packages.controller';
import { Package, PackageSchema } from './schemas/package.schema';
import { Order, OrderSchema } from './schemas/order.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Package.name, schema: PackageSchema },
            { name: Order.name, schema: OrderSchema }
        ])
    ],
    controllers: [PackagesController],
    providers: [PackagesService],
    exports: [PackagesService]
})
export class PackagesModule { }
