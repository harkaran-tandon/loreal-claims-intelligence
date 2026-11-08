import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AiModule } from './ai/ai.module.js';
import { ClaimsModule } from './claims/claims.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, AiModule, ClaimsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
