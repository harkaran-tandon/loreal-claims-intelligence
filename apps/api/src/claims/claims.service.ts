import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AiService } from '../ai/ai.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AssessClaimDto } from './dto/assess-claim.dto.js';

@Injectable()
export class ClaimsService {
  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  async assess(dto: AssessClaimDto) {
    const assessment = await this.aiService.assessClaim(
      dto.claim,
      dto.evidence,
    );

    try {
      const savedAssessment = await this.prisma.$transaction(
        async (transaction) => {
          const claim = await transaction.claim.create({
            data: {
              text: dto.claim,
            },
          });

          const saved = await transaction.assessment.create({
            data: {
              claimId: claim.id,
              evidence: dto.evidence,
              justified: assessment.justified,
              confidenceScore: assessment.confidenceScore,
              reasoning: assessment.reasoning,
              modelUsed: this.aiService.model,
            },
          });

          await transaction.claim.update({
            where: { id: claim.id },
            data: { status: 'ASSESSED' },
          });

          return saved;
        },
      );

      return {
        claimId: savedAssessment.claimId,
        assessmentId: savedAssessment.id,
        justified: savedAssessment.justified,
        confidenceScore: savedAssessment.confidenceScore,
        reasoning: savedAssessment.reasoning,
        mockMode: this.aiService.mockMode,
      };
    } catch {
      throw new InternalServerErrorException(
        'The assessment could not be saved.',
      );
    }
  }
}
