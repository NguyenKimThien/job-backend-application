import { HttpException, HttpStatus } from '@nestjs/common';

export type ApiErrorBody = {
  code: string;
  message: string;
  retryAfter?: number;
};

export class ApiError extends HttpException {
  constructor(status: HttpStatus, body: ApiErrorBody) {
    super(body, status);
  }
}
