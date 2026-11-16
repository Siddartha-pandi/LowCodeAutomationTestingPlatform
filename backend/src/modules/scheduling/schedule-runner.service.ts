import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SchedulesService } from './schedules.service';

@Injectable()
export class ScheduleRunnerService {
  private readonly logger = new Logger(ScheduleRunnerService.name);
  private isRunning = false;

  constructor(private readonly schedulesService: SchedulesService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCronScheduleCheck() {
    if (this.isRunning) {
      this.logger.debug('Previous schedule evaluation still running, skipping tick.');
      return;
    }

    this.isRunning = true;
    try {
      const result = await this.schedulesService.evaluateSchedulesNow();
      if (result.executions_triggered > 0) {
        this.logger.log(
          `Schedule runner tick: evaluated ${result.evaluated_count} due schedules, triggered ${result.executions_triggered} executions.`,
        );
      }
    } catch (err: any) {
      this.logger.error(`Error in schedule runner: ${err.message}`, err.stack);
    } finally {
      this.isRunning = false;
    }
  }
}
