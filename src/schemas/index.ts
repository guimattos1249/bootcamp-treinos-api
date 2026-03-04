import z from "zod";
import { WeekDay } from "../generated/prisma/enums.js";

export const ErrorSchema = z.object({
  error: z.string(),
  code: z.string(),
});

export const WorkoutPlanSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1),
  workoutDays: z.array(
    z.object({
      name: z.string().trim().min(1),
      weekDay: z.enum(WeekDay),
      isRest: z.boolean().default(false),
      estimatedDurationInSeconds: z.number().min(1),
      coverImageUrl: z.url().optional(),
      exercises: z.array(
        z.object({
          order: z.number().min(0),
          name: z.string().trim().min(1),
          sets: z.number().min(1),
          reps: z.number().min(1),
          restTimeInSeconds: z.number().min(1),
        }),
      ),
    }),
  ),
});

export const StartWorkoutSessionParamsSchema = z.object({
  workoutPlanId: z.uuid(),
  workoutDayId: z.uuid(),
});

export const StartWorkoutSessionResponseSchema = z.object({
  userWorkoutSessionId: z.uuid(),
});

export const UpdateWorkoutSessionParamsSchema = z.object({
  workoutPlanId: z.uuid(),
  workoutDayId: z.uuid(),
  workoutSessionId: z.uuid(),
});

export const UpdateWorkoutSessionBodySchema = z.object({
  completedAt: z.iso.datetime(),
});

export const UpdateWorkoutSessionResponseSchema = z.object({
  id: z.uuid(),
  completedAt: z.iso.datetime(),
  startedAt: z.iso.datetime(),
});

export const HomeParamsSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in format YYYY-MM-DD"),
});

export const HomeResponseSchema = z.object({
  activeWorkoutPlanId: z.uuid().nullable(),
  todayWorkoutDay: z
    .object({
      workoutPlanId: z.uuid(),
      id: z.uuid(),
      name: z.string(),
      isRest: z.boolean(),
      weekDay: z.enum(WeekDay),
      estimatedDurationInSeconds: z.number(),
      coverImageUrl: z.url().optional(),
      exercisesCount: z.number(),
    })
    .nullable(),
  workoutStreak: z.number(),
  consistencyByDay: z.record(
    z.iso.date(),
    z.object({
      workoutDayCompleted: z.boolean(),
      workoutDayStarted: z.boolean(),
    }),
  ),
});

export const WorkoutPlanDetailsParamsSchema = z.object({
  workoutPlanId: z.uuid(),
});

export const WorkoutPlanDetailsResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  workoutDays: z.array(
    z.object({
      id: z.string().uuid(),
      weekDay: z.enum(WeekDay),
      name: z.string(),
      isRest: z.boolean(),
      coverImageUrl: z.string().url().optional(),
      estimatedDurationInSeconds: z.number(),
      exercisesCount: z.number(),
    }),
  ),
});
