import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsMongoId, IsNumber, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export const PACKAGE_FIELDS = ['name', 'description', 'subtitle', 'price', 'originalPrice', 'isActive', 'features', 'badge', 'sortOrder', 'period', 'gradePolicy', 'gradeIds'] as const;
export const PACKAGE_MAX_PRICE = 9_999_999.99;
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

class PackageFieldsDto {
  @Transform(trim) @IsString({ message: 'Paket adı metin olmalıdır.' })
  @MinLength(2, { message: 'Paket adı en az 2 karakter olmalıdır.' }) @MaxLength(120, { message: 'Paket adı en fazla 120 karakter olabilir.' })
  name: string;

  @Transform(trim) @IsString({ message: 'Paket açıklaması metin olmalıdır.' })
  @MinLength(10, { message: 'Paket açıklaması en az 10 karakter olmalıdır.' }) @MaxLength(4000, { message: 'Paket açıklaması en fazla 4000 karakter olabilir.' })
  description: string;

  @Transform(trim) @IsString({ message: 'Alt başlık metin olmalıdır.' }) @MaxLength(180, { message: 'Alt başlık en fazla 180 karakter olabilir.' })
  subtitle: string;

  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 }, { message: 'Fiyat en fazla iki ondalık basamak içeren bir sayı olmalıdır.' })
  @Min(0.01, { message: 'Paket fiyatı sıfırdan büyük olmalıdır.' }) @Max(PACKAGE_MAX_PRICE, { message: 'Paket fiyatı izin verilen üst sınırı aşıyor.' })
  price: number;

  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 }, { message: 'İndirimsiz fiyat en fazla iki ondalık basamak içeren bir sayı olmalıdır.' })
  @Min(0, { message: 'İndirimsiz fiyat negatif olamaz.' }) @Max(PACKAGE_MAX_PRICE, { message: 'İndirimsiz fiyat izin verilen üst sınırı aşıyor.' })
  originalPrice: number;

  @IsBoolean({ message: 'Paketin satış durumu doğru veya yanlış olmalıdır.' })
  isActive: boolean;

  @Transform(({ value }) => Array.isArray(value) ? value.map(item => typeof item === 'string' ? item.trim() : item) : value)
  @IsArray({ message: 'Paket özellikleri bir liste olmalıdır.' }) @ArrayMaxSize(30, { message: 'En fazla 30 paket özelliği eklenebilir.' }) @ArrayUnique({ message: 'Paket özellikleri tekrar etmemelidir.' })
  @IsString({ each: true, message: 'Her paket özelliği metin olmalıdır.' }) @MinLength(2, { each: true, message: 'Her paket özelliği en az 2 karakter olmalıdır.' }) @MaxLength(180, { each: true, message: 'Her paket özelliği en fazla 180 karakter olabilir.' })
  features: string[];

  @Transform(trim) @IsString({ message: 'Paket etiketi metin olmalıdır.' }) @MaxLength(50, { message: 'Paket etiketi en fazla 50 karakter olabilir.' })
  badge: string;

  @IsInt({ message: 'Sıralama değeri tam sayı olmalıdır.' }) @Min(0, { message: 'Sıralama değeri negatif olamaz.' }) @Max(10000, { message: 'Sıralama değeri en fazla 10000 olabilir.' })
  sortOrder: number;

  @IsIn(['monthly', 'yearly', 'one-time'], { message: 'Geçerli bir paket dönemi seçin.' })
  period: string;

  @IsIn(['fixed', 'student-level'], { message: 'Geçerli bir sınıf atama yöntemi seçin.' })
  gradePolicy: 'fixed' | 'student-level';

  @Transform(({ value }) => Array.isArray(value) ? value.map(item => typeof item === 'string' ? item.toLowerCase() : item) : value)
  @IsArray({ message: 'Paket sınıfları bir liste olmalıdır.' }) @ArrayMaxSize(20, { message: 'En fazla 20 sınıf seçilebilir.' }) @ArrayUnique({ message: 'Aynı sınıf birden fazla kez seçilemez.' }) @IsMongoId({ each: true, message: 'Geçerli sınıflar seçilmelidir.' })
  gradeIds: string[];
}

export class CreatePackageDto extends PackageFieldsDto {
  subtitle = '';
  originalPrice = 0;
  isActive = false;
  features: string[] = [];
  badge = '';
  sortOrder = 0;
  period = 'monthly';
  gradePolicy: 'fixed' | 'student-level' = 'fixed';
  gradeIds: string[] = [];
}

/** Undefined fields are skipped by the service; null and unknown fields are rejected. */
export class UpdatePackageDto extends PackageFieldsDto {}
