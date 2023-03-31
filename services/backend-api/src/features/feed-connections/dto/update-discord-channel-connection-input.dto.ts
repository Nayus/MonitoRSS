import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { DiscordEmbed } from "../../../common";
import { FeedConnectionDisabledCode } from "../../feeds/constants";

class FiltersDto {
  @IsObject()
  expression: Record<string, unknown>;
}

class SplitOptions {
  @IsString()
  @IsOptional()
  @ValidateIf((v) => v !== null)
  appendChar?: string | null;

  @IsString()
  @IsOptional()
  @ValidateIf((v) => v !== null)
  prependChar?: string | null;

  @IsString()
  @IsOptional()
  @ValidateIf((v) => v !== null)
  splitChar?: string | null;
}

export class UpdateDiscordChannelConnectionInputDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  channelId?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsObject()
  @IsOptional()
  @Type(() => FiltersDto)
  @ValidateNested({ each: true })
  filters?: FiltersDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiscordEmbed)
  @IsOptional()
  embeds?: DiscordEmbed[];

  @IsIn([FeedConnectionDisabledCode.Manual, null])
  @IsOptional()
  disabledCode?: FeedConnectionDisabledCode.Manual | null;

  @IsOptional()
  @Type(() => SplitOptions)
  @ValidateNested()
  @IsObject()
  @ValidateIf((v) => v !== null)
  splitOptions?: SplitOptions | null;
}
