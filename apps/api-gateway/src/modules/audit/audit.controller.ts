import { Controller, Get, Delete, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '@shared/decorators/roles.decorator';
import { ApiResponseDto } from '@shared/dto/api-response.dto';
import { AuditService } from '@shared/services/audit.service';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('admin')
  async listAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.auditService.findAll(
      page ? parseInt(page) : 1,
      Math.min(500, limit ? parseInt(limit) : 20),
      { action, search },
    );
    return ApiResponseDto.ok(result);
  }

  @Delete(':id')
  @Roles('admin')
  async deleteAuditLog(@Param('id') id: string, @Req() req: any) {
    await this.auditService.deleteOne(id);
    await this.auditService.log({
      userId: req.user?.id,
      username: req.user?.username || 'admin',
      action: 'delete_audit_log',
      target: `audit_log:${id}`,
      ipAddress: req.ip,
    });
    return ApiResponseDto.ok({ deleted: true });
  }

  @Delete()
  @Roles('admin')
  async deleteAllAuditLogs(@Req() req: any) {
    const count = await this.auditService.deleteAll();
    // Log the clear action (this creates a new entry after the delete)
    await this.auditService.log({
      userId: req.user?.id,
      username: req.user?.username || 'admin',
      action: 'clear_all_audit_logs',
      target: 'audit_logs',
      details: `Deleted ${count} entries`,
      ipAddress: req.ip,
    });
    return ApiResponseDto.ok({ deleted: count });
  }
}
