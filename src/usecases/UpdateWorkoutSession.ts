import { NotFoundError } from "../errors/index.js";
import { prisma } from "../lib/db.js";

interface InputDto {
  userId: string;
  workoutPlanId: string;
  workoutDayId: string;
  workoutSessionId: string;
  completedAt: Date;
}

interface OutputDto {
  id: string;
  completedAt: string;
  startedAt: string;
}

export class UpdateWorkoutSession {
  async execute(dto: InputDto): Promise<OutputDto> {
    const sessionWithRelations = await prisma.workoutSession.findUnique({
      where: {
        id: dto.workoutSessionId,
      },
      include: {
        workoutDay: {
          include: {
            workoutPlan: true,
          },
        },
      },
    });

    if (
      !sessionWithRelations ||
      sessionWithRelations.workoutDay.workoutPlan.id !== dto.workoutPlanId ||
      sessionWithRelations.workoutDay.id !== dto.workoutDayId ||
      sessionWithRelations.workoutDay.workoutPlan.userId !== dto.userId
    ) {
      throw new NotFoundError("Workout session not found");
    }

    const updatedSession = await prisma.workoutSession.update({
      where: {
        id: dto.workoutSessionId,
      },
      data: {
        completedAt: dto.completedAt,
      },
    });

    return {
      id: updatedSession.id,
      completedAt:
        updatedSession.completedAt?.toISOString() ??
        dto.completedAt.toISOString(),
      startedAt: updatedSession.startedAt.toISOString(),
    };
  }
}
