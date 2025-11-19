import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Traffic monitoring routers
  traffic: router({
    // Get recent traffic logs
    getLogs: protectedProcedure
      .input(z.object({ limit: z.number().default(100), offset: z.number().default(0) }))
      .query(({ input }) => db.getTrafficLogs(input.limit, input.offset)),

    // Get traffic by type
    getByType: protectedProcedure
      .input(z.object({ trafficType: z.string() }))
      .query(({ input }) => db.getTrafficByType(input.trafficType)),

    // Get active flows
    getActiveFlows: protectedProcedure.query(() => db.getActiveFlows()),

    // Insert traffic log
    insertLog: protectedProcedure
      .input(z.object({
        sourceIp: z.string(),
        destinationIp: z.string(),
        sourcePort: z.number().optional(),
        destinationPort: z.number().optional(),
        protocol: z.string(),
        trafficType: z.enum(["video", "voice", "file", "background", "unknown"]),
        packetSize: z.number(),
        throughput: z.number().optional(),
        priority: z.number().optional(),
      }))
      .mutation(({ input }) => db.insertTrafficLog(input as any)),
  }),

  // AI Predictions routers
  predictions: router({
    // Get predictions
    getAll: protectedProcedure
      .input(z.object({ trafficType: z.string().optional(), limit: z.number().default(100) }))
      .query(({ input }) => db.getPredictions(input.trafficType, input.limit)),

    // Insert prediction
    insert: protectedProcedure
      .input(z.object({
        trafficType: z.enum(["video", "voice", "file", "background"]),
        predictedBandwidth: z.number(),
        confidence: z.number(),
        actualBandwidth: z.number().optional(),
        error: z.number().optional(),
      }))
      .mutation(({ input }) => db.insertPrediction(input as any)),
  }),

  // QoS Rules routers
  qos: router({
    // Get QoS rules
    getRules: protectedProcedure.query(() => db.getQosRules()),
  }),

  // Network monitoring routers
  network: router({
    // Get network interfaces
    getInterfaces: protectedProcedure.query(() => db.getNetworkInterfaces()),

    // Get network statistics
    getStats: protectedProcedure.query(() => db.getNetworkStats()),

    // Get active flows
    getFlows: protectedProcedure.query(() => db.getActiveFlows()),
  }),

  // System alerts routers
  alerts: router({
    // Get system alerts
    getAlerts: protectedProcedure
      .input(z.object({ unresolved: z.boolean().default(true), limit: z.number().default(50) }))
      .query(({ input }) => db.getSystemAlerts(input.unresolved, input.limit)),

    // Insert alert
    insertAlert: protectedProcedure
      .input(z.object({
        severity: z.enum(["info", "warning", "critical"]),
        title: z.string(),
        message: z.string(),
        relatedFlowId: z.number().optional(),
      }))
      .mutation(({ input }) => db.insertSystemAlert(input as any)),
  }),
});

export type AppRouter = typeof appRouter;
