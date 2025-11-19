import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Traffic logs table - stores captured network packets
export const trafficLogs = mysqlTable("traffic_logs", {
  id: int("id").autoincrement().primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  sourceIp: varchar("sourceIp", { length: 45 }).notNull(),
  destinationIp: varchar("destinationIp", { length: 45 }).notNull(),
  sourcePort: int("sourcePort"),
  destinationPort: int("destinationPort"),
  protocol: varchar("protocol", { length: 10 }).notNull(), // TCP, UDP, ICMP
  trafficType: mysqlEnum("trafficType", ["video", "voice", "file", "background", "unknown"]).notNull(),
  packetSize: int("packetSize").notNull(),
  throughput: decimal("throughput", { precision: 10, scale: 2 }), // Mbps
  priority: int("priority").default(0), // 0-3, higher is more important
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TrafficLog = typeof trafficLogs.$inferSelect;
export type InsertTrafficLog = typeof trafficLogs.$inferInsert;

// AI predictions table - stores bandwidth predictions
export const predictions = mysqlTable("predictions", {
  id: int("id").autoincrement().primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  trafficType: mysqlEnum("trafficType", ["video", "voice", "file", "background"]).notNull(),
  predictedBandwidth: decimal("predictedBandwidth", { precision: 10, scale: 2 }).notNull(), // Mbps
  confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(), // 0-100
  actualBandwidth: decimal("actualBandwidth", { precision: 10, scale: 2 }), // Actual observed
  error: decimal("error", { precision: 10, scale: 2 }), // Prediction error
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Prediction = typeof predictions.$inferSelect;
export type InsertPrediction = typeof predictions.$inferInsert;

// QoS rules table - stores quality of service policies
export const qosRules = mysqlTable("qos_rules", {
  id: int("id").autoincrement().primaryKey(),
  trafficType: mysqlEnum("trafficType", ["video", "voice", "file", "background"]).notNull().unique(),
  priority: int("priority").notNull(), // 0-3
  minBandwidth: decimal("minBandwidth", { precision: 10, scale: 2 }).notNull(), // Mbps
  maxBandwidth: decimal("maxBandwidth", { precision: 10, scale: 2 }).notNull(), // Mbps
  dscp: int("dscp"), // DSCP marking value
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QosRule = typeof qosRules.$inferSelect;
export type InsertQosRule = typeof qosRules.$inferInsert;

// Network interface monitoring table
export const networkInterfaces = mysqlTable("network_interfaces", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  macAddress: varchar("macAddress", { length: 17 }),
  mtu: int("mtu"),
  totalBandwidth: decimal("totalBandwidth", { precision: 10, scale: 2 }), // Mbps
  currentUsage: decimal("currentUsage", { precision: 10, scale: 2 }), // Mbps
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NetworkInterface = typeof networkInterfaces.$inferSelect;
export type InsertNetworkInterface = typeof networkInterfaces.$inferInsert;

// Active flows table - tracks current network flows
export const activeFlows = mysqlTable("active_flows", {
  id: int("id").autoincrement().primaryKey(),
  sourceIp: varchar("sourceIp", { length: 45 }).notNull(),
  destinationIp: varchar("destinationIp", { length: 45 }).notNull(),
  sourcePort: int("sourcePort"),
  destinationPort: int("destinationPort"),
  protocol: varchar("protocol", { length: 10 }).notNull(),
  trafficType: mysqlEnum("trafficType", ["video", "voice", "file", "background", "unknown"]).notNull(),
  currentBandwidth: decimal("currentBandwidth", { precision: 10, scale: 2 }).notNull(), // Mbps
  allocatedBandwidth: decimal("allocatedBandwidth", { precision: 10, scale: 2 }), // Mbps
  packetCount: int("packetCount").default(0),
  byteCount: int("byteCount").default(0),
  startTime: timestamp("startTime").defaultNow().notNull(),
  lastSeen: timestamp("lastSeen").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActiveFlow = typeof activeFlows.$inferSelect;
export type InsertActiveFlow = typeof activeFlows.$inferInsert;

// System alerts table
export const systemAlerts = mysqlTable("system_alerts", {
  id: int("id").autoincrement().primaryKey(),
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  relatedFlowId: int("relatedFlowId"),
  resolved: boolean("resolved").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

export type SystemAlert = typeof systemAlerts.$inferSelect;
export type InsertSystemAlert = typeof systemAlerts.$inferInsert;