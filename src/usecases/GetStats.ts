import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

import { prisma } from "../lib/db.js";

dayjs.extend(utc);

interface InputDto {
  userId: string;
  from: string;
  to: string;
}

interface OutputDto {
  workoutStreak: number;
  consistencyByDay: Record<
    string,
    {
      workoutDayCompleted: boolean;
      workoutDayStarted: boolean;
    }
  >;
  completedWorkoutsCount: number;
  conclusionRate: number;
  totalTimeInSeconds: number;
}

export class GetStats {
  async execute(dto: InputDto): Promise<OutputDto> {
    const fromDate = dayjs.utc(dto.from, "YYYY-MM-DD").startOf("day");
    const toDate = dayjs.utc(dto.to, "YYYY-MM-DD").endOf("day");

    const sessions = await prisma.workoutSession.findMany({
      where: {
        startedAt: {
          gte: fromDate.toDate(),
          lte: toDate.toDate(),
        },
        workoutDay: {
          workoutPlan: {
            userId: dto.userId,
          },
        },
      },
      include: {
        workoutDay: true,
      },
      orderBy: {
        startedAt: "asc",
      },
    });

    const consistencyByDay: OutputDto["consistencyByDay"] = {};

    for (const session of sessions) {
      const key = dayjs.utc(session.startedAt).format("YYYY-MM-DD");

      if (!consistencyByDay[key]) {
        consistencyByDay[key] = {
          workoutDayCompleted: false,
          workoutDayStarted: false,
        };
      }

      consistencyByDay[key].workoutDayStarted = true;

      if (session.completedAt) {
        consistencyByDay[key].workoutDayCompleted = true;
      }
    }

    const daysWithCompletedWorkouts = Object.values(consistencyByDay).filter(
      (day) => day.workoutDayCompleted,
    ).length;

    const totalSessions = sessions.length;

    const completedSessions = sessions.filter((session) => session.completedAt);

    const totalTimeInSeconds = completedSessions.reduce((acc, session) => {
      const startedAt = dayjs.utc(session.startedAt);
      const completedAt = dayjs.utc(session.completedAt);
      const diffInSeconds = completedAt.diff(startedAt, "second");
      return acc + diffInSeconds;
    }, 0);

    const conclusionRate =
      totalSessions === 0 ? 0 : completedSessions.length / totalSessions;

    const sortedDates = Object.keys(consistencyByDay).sort();

    let workoutStreak = 0;
    let currentStreak = 0;
    let previousDate: dayjs.Dayjs | null = null;

    for (const dateKey of sortedDates) {
      const summary = consistencyByDay[dateKey];
      const currentDate = dayjs.utc(dateKey, "YYYY-MM-DD");

      if (summary.workoutDayCompleted) {
        if (previousDate) {
          const diffDays = currentDate.diff(previousDate, "day");
          if (diffDays === 1) {
            currentStreak += 1;
          } else {
            currentStreak = 1;
          }
        } else {
          currentStreak = 1;
        }
        workoutStreak = Math.max(workoutStreak, currentStreak);
      }

      previousDate = currentDate;
    }

    return {
      workoutStreak,
      consistencyByDay,
      completedWorkoutsCount: daysWithCompletedWorkouts,
      conclusionRate,
      totalTimeInSeconds,
    };
  }
}
