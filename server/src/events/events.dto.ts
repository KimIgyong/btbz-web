import { IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class DownloadEventDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  file: string;

  @IsIn(['windows', 'macos', 'android'])
  platform: 'windows' | 'macos' | 'android';

  @IsString()
  @Matches(/^[0-9]+(\.[0-9]+)*$/, { message: 'version must look like 1.1.2' })
  @MaxLength(20)
  version: string;
}

export class PageViewDto {
  @IsIn(['download'])
  page: 'download';
}
