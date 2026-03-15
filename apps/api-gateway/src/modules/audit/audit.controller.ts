import { Controller, Get, Query } from '@nestjs/common';
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
  async listAuditLogs(@Query('page') page?: string, @Query('limit') limit?: string) {
    const result = await this.auditService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
    return ApiResponseDto.ok(result);
  }
}
