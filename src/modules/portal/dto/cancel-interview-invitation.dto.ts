import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const trimString = (value: unknown) => String(value ?? '').trim();

export class CancelInterviewInvitationDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty({
    message: 'Vui lòng nhập lý do hủy lời mời phỏng vấn.',
  })
  @MaxLength(2000, {
    message: 'Lý do hủy lời mời phỏng vấn không được vượt quá 2.000 ký tự.',
  })
  lyDoHuy!: string;
}
