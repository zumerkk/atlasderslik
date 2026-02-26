import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from '../packages/schemas/order.schema';
import { Package, PackageDocument } from '../packages/schemas/package.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Iyzipay = require('iyzipay');

@Injectable()
export class PaymentService {
    private iyzipay: any;

    constructor(
        private configService: ConfigService,
        @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
        @InjectModel(Package.name) private packageModel: Model<PackageDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) {
        this.iyzipay = new Iyzipay({
            apiKey: this.configService.get<string>('IYZICO_API_KEY') || 'sandbox-Txl2ctiktW6BrNmFo10pZiPn8W67Ksob',
            secretKey: this.configService.get<string>('IYZICO_SECRET_KEY') || 'sandbox-GdzIHrXly6gQkq7NWOgx9DmXG',
            uri: this.configService.get<string>('IYZICO_BASE_URL') || 'https://sandbox-api.iyzipay.com',
        });
    }

    async initializeCheckoutForm(userId: string, packageId: string): Promise<any> {
        const user = await this.userModel.findById(userId);
        if (!user) throw new NotFoundException('Kullanıcı bulunamadı');

        const pkg = await this.packageModel.findById(packageId);
        if (!pkg) throw new NotFoundException('Paket bulunamadı');

        // Create a pending order
        const order = new this.orderModel({
            user: userId,
            package: packageId,
            amount: pkg.price,
            status: OrderStatus.PENDING,
        });
        await order.save();

        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
        const conversationId = order._id.toString();
        const price = pkg.price.toFixed(2);

        const request = {
            locale: 'tr',
            conversationId,
            price,
            paidPrice: price,
            currency: 'TRY',
            basketId: `BASKET_${conversationId}`,
            paymentGroup: 'PRODUCT',
            callbackUrl: `${frontendUrl}/payment/callback`,
            enabledInstallments: [1], // Taksitsiz tek ödeme
            buyer: {
                id: userId,
                name: user.firstName,
                surname: user.lastName,
                gsmNumber: user.phone || '+905000000000',
                email: user.email,
                identityNumber: user.identityNumber || '11111111111',
                lastLoginDate: new Date().toISOString().split('T')[0] + ' ' + new Date().toISOString().split('T')[1].split('.')[0],
                registrationDate: new Date().toISOString().split('T')[0] + ' ' + new Date().toISOString().split('T')[1].split('.')[0],
                registrationAddress: user.address || 'Antalya/Gazipaşa',
                ip: '85.34.78.112',
                city: user.city || 'Antalya',
                country: 'Turkey',
                zipCode: '07900',
            },
            shippingAddress: {
                contactName: `${user.firstName} ${user.lastName}`,
                city: user.city || 'Antalya',
                country: 'Turkey',
                address: user.address || 'Antalya/Gazipaşa',
                zipCode: '07900',
            },
            billingAddress: {
                contactName: `${user.firstName} ${user.lastName}`,
                city: user.city || 'Antalya',
                country: 'Turkey',
                address: user.address || 'Antalya/Gazipaşa',
                zipCode: '07900',
            },
            basketItems: [
                {
                    id: packageId,
                    name: pkg.name,
                    category1: 'Eğitim Paketi',
                    itemType: 'VIRTUAL',
                    price,
                },
            ],
        };

        return new Promise((resolve, reject) => {
            this.iyzipay.checkoutFormInitialize.create(request, async (err: any, result: any) => {
                if (err) {
                    await this.orderModel.findByIdAndUpdate(order._id, { status: OrderStatus.FAILED });
                    return reject(new BadRequestException('Ödeme başlatılamadı: ' + (err.errorMessage || err.message || 'Bilinmeyen hata')));
                }

                if (result.status === 'failure') {
                    await this.orderModel.findByIdAndUpdate(order._id, { status: OrderStatus.FAILED });
                    return reject(new BadRequestException('Ödeme başlatılamadı: ' + (result.errorMessage || 'Bilinmeyen hata')));
                }

                // Save the token to the order
                await this.orderModel.findByIdAndUpdate(order._id, {
                    iyzicoToken: result.token,
                });

                resolve({
                    status: result.status,
                    token: result.token,
                    checkoutFormContent: result.checkoutFormContent,
                    paymentPageUrl: result.paymentPageUrl,
                    orderId: order._id.toString(),
                });
            });
        });
    }

    async handleCallback(token: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.iyzipay.checkoutForm.retrieve(
                {
                    locale: 'tr',
                    token,
                },
                async (err: any, result: any) => {
                    if (err) {
                        return reject(new BadRequestException('Ödeme doğrulanamadı'));
                    }

                    // Find the order by token
                    const order = await this.orderModel.findOne({ iyzicoToken: token });
                    if (!order) {
                        return reject(new NotFoundException('Sipariş bulunamadı'));
                    }

                    if (result.status === 'success' && result.paymentStatus === 'SUCCESS') {
                        await this.orderModel.findByIdAndUpdate(order._id, {
                            status: OrderStatus.COMPLETED,
                            iyzicoPaymentId: result.paymentId,
                            paidAt: new Date(),
                        });

                        resolve({
                            status: 'success',
                            message: 'Ödeme başarılı',
                            orderId: order._id.toString(),
                            paymentId: result.paymentId,
                        });
                    } else {
                        await this.orderModel.findByIdAndUpdate(order._id, {
                            status: OrderStatus.FAILED,
                            iyzicoPaymentId: result.paymentId || null,
                        });

                        resolve({
                            status: 'failure',
                            message: result.errorMessage || 'Ödeme başarısız',
                            orderId: order._id.toString(),
                        });
                    }
                },
            );
        });
    }

    async getUserOrders(userId: string): Promise<Order[]> {
        return this.orderModel
            .find({ user: userId } as any)
            .populate('package')
            .sort({ createdAt: -1 })
            .exec();
    }

    async getActivePackage(userId: string): Promise<any> {
        const latestOrder = await this.orderModel
            .findOne({ user: userId, status: OrderStatus.COMPLETED } as any)
            .populate('package')
            .sort({ paidAt: -1 })
            .exec();

        if (!latestOrder) return null;
        return {
            order: latestOrder,
            package: latestOrder.package,
        };
    }
}
