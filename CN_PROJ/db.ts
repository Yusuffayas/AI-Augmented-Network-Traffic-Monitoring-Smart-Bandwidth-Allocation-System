import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, trafficLogs, predictions, qosRules, networkInterfaces, activeFlows, systemAlerts, InsertTrafficLog, InsertPrediction, InsertActiveFlow, InsertSystemAlert } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Traffic monitoring queries
export async function getTrafficLogs(limit: number = 100, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trafficLogs).limit(limit).offset(offset).orderBy(desc(trafficLogs.timestamp));
}

export async function getActiveFlows() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activeFlows).orderBy(desc(activeFlows.lastSeen));
}

export async function getTrafficByType(trafficType: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trafficLogs).where(eq(trafficLogs.trafficType, trafficType as any)).orderBy(desc(trafficLogs.timestamp)).limit(100);
}

export async function getPredictions(trafficType?: string, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  if (trafficType) {
    return db.select().from(predictions).where(eq(predictions.trafficType, trafficType as any)).orderBy(desc(predictions.timestamp)).limit(limit);
  }
  return db.select().from(predictions).orderBy(desc(predictions.timestamp)).limit(limit);
}

export async function getQosRules() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(qosRules).orderBy(qosRules.priority);
}

export async function getNetworkInterfaces() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(networkInterfaces);
}

export async function getSystemAlerts(unresolved: boolean = true, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  if (unresolved) {
    return db.select().from(systemAlerts).where(eq(systemAlerts.resolved, false)).orderBy(desc(systemAlerts.createdAt)).limit(limit);
  }
  return db.select().from(systemAlerts).orderBy(desc(systemAlerts.createdAt)).limit(limit);
}

export async function insertTrafficLog(data: InsertTrafficLog) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(trafficLogs).values(data);
  return result;
}

export async function insertPrediction(data: InsertPrediction) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(predictions).values(data);
  return result;
}

export async function insertActiveFlow(data: InsertActiveFlow) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(activeFlows).values(data);
  return result;
}

export async function updateActiveFlow(flowId: number, data: Partial<InsertActiveFlow>) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.update(activeFlows).set(data).where(eq(activeFlows.id, flowId));
  return result;
}

export async function insertSystemAlert(data: InsertSystemAlert) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(systemAlerts).values(data);
  return result;
}

export async function getNetworkStats() {
  const db = await getDb();
  if (!db) return null;
  const interfaces = await db.select().from(networkInterfaces);
  const flows = await db.select().from(activeFlows);
  const recentLogs = await db.select().from(trafficLogs).orderBy(desc(trafficLogs.timestamp)).limit(1000);
  
  return {
    interfaces,
    flows,
    recentLogs,
  };
}


