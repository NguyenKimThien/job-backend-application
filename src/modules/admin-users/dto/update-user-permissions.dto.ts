import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PermissionSelectionDto {
  @IsString()
  code!: string;

  @IsBoolean()
  allowed!: boolean;
}

export class UpdateUserPermissionsDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PermissionSelectionDto)
  permissions!: PermissionSelectionDto[];
}
