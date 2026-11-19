import { Equals, IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';
import { PaymentBuyerDto } from '../payment/payment.dto';

export class CartRevisionDto {
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER - 1)
  revision: number;
}

export class CartItemDto extends CartRevisionDto {
  @IsMongoId()
  packageId: string;

  @IsOptional()
  @IsMongoId()
  studentId?: string;
}

export class CartCheckoutDto extends PaymentBuyerDto {
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER - 1)
  revision: number;

  @Equals(true, { message: 'Gizlilik bildirimini okuduğunuzu onaylayın.' })
  privacyAccepted: boolean;

  @Equals(true, { message: 'Ön bilgilendirmeyi ve mesafeli satış sözleşmesini onaylayın.' })
  salesAgreementAccepted: boolean;
}
