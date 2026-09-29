import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
  Validate,
  ValidateNested,
  ValidatorConstraint,
} from 'class-validator';
import type { ValidatorConstraintInterface } from 'class-validator';

export const ATLAS_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export const ATLAS_IMAGE_MAX_LENGTH =
  Math.ceil(ATLAS_IMAGE_MAX_BYTES / 3) * 4 + 64;

@ValidatorConstraint({ name: 'atlasImage', async: false })
export class AtlasImageValidator implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string' || value.length > ATLAS_IMAGE_MAX_LENGTH)
      return false;
    const prefix = /^data:image\/(png|jpeg|webp);base64,/.exec(value);
    if (!prefix) return false;
    const payload = value.slice(prefix[0].length);
    if (
      !payload.length ||
      payload.length % 4 !== 0 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(payload)
    )
      return false;
    const bytes = Buffer.from(payload, 'base64');
    if (bytes.length > ATLAS_IMAGE_MAX_BYTES || bytes.length < 12) return false;
    if (prefix[1] === 'png')
      return bytes
        .subarray(0, 8)
        .equals(Buffer.from('89504e470d0a1a0a', 'hex'));
    if (prefix[1] === 'jpeg')
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    return (
      bytes.toString('ascii', 0, 4) === 'RIFF' &&
      bytes.toString('ascii', 8, 12) === 'WEBP'
    );
  }

  defaultMessage(): string {
    return 'Görsel en fazla 4 MB boyutunda PNG, JPEG veya WebP olmalıdır.';
  }
}

export class AtlasHistoryMessageDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(4000)
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(ATLAS_IMAGE_MAX_LENGTH)
  @Validate(AtlasImageValidator)
  image?: string;
}

@ValidatorConstraint({ name: 'atlasHistoryImages', async: false })
class AtlasHistoryImagesValidator implements ValidatorConstraintInterface {
  validate(history: AtlasHistoryMessageDto[]) {
    if (!Array.isArray(history)) return false;
    const images = history.filter((message) => message?.image != null);
    return images.length <= 1 && images.every((message) => message.role === 'user');
  }
  defaultMessage() { return 'Geçmişte yalnızca bir kullanıcı mesajı soru görseli içerebilir.'; }
}

export class AtlasChatDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Validate(AtlasHistoryImagesValidator)
  @Type(() => AtlasHistoryMessageDto)
  history?: AtlasHistoryMessageDto[];

  @IsOptional()
  @IsString()
  @MaxLength(ATLAS_IMAGE_MAX_LENGTH)
  @Validate(AtlasImageValidator)
  image?: string;

  @IsOptional()
  @IsIn(['chat', 'image'])
  mode?: 'chat' | 'image';
}

export class AtlasInsightsQueryDto {
  @IsOptional()
  @IsMongoId()
  studentId?: string;
}

export class AtlasPlanDto extends AtlasInsightsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(180)
  dailyMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(8)
  @Max(20)
  startHour?: number;
}

export class AtlasPlanProgressDto {
  @IsMongoId()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  planId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  blockId: string;

  @IsBoolean()
  completed: boolean;
}
