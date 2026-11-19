import { IsMongoId, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UploadLessonVideoDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(2) @MaxLength(180)
  title: string;

  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @IsMongoId()
  gradeId: string;

  @IsMongoId()
  subjectId: string;

  @IsOptional() @IsMongoId()
  topicId?: string;
}

export class UpdateLessonVideoDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(2) @MaxLength(180)
  title: string;

  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;
}
