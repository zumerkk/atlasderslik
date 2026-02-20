import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Package, PackageDocument } from './schemas/package.schema';
import { Order, OrderDocument, OrderStatus } from './schemas/order.schema';

@Injectable()
export class PackagesService {
    constructor(
        @InjectModel(Package.name) private packageModel: Model<PackageDocument>,
        @InjectModel(Order.name) private orderModel: Model<OrderDocument>
    ) { }

    async create(createPackageDto: any): Promise<Package> {
        const createdPackage = new this.packageModel(createPackageDto);
        return createdPackage.save();
    }

    async findAll(): Promise<Package[]> {
        return this.packageModel.find().exec();
    }

    async findActive(): Promise<Package[]> {
        return this.packageModel.find({ isActive: true }).sort({ sortOrder: 1 }).exec();
    }

    async findOne(id: string): Promise<Package | null> {
        return this.packageModel.findById(id).exec();
    }

    async update(id: string, updatePackageDto: any): Promise<Package | null> {
        return this.packageModel.findByIdAndUpdate(id, updatePackageDto, { new: true }).exec();
    }

    async remove(id: string): Promise<Package | null> {
        return this.packageModel.findByIdAndDelete(id).exec();
    }

    // Order Logic
    async createOrder(userId: string, packageId: string): Promise<Order> {
        const pkg = await this.packageModel.findById(packageId);
        if (!pkg) {
            throw new Error('Package not found');
        }

        const order = new this.orderModel({
            user: userId,
            package: packageId,
            amount: pkg.price,
            status: OrderStatus.PENDING
        });

        return order.save();
    }

    async completeOrder(orderId: string, paymentId: string): Promise<Order | null> {
        return this.orderModel.findByIdAndUpdate(orderId, {
            status: OrderStatus.COMPLETED,
            paymentId
        }, { new: true }).exec();
    }
}
