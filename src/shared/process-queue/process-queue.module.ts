import { Module } from '@nestjs/common';
import { ProcessQueueService } from './process-queue/process-queue.service';

@Module({
  providers: [ProcessQueueService],
  exports: [ProcessQueueService],
})
export class ProcessQueueModule {}
