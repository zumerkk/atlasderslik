import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EducationModule } from './education/education.module';
import { PackagesModule } from './packages/packages.module';
import { StatisticsModule } from './statistics/statistics.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Rate limiting: 100 requests per 60 seconds per IP (was 10 — far too aggressive!)
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const isProd = configService.get<string>('NODE_ENV') === 'production';
        return {
          uri: configService.get<string>('MONGO_URI'),
          serverSelectionTimeoutMS: 3000,
          connectTimeoutMS: 10000,
          socketTimeoutMS: 45000,
          autoIndex: !isProd, // skip index building at startup in prod
          bufferCommands: false, // fail fast if DB not ready
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    EducationModule,
    PackagesModule,
    StatisticsModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply throttle guard globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
