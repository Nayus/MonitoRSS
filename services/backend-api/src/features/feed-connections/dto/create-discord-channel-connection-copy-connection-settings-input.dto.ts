import { IsArray, IsEnum, IsNotEmpty, IsString } from "class-validator";

export enum CopyableSetting {
  Embeds = "embeds",
  WebhookName = "webhookName",
  WebhookIconUrl = "webhookIconUrl",
  WebhookThread = "webhookThread",
  PlaceholderLimits = "placeholderLimits",
  Content = "content",
  ContentFormatTables = "contentFormatTables",
  ContentStripImages = "contentStripImages",
  ContentDisableImageLinkPreviews = "contentDisableImageLinkPreviews",
  Components = "components",
  ForumThreadTitle = "forumThreadTitle",
  ForumThreadTags = "forumThreadTags",
  placeholderFallbackSetting = "placeholderFallbackSetting",
  Filters = "filters",
  SplitOptions = "splitOptions",
  CustomPlaceholders = "customPlaceholders",
}

export class CreateDiscordChannelConnectionCopyConnectionSettingsInputDto {
  @IsNotEmpty()
  @IsEnum(CopyableSetting, { each: true })
  @IsArray()
  properties: CopyableSetting[];

  @IsArray()
  @IsNotEmpty({ each: true })
  @IsString({ each: true })
  targetDiscordChannelConnectionIds: string[];
}
