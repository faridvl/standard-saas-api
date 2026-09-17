import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@medical-records/infrastructure/adapters/prisma/prisma.service';
import { AppointmentStatus } from '@medical-records/domain/types/appointment.types';

/** Marca EXPIRED cualquier cita CONFIRMED cuya fecha ya pasó, todos los días a medianoche. */
@Injectable()
export class ExpireAppointmentsJob {
  private readonly logger = new Logger(ExpireAppointmentsJob.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron(): Promise<void> {
    const { count } = await this.prisma.appointment.updateMany({
      where: {
        status: AppointmentStatus.CONFIRMED,
        startTime: { lt: new Date() },
      },
      data: { status: AppointmentStatus.EXPIRED },
    });

    if (count > 0) {
      this.logger.log(`${count} cita(s) CONFIRMED vencida(s) marcada(s) como EXPIRED`);
    }
  }
}
