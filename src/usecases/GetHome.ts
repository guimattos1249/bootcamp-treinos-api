import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

import { WeekDay } from "../generated/prisma/enums.js";
import { prisma } from "../lib/db.js";

dayjs.extend(utc);

interface InputDto {
  userId: string;
  date: string;
}

interface OutputDto {
  activeWorkoutPlanId: string | null;
  todayWorkoutDay: {
    workoutPlanId: string;
    id: string;
    name: string;
    isRest: boolean;
    weekDay: WeekDay;
    estimatedDurationInSeconds: number;
    coverImageUrl?: string;
    exercisesCount: number;
  } | null;
  workoutStreak: number;
  consistencyByDay: Record<
    string,
    {
      workoutDayCompleted: boolean;
      workoutDayStarted: boolean;
    }
  >;
}

const WEEKDAY_ORDER: Record<WeekDay, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

const DAYJS_WEEKDAY_FROM_UTC: Record<number, WeekDay> = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

export class GetHome {
  async execute(dto: InputDto): Promise<OutputDto> {
    const targetDateUtc = dayjs.utc(dto.date, "YYYY-MM-DD");

    const dayOfWeek = targetDateUtc.day();
    const weekStart = targetDateUtc.subtract(dayOfWeek, "day").startOf("day");
    const weekEnd = weekStart.add(6, "day").endOf("day");

    const activeWorkoutPlan = await prisma.workoutPlan.findFirst({
      where: {
        userId: dto.userId,
        isActive: true,
      },
      include: {
        workoutDays: {
          include: {
            exercises: true,
            sessions: true,
          },
        },
      },
    });

    let todayWorkoutDay: OutputDto["todayWorkoutDay"] = null;
    let workoutStreak = 0;

    if (activeWorkoutPlan) {
      const todayWeekDayEnum = DAYJS_WEEKDAY_FROM_UTC[dayOfWeek];

      const todayWorkoutDayEntity = activeWorkoutPlan.workoutDays.find(
        (day) => day.weekDay === todayWeekDayEnum,
      );

      if (todayWorkoutDayEntity) {
        todayWorkoutDay = {
          workoutPlanId: activeWorkoutPlan.id,
          id: todayWorkoutDayEntity.id,
          name: todayWorkoutDayEntity.name,
          isRest: todayWorkoutDayEntity.isRest,
          weekDay: todayWorkoutDayEntity.weekDay,
          estimatedDurationInSeconds:
            todayWorkoutDayEntity.estimatedDurationInSeconds,
          coverImageUrl: todayWorkoutDayEntity.coverImageUrl ?? undefined,
          exercisesCount: todayWorkoutDayEntity.exercises.length,
        };
      }

      const orderedWorkoutDays = [...activeWorkoutPlan.workoutDays].sort(
        (a, b) => WEEKDAY_ORDER[a.weekDay] - WEEKDAY_ORDER[b.weekDay],
      );

      for (const day of orderedWorkoutDays) {
        const hasCompletedSession = day.sessions.some(
          (session) => session.completedAt !== null,
        );

        if (hasCompletedSession) {
          workoutStreak += 1;
        } else {
          break;
        }
      }
    }

    const consistencyByDay: OutputDto["consistencyByDay"] = {};

    for (let i = 0; i < 7; i += 1) {
      const currentDate = weekStart.add(i, "day");
      const key = currentDate.format("YYYY-MM-DD");
      consistencyByDay[key] = {
        workoutDayCompleted: false,
        workoutDayStarted: false,
      };
    }

    const sessionsInWeek = await prisma.workoutSession.findMany({
      where: {
        startedAt: {
          gte: weekStart.toDate(),
          lte: weekEnd.toDate(),
        },
        workoutDay: {
          workoutPlan: {
            userId: dto.userId,
          },
        },
      },
    });

    for (const session of sessionsInWeek) {
      const sessionDateKey = dayjs.utc(session.startedAt).format("YYYY-MM-DD");

      const summaryForDay = consistencyByDay[sessionDateKey];

      if (!summaryForDay) {
        // Should not happen, but guard just in case of timezone issues.
        continue;
      }

      summaryForDay.workoutDayStarted = true;

      if (session.completedAt) {
        summaryForDay.workoutDayCompleted = true;
      }
    }

    return {
      activeWorkoutPlanId: activeWorkoutPlan?.id ?? null,
      todayWorkoutDay,
      workoutStreak,
      consistencyByDay,
    };
  }
}
