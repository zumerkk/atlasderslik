import { IsIn, IsMongoId, IsOptional } from 'class-validator';

export class AtlasMaterialQuery {
  @IsOptional() @IsMongoId() studentId?: string;
}
export class CreateAtlasMaterialDto extends AtlasMaterialQuery {
  @IsMongoId() topicId: string;
  @IsIn(['lesson', 'worksheet']) kind: 'lesson' | 'worksheet';
}
