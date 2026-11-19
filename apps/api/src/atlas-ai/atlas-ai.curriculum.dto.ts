import { Type, Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsMongoId, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';

export class AtlasCurriculumQueryDto {
  @IsOptional() @IsMongoId() studentId?: string;
  @IsOptional() @IsMongoId() topicId?: string;
  @IsOptional() @IsMongoId() gradeId?: string;
}

export class AtlasCurriculumOutcomeDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @IsNotEmpty() @MaxLength(80) code: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @IsNotEmpty() @MaxLength(1500) text: string;
}

export class AtlasCurriculumDraftDto {
  @IsMongoId() topicId: string;
  @IsMongoId() gradeId: string;
  @Matches(/^20\d{2}-20\d{2}$/) schoolYear: string;
  @IsString() @IsNotEmpty() @MaxLength(120) version: string;
  @IsIn(['TYMM', 'PREVIOUS']) program: 'TYMM' | 'PREVIOUS';
  @IsString() @MaxLength(2000) sourceUrl: string;
  @IsString() @IsNotEmpty() @MaxLength(200) sourceTitle: string;
  @IsString() @IsNotEmpty() @MaxLength(200) sourceLocator: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(40)
  @ValidateNested({ each: true }) @Type(() => AtlasCurriculumOutcomeDto)
  outcomes: AtlasCurriculumOutcomeDto[];
}

export class AtlasCurriculumReviewDto {
  @Matches(/^[a-f0-9]{64}$/) contentHash: string;
  @IsString() @IsNotEmpty() @MaxLength(1000) reviewNote: string;
}
