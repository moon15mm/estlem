import { IsArray, IsString, ArrayMinSize, IsOptional, IsEnum } from 'class-validator';
import { SpotType } from '@estlem/shared';

export class CreateParkingSpotsDto {
  @IsArray() @ArrayMinSize(1) @IsString({ each: true })
  spotNumbers: string[];

  @IsOptional() @IsEnum(SpotType)
  type?: SpotType;
}
