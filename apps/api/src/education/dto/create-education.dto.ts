import { IsNotEmpty, IsNumber, IsOptional, IsString, IsMongoId, Min, Max, IsInt, ValidateIf } from 'class-validator';

export class CreateGradeDto {
    @IsNumber()
    @Min(1)
    @Max(12)
    level: number;

    @IsOptional()
    @IsString()
    label?: string;
}

export class CreateSubjectDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsOptional()
    @IsMongoId()
    gradeId?: string;

    @ValidateIf((subject: CreateSubjectDto) => !subject.gradeId || subject.gradeLevel !== undefined)
    @IsInt()
    @Min(1)
    @Max(12)
    gradeLevel?: number;

    @IsOptional()
    @IsString()
    icon?: string;
}

export class CreateUnitDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsMongoId()
    subjectId: string;

    @IsOptional()
    @IsNumber()
    order?: number;
}

export class CreateTopicDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsMongoId()
    unitId: string;

    @IsOptional()
    @IsNumber()
    order?: number;

    @IsOptional()
    @IsString()
    objective?: string;
}
