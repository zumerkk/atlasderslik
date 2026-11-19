import { Equals, IsDateString, IsEnum, IsIn, IsInt, IsMongoId, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { OrderStatus } from '../packages/schemas/order.schema';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class PaymentBuyerDto {
  @IsString()
  @Transform(trim)
  @Matches(/^[1-9]\d{10}$/)
  identityNumber: string;

  @IsString()
  @Transform(trim)
  @Matches(/^\+90[1-9]\d{9}$/)
  phone: string;

  @IsString()
  @Transform(trim)
  @MinLength(3)
  @MaxLength(80)
  city: string;

  @IsString()
  @Transform(trim)
  @MinLength(10)
  @MaxLength(500)
  address: string;

  @Equals(true, { message: 'Satın alma koşullarını onaylamalısınız.' })
  termsAccepted: boolean;
}

export class InitializePaymentDto extends PaymentBuyerDto {
  @IsMongoId()
  packageId: string;

  @IsOptional()
  @IsMongoId()
  studentId?: string;

  @Equals(true, { message: 'Gizlilik bildirimini okuduğunuzu onaylayın.' })
  privacyAccepted: boolean;

  @Equals(true, { message: 'Ön bilgilendirmeyi ve mesafeli satış sözleşmesini onaylayın.' })
  salesAgreementAccepted: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  quoteHash?: string;
}

export class PaymentCallbackDto {
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  @Matches(/^[A-Za-z0-9_-]+$/)
  token: string;
}

export class UserOrdersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsMongoId()
  studentId?: string;
}

export class AdminOrdersQueryDto extends UserOrdersQueryDto {
  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn(['live', 'sandbox', 'legacy'])
  environment?: 'live' | 'sandbox' | 'legacy';

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  to?: string;
}

export class ActivePackageQueryDto {
  @IsOptional()
  @IsMongoId()
  studentId?: string;
}

export class RefundRequestDto {
  @IsString()
  @Transform(trim)
  @MinLength(10)
  @MaxLength(1000)
  reason: string;
}
