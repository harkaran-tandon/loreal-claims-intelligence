import { Body, Controller, Post } from '@nestjs/common';
import { AssessClaimDto } from './dto/assess-claim.dto.js';
import { ClaimsService } from './claims.service.js';

@Controller('claims')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post('assess')
  assess(@Body() dto: AssessClaimDto) {
    return this.claimsService.assess(dto);
  }
}
