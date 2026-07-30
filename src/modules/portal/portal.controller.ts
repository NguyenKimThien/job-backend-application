import {
  ArgumentsHost,
  BadRequestException,
  Body,
  Catch,
  Controller,
  Delete,
  ExceptionFilter,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  PayloadTooLargeException,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { createReadStream } from 'node:fs';
import { memoryStorage } from 'multer';
import { VaiTroTaiKhoan } from '../../../generated/prisma/client.js';
import type { AuthenticatedRequest } from '../../common/auth/jwt-auth.guard.js';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard.js';
import { Roles } from '../../common/auth/roles.decorator.js';
import { RolesGuard } from '../../common/auth/roles.guard.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { PortalService } from './portal.service.js';

const cvUploadInterceptor = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

@Catch(BadRequestException, PayloadTooLargeException)
class CvUploadExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const exceptionResponse = exception.getResponse();
    const rawMessage =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : Array.isArray((exceptionResponse as any).message)
          ? (exceptionResponse as any).message.join(' ')
          : String((exceptionResponse as any).message ?? '');
    const message =
      exception instanceof PayloadTooLargeException ||
      /LIMIT_FILE_SIZE|too large/i.test(rawMessage)
        ? 'Dung lượng CV không được vượt quá 5 MB.'
        : /LIMIT_UNEXPECTED_FILE|Unexpected field/i.test(rawMessage)
          ? 'Vui lòng gửi file CV với tên field là file.'
          : 'CV chỉ được phép có định dạng PDF.';

    response.status(HttpStatus.BAD_REQUEST).json({
      code: 'INVALID_CV_UPLOAD',
      message,
    });
  }
}

@Controller()
export class PublicPortalController {
  constructor(private readonly portal: PortalService) {}

  @Get('categories')
  categories() {
    return this.portal.categories();
  }

  @Get('fields')
  fields() {
    return this.portal.fields();
  }

  @Get('jobs')
  jobs(@Query() query: Record<string, string | undefined>) {
    return this.portal.jobs(query);
  }

  @Get('jobs/:id')
  job(@Param('id', ParseIntPipe) id: number) {
    return this.portal.jobDetail(id);
  }

  @Get('companies/:id')
  company(@Param('id', ParseIntPipe) id: number) {
    return this.portal.companyDetail(id);
  }

  @Post('auth/forgot-password')
  forgotPassword(@Body() body: Record<string, any>) {
    return this.portal.forgotPassword(body);
  }

  @Post('auth/reset-password')
  resetPassword(@Body() body: Record<string, any>) {
    return this.portal.resetPassword(body);
  }
}

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProtectedPortalController {
  constructor(private readonly portal: PortalService) {}

  @Get('worker/profile')
  @Roles(VaiTroTaiKhoan.NGUOI_LAO_DONG)
  workerProfile(@Req() request: AuthenticatedRequest) {
    return this.portal.workerProfile(request.user.sub);
  }

  @Patch('worker/profile')
  @Roles(VaiTroTaiKhoan.NGUOI_LAO_DONG)
  updateWorkerProfile(
    @Req() request: AuthenticatedRequest,
    @Body() body: Record<string, any>,
  ) {
    return this.portal.updateWorkerProfile(request.user.sub, body);
  }

  @Get('worker/profile/cv')
  @Roles(VaiTroTaiKhoan.NGUOI_LAO_DONG)
  workerCv(@Req() request: AuthenticatedRequest) {
    return this.portal.workerCv(request.user.sub);
  }

  @Post('worker/profile/cv')
  @Roles(VaiTroTaiKhoan.NGUOI_LAO_DONG)
  @UseFilters(CvUploadExceptionFilter)
  @UseInterceptors(cvUploadInterceptor)
  uploadWorkerCv(
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file?: any,
  ) {
    return this.portal.uploadWorkerCv(request.user.sub, file);
  }

  @Get('worker/profile/cv/view')
  @Roles(VaiTroTaiKhoan.NGUOI_LAO_DONG)
  async viewWorkerCv(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.portal.workerCvStream(request.user.sub);
    return streamCv(response, file, 'inline');
  }

  @Get('worker/profile/cv/download')
  @Roles(VaiTroTaiKhoan.NGUOI_LAO_DONG)
  async downloadWorkerCv(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.portal.workerCvStream(request.user.sub);
    return streamCv(response, file, 'attachment');
  }

  @Delete('worker/profile/cv')
  @Roles(VaiTroTaiKhoan.NGUOI_LAO_DONG)
  deleteWorkerCv(@Req() request: AuthenticatedRequest) {
    return this.portal.deleteWorkerCv(request.user.sub);
  }

  @Post('worker/applications/:jobId')
  @Roles(VaiTroTaiKhoan.NGUOI_LAO_DONG)
  @UseFilters(CvUploadExceptionFilter)
  @UseInterceptors(cvUploadInterceptor)
  apply(
    @Req() request: AuthenticatedRequest,
    @Param('jobId', ParseIntPipe) jobId: number,
    @Body() body: Record<string, any>,
    @UploadedFile() file?: any,
  ) {
    return this.portal.apply(request.user.sub, jobId, body, file);
  }

  @Get('worker/applications')
  @Roles(VaiTroTaiKhoan.NGUOI_LAO_DONG)
  applications(@Req() request: AuthenticatedRequest) {
    return this.portal.workerApplications(request.user.sub);
  }

  @Get('worker/saved-jobs')
  @Roles(VaiTroTaiKhoan.NGUOI_LAO_DONG)
  savedJobs(@Req() request: AuthenticatedRequest) {
    return this.portal.savedJobs(request.user.sub);
  }

  @Post('worker/saved-jobs/:jobId')
  @Roles(VaiTroTaiKhoan.NGUOI_LAO_DONG)
  saveJob(
    @Req() request: AuthenticatedRequest,
    @Param('jobId', ParseIntPipe) jobId: number,
  ) {
    return this.portal.saveJob(request.user.sub, jobId);
  }

  @Delete('worker/saved-jobs/:jobId')
  @Roles(VaiTroTaiKhoan.NGUOI_LAO_DONG)
  unsaveJob(
    @Req() request: AuthenticatedRequest,
    @Param('jobId', ParseIntPipe) jobId: number,
  ) {
    return this.portal.unsaveJob(request.user.sub, jobId);
  }

  @Get('employer/profile')
  @Roles(VaiTroTaiKhoan.NHA_TUYEN_DUNG)
  employerProfile(@Req() request: AuthenticatedRequest) {
    return this.portal.employerProfile(request.user.sub);
  }

  @Patch('employer/profile')
  @Roles(VaiTroTaiKhoan.NHA_TUYEN_DUNG)
  updateEmployerProfile(
    @Req() request: AuthenticatedRequest,
    @Body() body: Record<string, any>,
  ) {
    return this.portal.updateEmployerProfile(request.user.sub, body);
  }

  @Get('employer/jobs')
  @Roles(VaiTroTaiKhoan.NHA_TUYEN_DUNG)
  employerJobs(@Req() request: AuthenticatedRequest) {
    return this.portal.employerJobs(request.user.sub);
  }

  @Post('employer/jobs')
  @Roles(VaiTroTaiKhoan.NHA_TUYEN_DUNG)
  createEmployerJob(
    @Req() request: AuthenticatedRequest,
    @Body() body: Record<string, any>,
  ) {
    return this.portal.createEmployerJob(request.user.sub, body);
  }

  @Get('employer/jobs/:jobId')
  @Roles(VaiTroTaiKhoan.NHA_TUYEN_DUNG)
  employerJob(
    @Req() request: AuthenticatedRequest,
    @Param('jobId', ParseIntPipe) jobId: number,
  ) {
    return this.portal.employerJob(request.user.sub, jobId);
  }

  @Patch('employer/jobs/:jobId')
  @Roles(VaiTroTaiKhoan.NHA_TUYEN_DUNG)
  updateEmployerJob(
    @Req() request: AuthenticatedRequest,
    @Param('jobId', ParseIntPipe) jobId: number,
    @Body() body: Record<string, any>,
  ) {
    return this.portal.updateEmployerJob(request.user.sub, jobId, body);
  }

  @Get('employer/jobs/:jobId/applicants')
  @Roles(VaiTroTaiKhoan.NHA_TUYEN_DUNG)
  employerApplicants(
    @Req() request: AuthenticatedRequest,
    @Param('jobId', ParseIntPipe) jobId: number,
  ) {
    return this.portal.employerApplicants(request.user.sub, jobId);
  }

  @Get('employer/jobs/:jobId/applicants/:id')
  @Roles(VaiTroTaiKhoan.NHA_TUYEN_DUNG)
  employerApplicant(
    @Req() request: AuthenticatedRequest,
    @Param('jobId', ParseIntPipe) jobId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.portal.employerApplicant(request.user.sub, jobId, id);
  }

  @Get('employer/jobs/:jobId/applicants/:id/cv/view')
  @Roles(VaiTroTaiKhoan.NHA_TUYEN_DUNG)
  async viewEmployerApplicantCv(
    @Req() request: AuthenticatedRequest,
    @Param('jobId', ParseIntPipe) jobId: number,
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.portal.employerApplicationCvStream(
      request.user.sub,
      jobId,
      id,
    );
    return streamCv(response, file, 'inline');
  }

  @Get('employer/jobs/:jobId/applicants/:id/cv/download')
  @Roles(VaiTroTaiKhoan.NHA_TUYEN_DUNG)
  async downloadEmployerApplicantCv(
    @Req() request: AuthenticatedRequest,
    @Param('jobId', ParseIntPipe) jobId: number,
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.portal.employerApplicationCvStream(
      request.user.sub,
      jobId,
      id,
    );
    return streamCv(response, file, 'attachment');
  }

  @Patch('employer/jobs/:jobId/applicants/:id/status')
  @Roles(VaiTroTaiKhoan.NHA_TUYEN_DUNG)
  updateApplicationStatus(
    @Req() request: AuthenticatedRequest,
    @Param('jobId', ParseIntPipe) jobId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, any>,
  ) {
    return this.portal.updateApplicationStatus(request.user.sub, jobId, id, body);
  }

  @Get('notifications')
  notifications(@Req() request: AuthenticatedRequest) {
    return this.portal.notifications(request.user.sub);
  }

  @Patch('notifications/read-all')
  readAllNotifications(@Req() request: AuthenticatedRequest) {
    return this.portal.readAllNotifications(request.user.sub);
  }

  @Patch('notifications/:id/read')
  readNotification(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.portal.readNotification(request.user.sub, id);
  }

  @Post('account/logout')
  logout() {
    return { success: true, message: 'Đăng xuất thành công. Hãy xóa access token ở trình duyệt.' };
  }

  @Patch('account/password')
  changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() body: ChangePasswordDto,
  ) {
    return this.portal.changePassword(request.user.sub, body);
  }

  @Get('admin/categories')
  @Roles(VaiTroTaiKhoan.QUAN_TRI_VIEN)
  adminCategories() {
    return this.portal.adminCategories();
  }

  @Post('admin/categories')
  @Roles(VaiTroTaiKhoan.QUAN_TRI_VIEN)
  createCategory(@Body() body: Record<string, any>) {
    return this.portal.saveCategory(body);
  }

  @Patch('admin/categories/:id')
  @Roles(VaiTroTaiKhoan.QUAN_TRI_VIEN)
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, any>,
  ) {
    return this.portal.saveCategory(body, id);
  }

  @Delete('admin/categories/:id')
  @Roles(VaiTroTaiKhoan.QUAN_TRI_VIEN)
  deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return this.portal.deleteCategory(id);
  }

  @Get('admin/employers')
  @Roles(VaiTroTaiKhoan.QUAN_TRI_VIEN)
  adminEmployers() {
    return this.portal.adminEmployers();
  }

  @Get('admin/employers/:id')
  @Roles(VaiTroTaiKhoan.QUAN_TRI_VIEN)
  adminEmployer(@Param('id', ParseIntPipe) id: number) {
    return this.portal.adminEmployer(id);
  }

  @Patch('admin/employers/:id/review')
  @Roles(VaiTroTaiKhoan.QUAN_TRI_VIEN)
  reviewEmployer(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, any>,
  ) {
    return this.portal.reviewEmployer(request.user.sub, id, body);
  }

  @Get('admin/jobs')
  @Roles(VaiTroTaiKhoan.QUAN_TRI_VIEN)
  adminJobs() {
    return this.portal.adminJobs();
  }

  @Get('admin/jobs/:id')
  @Roles(VaiTroTaiKhoan.QUAN_TRI_VIEN)
  adminJob(@Param('id', ParseIntPipe) id: number) {
    return this.portal.adminJob(id);
  }

  @Patch('admin/jobs/:id/review')
  @Roles(VaiTroTaiKhoan.QUAN_TRI_VIEN)
  reviewJob(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, any>,
  ) {
    return this.portal.reviewJob(request.user.sub, id, body);
  }

  @Get('admin/statistics')
  @Roles(VaiTroTaiKhoan.QUAN_TRI_VIEN)
  statistics(@Query() query: Record<string, string | undefined>) {
    return this.portal.statistics(query);
  }

  @Get('admin/reports/export')
  @Roles(VaiTroTaiKhoan.QUAN_TRI_VIEN)
  async exportReport(
    @Query() query: Record<string, string | undefined>,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="bao-cao-viec-lam-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    return this.portal.exportStatistics(query);
  }
}

function streamCv(
  response: Response,
  file: {
    absolutePath: string;
    fileName: string;
    mimeType: string;
    size: number;
  },
  disposition: 'inline' | 'attachment',
) {
  response.setHeader('Content-Type', file.mimeType);
  response.setHeader('Content-Length', String(file.size));
  response.setHeader(
    'Content-Disposition',
    contentDisposition(disposition, file.fileName),
  );
  return new StreamableFile(createReadStream(file.absolutePath));
}

function contentDisposition(disposition: 'inline' | 'attachment', fileName: string) {
  const fallback = fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/[\\"]/g, '_');
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
