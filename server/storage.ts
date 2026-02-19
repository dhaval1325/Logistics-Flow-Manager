
import { db as dbInstance } from "./db";
import { 
  users,
  dockets, docketItems, loadingSheets, loadingSheetDockets, manifests, thcs, pods,
  auditLogs,
  type User, type InsertUser,
  type Docket, type InsertDocket, type InsertDocketItem,
  type LoadingSheet, type InsertLoadingSheet,
  type LoadingSheetDocket,
  type Manifest, type InsertManifest,
  type CreateManifestRequest,
  type Thc, type InsertThc,
  type Pod, type InsertPod, type DocketItem,
  type AuditLog, type InsertAuditLog
} from "@shared/schema";
import { eq, desc, sql, inArray, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Dockets
  getDockets(status?: string, search?: string): Promise<(Docket & { items: DocketItem[] })[]>;
  getDocket(
    id: number,
  ): Promise<
    | (Docket & {
        items: DocketItem[];
        pod: Pod | null;
        loadingSheets: LoadingSheet[];
        manifests: Manifest[];
        thcs: Thc[];
      })
    | undefined
  >;
  getDocketTracker(id: number): Promise<{
    docketId: number;
    docketNumber: string;
    status: string;
    events: { key: string; label: string; timestamp: string | null; meta?: Record<string, any> }[];
  } | undefined>;
  createDocket(docket: InsertDocket & { items: InsertDocketItem[] }): Promise<Docket>;
  updateDocketTracking(
    id: number,
    fields: {
      geofenceLat?: string | null;
      geofenceLng?: string | null;
      geofenceRadiusKm?: string | null;
      currentLat?: string | null;
      currentLng?: string | null;
    },
  ): Promise<Docket>;
  updateDocketStatus(id: number, status: string): Promise<Docket>;

  // Loading Sheets
  getLoadingSheets(): Promise<LoadingSheet[]>;
  getLoadingSheet(
    id: number,
  ): Promise<(LoadingSheet & { dockets: Docket[]; manifests: Manifest[]; thcs: Thc[] }) | undefined>;
  createLoadingSheet(sheet: InsertLoadingSheet & { docketIds: number[] }): Promise<LoadingSheet>;
  finalizeLoadingSheet(id: number): Promise<LoadingSheet>;

  // Manifests
  getManifests(): Promise<Manifest[]>;
  getManifest(
    id: number,
  ): Promise<(Manifest & { loadingSheet: LoadingSheet; dockets: Docket[]; thc: Thc | null }) | undefined>;
  createManifest(manifest: CreateManifestRequest): Promise<Manifest>;

  // THCs
  getThcs(): Promise<Thc[]>;
  getThc(id: number): Promise<
    | (Thc & {
        manifest: Manifest | null;
        loadingSheet: LoadingSheet | null;
        dockets: Docket[];
      })
    | undefined
  >;
  createThc(thc: InsertThc): Promise<Thc>;
  updateThc(id: number, updates: Partial<InsertThc>): Promise<Thc>;

  // PODs
  getPods(): Promise<Pod[]>;
  getPod(id: number): Promise<Pod | undefined>;
  createPod(pod: InsertPod): Promise<Pod>;
  updatePodReview(id: number, status: "approved" | "rejected", rejectionReason?: string): Promise<Pod>;
  updatePodAnalysis(id: number, analysis: any): Promise<Pod>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: {
    action?: string;
    entityType?: string;
    entityId?: number;
    userId?: number;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]>;

  // Dashboard
  getDashboardStats(): Promise<{
    updatedAt: string;
    stats: {
      activeDockets: number;
      vehiclesInTransit: number;
      pendingPods: number;
      completedToday: number;
    };
    weekly: { name: string; dockets: number; revenue: number }[];
  }>;
}

function requireDb() {
  if (!dbInstance) {
    throw new Error("DATABASE_URL must be set to use database storage.");
  }
  return dbInstance;
}

function generateManifestNumber() {
  return `MAN-${Date.now().toString(36).toUpperCase()}`;
}

function toDateString(value: Date) {
  return value.toISOString().slice(0, 10);
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function buildWeeklyBuckets(reference: Date) {
  const start = startOfDay(addDays(reference, -6));
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    const key = toDateString(date);
    const name = date.toLocaleDateString("en-US", { weekday: "short" });
    return { key, name, dockets: 0, revenue: 0 };
  });
  return buckets;
}

export class DatabaseStorage implements IStorage {
  private db = requireDb();

  // Users
  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await this.db.insert(users).values(userData).returning();
    return user;
  }

  // Dockets
  async getDockets(status?: string, search?: string): Promise<(Docket & { items: DocketItem[] })[]> {
    let query = this.db.select().from(dockets);
    
    // Ideally we would do complex filtering here, but for MVP we'll filter in memory or basic SQL
    // Drizzle query builder for relations is better but let's stick to simple selects + manual join or query.
    // Actually, let's use this.db.query if we had the relational query builder setup in db.ts, but standard select is fine.
    
    const allDockets = await query.orderBy(desc(dockets.createdAt));
    
    // Fetch items for all dockets (N+1 but okay for MVP scale)
    const results = await Promise.all(allDockets.map(async (d) => {
      const items = await this.db.select().from(docketItems).where(eq(docketItems.docketId, d.id));
      return { ...d, items };
    }));

    // Filter
    return results.filter(d => {
      if (status && d.status !== status) return false;
      if (search) {
        const s = search.toLowerCase();
        return d.docketNumber.toLowerCase().includes(s) || 
               d.senderName.toLowerCase().includes(s) || 
               d.receiverName.toLowerCase().includes(s);
      }
      return true;
    });
  }

  async getDocket(
    id: number,
  ): Promise<
    | (Docket & {
        items: DocketItem[];
        pod: Pod | null;
        loadingSheets: LoadingSheet[];
        manifests: Manifest[];
        thcs: Thc[];
      })
    | undefined
  > {
    const [docket] = await this.db.select().from(dockets).where(eq(dockets.id, id));
    if (!docket) return undefined;

    const items = await this.db.select().from(docketItems).where(eq(docketItems.docketId, id));
    const [pod] = await this.db.select().from(pods).where(eq(pods.docketId, id));
    const links = await this.db.select().from(loadingSheetDockets).where(eq(loadingSheetDockets.docketId, id));
    const loadingSheetIds = links.map((link) => link.loadingSheetId);
    const loadingSheetsList =
      loadingSheetIds.length > 0
        ? await this.db.select().from(loadingSheets).where(inArray(loadingSheets.id, loadingSheetIds))
        : [];
    const manifestsList =
      loadingSheetIds.length > 0
        ? await this.db.select().from(manifests).where(inArray(manifests.loadingSheetId, loadingSheetIds))
        : [];
    const manifestIds = manifestsList.map((manifest) => manifest.id);
    const thcsList =
      manifestIds.length > 0
        ? await this.db.select().from(thcs).where(inArray(thcs.manifestId, manifestIds))
        : [];

    return {
      ...docket,
      items,
      pod: pod || null,
      loadingSheets: loadingSheetsList,
      manifests: manifestsList,
      thcs: thcsList,
    };
  }

  async getDocketTracker(id: number) {
    const [docket] = await this.db.select().from(dockets).where(eq(dockets.id, id));
    if (!docket) return undefined;

    const links = await this.db
      .select()
      .from(loadingSheetDockets)
      .where(eq(loadingSheetDockets.docketId, id));
    const loadingSheetIds = links.map((link) => link.loadingSheetId);
    const loadingSheetRows = loadingSheetIds.length
      ? await this.db.select().from(loadingSheets).where(inArray(loadingSheets.id, loadingSheetIds))
      : [];

    const manifestRows = loadingSheetRows.length
      ? await this.db
          .select()
          .from(manifests)
          .where(inArray(manifests.loadingSheetId, loadingSheetRows.map((sheet) => sheet.id)))
      : [];

    const thcRows = manifestRows.length
      ? await this.db
          .select()
          .from(thcs)
          .where(inArray(thcs.manifestId, manifestRows.map((manifest) => manifest.id)))
      : [];

    const [pod] = await this.db.select().from(pods).where(eq(pods.docketId, id));

    const events = [
      {
        key: "docket_created",
        label: "Docket created",
        timestamp: docket.createdAt ? docket.createdAt.toISOString() : null,
        meta: {
          status: docket.status,
        },
      },
      {
        key: "loading_sheet_created",
        label: "Loading sheet created",
        timestamp: loadingSheetRows[0]?.createdAt
          ? loadingSheetRows[0].createdAt.toISOString()
          : null,
        meta: {
          count: loadingSheetRows.length,
          sheetNumbers: loadingSheetRows.map((sheet) => sheet.sheetNumber),
        },
      },
      {
        key: "manifest_created",
        label: "Manifest created",
        timestamp: manifestRows[0]?.generatedAt
          ? manifestRows[0].generatedAt.toISOString()
          : null,
        meta: {
          count: manifestRows.length,
          manifestNumbers: manifestRows.map((manifest) => manifest.manifestNumber),
        },
      },
      {
        key: "thc_created",
        label: "THC created",
        timestamp: thcRows[0]?.createdAt ? thcRows[0].createdAt.toISOString() : null,
        meta: {
          count: thcRows.length,
          thcNumbers: thcRows.map((thc) => thc.thcNumber),
        },
      },
      {
        key: "pod_uploaded",
        label: "POD uploaded",
        timestamp: pod?.createdAt ? pod.createdAt.toISOString() : null,
        meta: pod
          ? {
              status: pod.status,
              imageUrl: pod.imageUrl,
            }
          : undefined,
      },
    ];

    const geofenceLat = docket.geofenceLat != null ? Number(docket.geofenceLat) : null;
    const geofenceLng = docket.geofenceLng != null ? Number(docket.geofenceLng) : null;
    const geofenceRadiusKm = docket.geofenceRadiusKm != null ? Number(docket.geofenceRadiusKm) : null;
    const currentLat = docket.currentLat != null ? Number(docket.currentLat) : null;
    const currentLng = docket.currentLng != null ? Number(docket.currentLng) : null;

    const geofence =
      geofenceLat != null &&
      !Number.isNaN(geofenceLat) &&
      geofenceLng != null &&
      !Number.isNaN(geofenceLng) &&
      geofenceRadiusKm != null &&
      !Number.isNaN(geofenceRadiusKm)
        ? {
            lat: geofenceLat,
            lng: geofenceLng,
            radiusMeters: geofenceRadiusKm * 1000,
          }
        : null;

    const currentLocation =
      currentLat != null && !Number.isNaN(currentLat) && currentLng != null && !Number.isNaN(currentLng)
        ? { lat: currentLat, lng: currentLng }
        : null;

    return {
      docketId: docket.id,
      docketNumber: docket.docketNumber,
      status: docket.status,
      geofence,
      currentLocation,
      events,
    };
  }

  async createDocket(docketData: InsertDocket & { items: InsertDocketItem[] }): Promise<Docket> {
    const { items, ...docketFields } = docketData;
    
    const [docket] = await this.db.insert(dockets).values(docketFields).returning();

    if (items.length > 0) {
      await this.db.insert(docketItems).values(
        items.map(item => ({ ...item, docketId: docket.id }))
      );
    }

    return docket;
  }

  async updateDocketTracking(
    id: number,
    fields: {
      geofenceLat?: string | null;
      geofenceLng?: string | null;
      geofenceRadiusKm?: string | null;
      currentLat?: string | null;
      currentLng?: string | null;
    },
  ): Promise<Docket> {
    const updates: Partial<InsertDocket> = {};
    if ("geofenceLat" in fields) updates.geofenceLat = fields.geofenceLat ?? null;
    if ("geofenceLng" in fields) updates.geofenceLng = fields.geofenceLng ?? null;
    if ("geofenceRadiusKm" in fields) updates.geofenceRadiusKm = fields.geofenceRadiusKm ?? null;
    if ("currentLat" in fields) updates.currentLat = fields.currentLat ?? null;
    if ("currentLng" in fields) updates.currentLng = fields.currentLng ?? null;

    const [docket] = await this.db
      .update(dockets)
      .set(updates)
      .where(eq(dockets.id, id))
      .returning();
    return docket;
  }

  async updateDocketStatus(id: number, status: string): Promise<Docket> {
    const [docket] = await this.db.update(dockets)
      .set({ status })
      .where(eq(dockets.id, id))
      .returning();
    return docket;
  }

  // Loading Sheets
  async getLoadingSheets(): Promise<LoadingSheet[]> {
    return await this.db.select().from(loadingSheets).orderBy(desc(loadingSheets.createdAt));
  }

  async getLoadingSheet(
    id: number,
  ): Promise<(LoadingSheet & { dockets: Docket[]; manifests: Manifest[]; thcs: Thc[] }) | undefined> {
    const [sheet] = await this.db.select().from(loadingSheets).where(eq(loadingSheets.id, id));
    if (!sheet) return undefined;

    // Get linked dockets
    const links = await this.db.select().from(loadingSheetDockets).where(eq(loadingSheetDockets.loadingSheetId, id));
    const docketIds = links.map(l => l.docketId);
    
    let linkedDockets: Docket[] = [];
    if (docketIds.length > 0) {
      linkedDockets = await this.db.select().from(dockets).where(inArray(dockets.id, docketIds));
    }

    const sheetManifests = await this.db.select().from(manifests).where(eq(manifests.loadingSheetId, id));
    const manifestIds = sheetManifests.map((manifest) => manifest.id);
    const sheetThcs =
      manifestIds.length > 0
        ? await this.db.select().from(thcs).where(inArray(thcs.manifestId, manifestIds))
        : [];

    return { ...sheet, dockets: linkedDockets, manifests: sheetManifests, thcs: sheetThcs };
  }

  async createLoadingSheet(sheetData: InsertLoadingSheet & { docketIds: number[] }): Promise<LoadingSheet> {
    const { docketIds, ...sheetFields } = sheetData;
    
    const [sheet] = await this.db.insert(loadingSheets).values(sheetFields).returning();

    if (docketIds.length > 0) {
      await this.db.insert(loadingSheetDockets).values(
        docketIds.map(dId => ({ loadingSheetId: sheet.id, docketId: dId }))
      );
      
      // Update status of these dockets to 'loaded'
      await this.db.update(dockets)
        .set({ status: 'loaded' })
        .where(inArray(dockets.id, docketIds));
    }

    return sheet;
  }

  async finalizeLoadingSheet(id: number): Promise<LoadingSheet> {
    const [sheet] = await this.db
      .update(loadingSheets)
      .set({ status: "finalized" })
      .where(eq(loadingSheets.id, id))
      .returning();
    if (!sheet) {
      const error = new Error("Loading sheet not found");
      (error as any).status = 404;
      throw error;
    }
    return sheet;
  }

  // Manifests
  async getManifests(): Promise<Manifest[]> {
    return await this.db.select().from(manifests).orderBy(desc(manifests.generatedAt));
  }

  async getManifest(
    id: number,
  ): Promise<(Manifest & { loadingSheet: LoadingSheet; dockets: Docket[]; thc: Thc | null }) | undefined> {
    const [manifest] = await this.db.select().from(manifests).where(eq(manifests.id, id));
    if (!manifest) return undefined;

    const [sheet] = await this.db.select().from(loadingSheets).where(eq(loadingSheets.id, manifest.loadingSheetId));
    const links = await this.db.select().from(loadingSheetDockets).where(eq(loadingSheetDockets.loadingSheetId, manifest.loadingSheetId));
    const docketIds = links.map((l) => l.docketId);
    const linkedDockets =
      docketIds.length > 0 ? await this.db.select().from(dockets).where(inArray(dockets.id, docketIds)) : [];
    const [thc] = await this.db.select().from(thcs).where(eq(thcs.manifestId, manifest.id));

    return { ...manifest, loadingSheet: sheet, dockets: linkedDockets, thc: thc || null };
  }

  async createManifest(manifestData: CreateManifestRequest): Promise<Manifest> {
    const values: InsertManifest = {
      manifestNumber: generateManifestNumber(),
      loadingSheetId: manifestData.loadingSheetId,
      status: "generated",
    };

    const [manifest] = await this.db.insert(manifests).values(values).returning();
    
    // Find the loading sheet and mark it finalized if not already
    await this.db.update(loadingSheets)
      .set({ status: 'finalized' })
      .where(eq(loadingSheets.id, manifestData.loadingSheetId));

    // Also update dockets to 'in_transit'
    const links = await this.db.select().from(loadingSheetDockets).where(eq(loadingSheetDockets.loadingSheetId, manifestData.loadingSheetId));
    const docketIds = links.map(l => l.docketId);
    if (docketIds.length > 0) {
      await this.db.update(dockets)
        .set({ status: 'in_transit' })
        .where(inArray(dockets.id, docketIds));
    }

    return manifest;
  }

  // THCs
  async getThcs(): Promise<Thc[]> {
    return await this.db.select().from(thcs).orderBy(desc(thcs.createdAt));
  }

  async getThc(
    id: number,
  ): Promise<
    | (Thc & { manifest: Manifest | null; loadingSheet: LoadingSheet | null; dockets: Docket[] })
    | undefined
  > {
    const [thc] = await this.db.select().from(thcs).where(eq(thcs.id, id));
    if (!thc) return undefined;
    const [manifest] = await this.db.select().from(manifests).where(eq(manifests.id, thc.manifestId));
    const [sheet] = manifest
      ? await this.db.select().from(loadingSheets).where(eq(loadingSheets.id, manifest.loadingSheetId))
      : [];
    const links = manifest
      ? await this.db
          .select()
          .from(loadingSheetDockets)
          .where(eq(loadingSheetDockets.loadingSheetId, manifest.loadingSheetId))
      : [];
    const docketIds = links.map((l) => l.docketId);
    const linkedDockets =
      docketIds.length > 0 ? await this.db.select().from(dockets).where(inArray(dockets.id, docketIds)) : [];

    return { ...thc, manifest: manifest || null, loadingSheet: sheet || null, dockets: linkedDockets };
  }

  async createThc(thcData: InsertThc): Promise<Thc> {
    const [thc] = await this.db.insert(thcs).values(thcData).returning();
    return thc;
  }

  async updateThc(id: number, updates: Partial<InsertThc>): Promise<Thc> {
    const [thc] = await this.db.update(thcs).set(updates).where(eq(thcs.id, id)).returning();
    return thc;
  }

  // PODs
  async getPods(): Promise<Pod[]> {
    return await this.db.select().from(pods).orderBy(desc(pods.createdAt));
  }

  async getPod(id: number): Promise<Pod | undefined> {
    const [pod] = await this.db.select().from(pods).where(eq(pods.id, id));
    return pod;
  }

  async createPod(podData: InsertPod): Promise<Pod> {
    const [pod] = await this.db.insert(pods).values(podData).returning();
    // Update docket status to delivered
    await this.db.update(dockets).set({ status: 'delivered' }).where(eq(dockets.id, podData.docketId));
    return pod;
  }

  async updatePodReview(id: number, status: "approved" | "rejected", rejectionReason?: string): Promise<Pod> {
    const [pod] = await this.db.update(pods)
      .set({ 
        status, 
        rejectionReason: rejectionReason || null,
        approvedAt: status === 'approved' ? new Date() : null,
        // approvedBy: userId // TODO: Add user ID when auth is ready
      })
      .where(eq(pods.id, id))
      .returning();
    return pod;
  }

  async updatePodAnalysis(id: number, analysis: any): Promise<Pod> {
    const [pod] = await this.db.update(pods)
      .set({ aiAnalysis: analysis })
      .where(eq(pods.id, id))
      .returning();
    return pod;
  }

  // Audit Logs
  async createAuditLog(logData: InsertAuditLog): Promise<AuditLog> {
    const [log] = await this.db.insert(auditLogs).values(logData).returning();
    return log;
  }

  async getAuditLogs(filters?: {
    action?: string;
    entityType?: string;
    entityId?: number;
    userId?: number;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> {
    const conditions = [];
    if (filters?.action) conditions.push(eq(auditLogs.action, filters.action));
    if (filters?.entityType) conditions.push(eq(auditLogs.entityType, filters.entityType));
    if (filters?.entityId != null) conditions.push(eq(auditLogs.entityId, filters.entityId));
    if (filters?.userId != null) conditions.push(eq(auditLogs.userId, filters.userId));
    if (filters?.search) {
      const like = `%${filters.search}%`;
      conditions.push(
        sql`(${auditLogs.summary} ILIKE ${like} OR ${auditLogs.action} ILIKE ${like} OR ${auditLogs.username} ILIKE ${like})`,
      );
    }

    let query = this.db.select().from(auditLogs) as any;
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    query = query.orderBy(desc(auditLogs.createdAt));
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }
    return await query;
  }

  async getDashboardStats() {
    const now = new Date();
    const weekBuckets = buildWeeklyBuckets(now);
    const weekStart = startOfDay(addDays(now, -6));
    const dayStart = startOfDay(now);
    const nextDay = addDays(dayStart, 1);

    const [activeRow] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(dockets)
      .where(sql`${dockets.status} <> 'delivered'`);

    const [transitRow] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(dockets)
      .where(eq(dockets.status, "in_transit"));

    const [pendingRow] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(pods)
      .where(eq(pods.status, "pending_review"));

    const [completedRow] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(pods)
      .where(
        sql`${pods.status} = 'approved' AND ${pods.approvedAt} >= ${dayStart} AND ${pods.approvedAt} < ${nextDay}`,
      );

    const recentDockets = await this.db
      .select({ createdAt: dockets.createdAt })
      .from(dockets)
      .where(sql`${dockets.createdAt} >= ${weekStart}`);

    for (const row of recentDockets) {
      if (!row.createdAt) continue;
      const key = toDateString(new Date(row.createdAt));
      const bucket = weekBuckets.find((b) => b.key === key);
      if (bucket) bucket.dockets += 1;
    }

    const recentThcs = await this.db
      .select({ createdAt: thcs.createdAt, hireAmount: thcs.hireAmount })
      .from(thcs)
      .where(sql`${thcs.createdAt} >= ${weekStart}`);

    for (const row of recentThcs) {
      if (!row.createdAt) continue;
      const key = toDateString(new Date(row.createdAt));
      const bucket = weekBuckets.find((b) => b.key === key);
      if (!bucket) continue;
      const value = typeof row.hireAmount === "string" ? Number(row.hireAmount) : Number(row.hireAmount ?? 0);
      bucket.revenue += Number.isNaN(value) ? 0 : value;
    }

    return {
      updatedAt: now.toISOString(),
      stats: {
        activeDockets: Number(activeRow?.count ?? 0),
        vehiclesInTransit: Number(transitRow?.count ?? 0),
        pendingPods: Number(pendingRow?.count ?? 0),
        completedToday: Number(completedRow?.count ?? 0),
      },
      weekly: weekBuckets.map(({ name, dockets, revenue }) => ({
        name,
        dockets,
        revenue: Math.round(revenue * 100) / 100,
      })),
    };
  }
}

class MemoryStorage implements IStorage {
  private users: User[] = [];
  private dockets: Docket[] = [];
  private docketItems: DocketItem[] = [];
  private loadingSheets: LoadingSheet[] = [];
  private loadingSheetDockets: LoadingSheetDocket[] = [];
  private manifests: Manifest[] = [];
  private thcs: Thc[] = [];
  private pods: Pod[] = [];
  private auditLogs: AuditLog[] = [];
  private counters = {
    user: 1,
    docket: 1,
    docketItem: 1,
    loadingSheet: 1,
    loadingSheetDocket: 1,
    manifest: 1,
    thc: 1,
    pod: 1,
    auditLog: 1,
  };

  private nextId(key: keyof typeof this.counters) {
    const value = this.counters[key];
    this.counters[key] += 1;
    return value;
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.users.find((user) => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find((user) => user.username === username);
  }

  async createUser(userData: InsertUser): Promise<User> {
    const user: User = {
      id: this.nextId("user"),
      username: userData.username,
      password: userData.password,
      role: userData.role ?? "staff",
      createdAt: new Date(),
    };
    this.users.push(user);
    return user;
  }

  async getDockets(status?: string, search?: string): Promise<(Docket & { items: DocketItem[] })[]> {
    const sorted = [...this.dockets].sort(
      (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
    );
    const results = sorted.map((d) => ({
      ...d,
      items: this.docketItems.filter((item) => item.docketId === d.id),
    }));

    return results.filter((d) => {
      if (status && d.status !== status) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          d.docketNumber.toLowerCase().includes(s) ||
          d.senderName.toLowerCase().includes(s) ||
          d.receiverName.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }

  async getDocket(
    id: number,
  ): Promise<
    | (Docket & {
        items: DocketItem[];
        pod: Pod | null;
        loadingSheets: LoadingSheet[];
        manifests: Manifest[];
        thcs: Thc[];
      })
    | undefined
  > {
    const docket = this.dockets.find((d) => d.id === id);
    if (!docket) return undefined;

    const items = this.docketItems.filter((item) => item.docketId === id);
    const pod = this.pods.find((p) => p.docketId === id) ?? null;

    const links = this.loadingSheetDockets.filter((link) => link.docketId === id);
    const loadingSheetRows = this.loadingSheets.filter((sheet) =>
      links.some((link) => link.loadingSheetId === sheet.id),
    );
    const manifestRows = this.manifests.filter((manifest) =>
      loadingSheetRows.some((sheet) => sheet.id === manifest.loadingSheetId),
    );
    const thcRows = this.thcs.filter((thc) =>
      manifestRows.some((manifest) => manifest.id === thc.manifestId),
    );

    return {
      ...docket,
      items,
      pod,
      loadingSheets: loadingSheetRows,
      manifests: manifestRows,
      thcs: thcRows,
    };
  }

  async getDocketTracker(id: number) {
    const docket = this.dockets.find((d) => d.id === id);
    if (!docket) return undefined;

    const links = this.loadingSheetDockets.filter((link) => link.docketId === id);
    const loadingSheetRows = this.loadingSheets.filter((sheet) =>
      links.some((link) => link.loadingSheetId === sheet.id),
    );
    const manifestRows = this.manifests.filter((manifest) =>
      loadingSheetRows.some((sheet) => sheet.id === manifest.loadingSheetId),
    );
    const thcRows = this.thcs.filter((thc) =>
      manifestRows.some((manifest) => manifest.id === thc.manifestId),
    );
    const pod = this.pods.find((p) => p.docketId === id);

    const events = [
      {
        key: "docket_created",
        label: "Docket created",
        timestamp: docket.createdAt ? docket.createdAt.toISOString() : null,
        meta: { status: docket.status },
      },
      {
        key: "loading_sheet_created",
        label: "Loading sheet created",
        timestamp: loadingSheetRows[0]?.createdAt
          ? loadingSheetRows[0].createdAt.toISOString()
          : null,
        meta: {
          count: loadingSheetRows.length,
          sheetNumbers: loadingSheetRows.map((sheet) => sheet.sheetNumber),
        },
      },
      {
        key: "manifest_created",
        label: "Manifest created",
        timestamp: manifestRows[0]?.generatedAt ? manifestRows[0].generatedAt.toISOString() : null,
        meta: {
          count: manifestRows.length,
          manifestNumbers: manifestRows.map((manifest) => manifest.manifestNumber),
        },
      },
      {
        key: "thc_created",
        label: "THC created",
        timestamp: thcRows[0]?.createdAt ? thcRows[0].createdAt.toISOString() : null,
        meta: {
          count: thcRows.length,
          thcNumbers: thcRows.map((thc) => thc.thcNumber),
        },
      },
      {
        key: "pod_uploaded",
        label: "POD uploaded",
        timestamp: pod?.createdAt ? pod.createdAt.toISOString() : null,
        meta: pod
          ? {
              status: pod.status,
              imageUrl: pod.imageUrl,
            }
          : undefined,
      },
    ];

    const geofenceLat = docket.geofenceLat != null ? Number(docket.geofenceLat) : null;
    const geofenceLng = docket.geofenceLng != null ? Number(docket.geofenceLng) : null;
    const geofenceRadiusKm = docket.geofenceRadiusKm != null ? Number(docket.geofenceRadiusKm) : null;
    const currentLat = docket.currentLat != null ? Number(docket.currentLat) : null;
    const currentLng = docket.currentLng != null ? Number(docket.currentLng) : null;

    const geofence =
      geofenceLat != null &&
      !Number.isNaN(geofenceLat) &&
      geofenceLng != null &&
      !Number.isNaN(geofenceLng) &&
      geofenceRadiusKm != null &&
      !Number.isNaN(geofenceRadiusKm)
        ? {
            lat: geofenceLat,
            lng: geofenceLng,
            radiusMeters: geofenceRadiusKm * 1000,
          }
        : null;

    const currentLocation =
      currentLat != null && !Number.isNaN(currentLat) && currentLng != null && !Number.isNaN(currentLng)
        ? { lat: currentLat, lng: currentLng }
        : null;

    return {
      docketId: docket.id,
      docketNumber: docket.docketNumber,
      status: docket.status,
      geofence,
      currentLocation,
      events,
    };
  }

  async createDocket(docketData: InsertDocket & { items: InsertDocketItem[] }): Promise<Docket> {
    const { items, ...fields } = docketData;
    const docket: Docket = {
      id: this.nextId("docket"),
      docketNumber: fields.docketNumber,
      senderName: fields.senderName,
      senderAddress: fields.senderAddress,
      receiverName: fields.receiverName,
      receiverAddress: fields.receiverAddress,
      pickupDate: fields.pickupDate ?? null,
      deliveryDate: fields.deliveryDate ?? null,
      status: fields.status ?? "booked",
      specialInstructions: fields.specialInstructions ?? null,
      totalWeight: fields.totalWeight ?? null,
      totalPackages: fields.totalPackages ?? null,
      geofenceLat: fields.geofenceLat ?? null,
      geofenceLng: fields.geofenceLng ?? null,
      geofenceRadiusKm: fields.geofenceRadiusKm ?? null,
      currentLat: fields.currentLat ?? null,
      currentLng: fields.currentLng ?? null,
      createdAt: new Date(),
    };

    this.dockets.push(docket);

    if (items.length > 0) {
      const createdItems = items.map((item) => ({
        id: this.nextId("docketItem"),
        docketId: docket.id,
        description: item.description,
        weight: item.weight,
        quantity: item.quantity,
        packageType: item.packageType,
      }));
      this.docketItems.push(...createdItems);
    }

    return docket;
  }

  async updateDocketTracking(
    id: number,
    fields: {
      geofenceLat?: string | null;
      geofenceLng?: string | null;
      geofenceRadiusKm?: string | null;
      currentLat?: string | null;
      currentLng?: string | null;
    },
  ): Promise<Docket> {
    const docket = this.dockets.find((d) => d.id === id);
    if (!docket) {
      const error = new Error("Docket not found");
      (error as any).status = 404;
      throw error;
    }

    if ("geofenceLat" in fields) docket.geofenceLat = fields.geofenceLat ?? null;
    if ("geofenceLng" in fields) docket.geofenceLng = fields.geofenceLng ?? null;
    if ("geofenceRadiusKm" in fields) docket.geofenceRadiusKm = fields.geofenceRadiusKm ?? null;
    if ("currentLat" in fields) docket.currentLat = fields.currentLat ?? null;
    if ("currentLng" in fields) docket.currentLng = fields.currentLng ?? null;
    return docket;
  }

  async updateDocketStatus(id: number, status: string): Promise<Docket> {
    const docket = this.dockets.find((d) => d.id === id);
    if (!docket) {
      const error = new Error("Docket not found");
      (error as any).status = 404;
      throw error;
    }
    docket.status = status;
    return docket;
  }

  async getLoadingSheets(): Promise<LoadingSheet[]> {
    return [...this.loadingSheets].sort(
      (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
    );
  }

  async getLoadingSheet(
    id: number,
  ): Promise<(LoadingSheet & { dockets: Docket[]; manifests: Manifest[]; thcs: Thc[] }) | undefined> {
    const sheet = this.loadingSheets.find((s) => s.id === id);
    if (!sheet) return undefined;

    const docketIds = this.loadingSheetDockets
      .filter((link) => link.loadingSheetId === id)
      .map((link) => link.docketId);
    const dockets = this.dockets.filter((d) => docketIds.includes(d.id));

    const manifests = this.manifests.filter((manifest) => manifest.loadingSheetId === id);
    const thcs = this.thcs.filter((thc) =>
      manifests.some((manifest) => manifest.id === thc.manifestId),
    );

    return { ...sheet, dockets, manifests, thcs };
  }

  async createLoadingSheet(sheetData: InsertLoadingSheet & { docketIds: number[] }): Promise<LoadingSheet> {
    const { docketIds, ...fields } = sheetData;
    const sheet: LoadingSheet = {
      id: this.nextId("loadingSheet"),
      sheetNumber: fields.sheetNumber,
      vehicleNumber: fields.vehicleNumber,
      driverName: fields.driverName,
      destination: fields.destination,
      date: fields.date ?? toDateString(new Date()),
      status: fields.status ?? "draft",
      createdAt: new Date(),
    };

    this.loadingSheets.push(sheet);

    if (docketIds.length > 0) {
      const links = docketIds.map((docketId) => ({
        id: this.nextId("loadingSheetDocket"),
        loadingSheetId: sheet.id,
        docketId,
      }));
      this.loadingSheetDockets.push(...links);

      this.dockets.forEach((docket) => {
        if (docketIds.includes(docket.id)) {
          docket.status = "loaded";
        }
      });
    }

    return sheet;
  }

  async finalizeLoadingSheet(id: number): Promise<LoadingSheet> {
    const sheet = this.loadingSheets.find((s) => s.id === id);
    if (!sheet) {
      const error = new Error("Loading sheet not found");
      (error as any).status = 404;
      throw error;
    }

    sheet.status = "finalized";
    return sheet;
  }

  async getManifests(): Promise<Manifest[]> {
    return [...this.manifests].sort(
      (a, b) => (b.generatedAt?.getTime() ?? 0) - (a.generatedAt?.getTime() ?? 0),
    );
  }

  async getManifest(
    id: number,
  ): Promise<(Manifest & { loadingSheet: LoadingSheet; dockets: Docket[]; thc: Thc | null }) | undefined> {
    const manifest = this.manifests.find((m) => m.id === id);
    if (!manifest) return undefined;

    const sheet = this.loadingSheets.find((s) => s.id === manifest.loadingSheetId);
    if (!sheet) return undefined;

    const docketLinks = this.loadingSheetDockets.filter(
      (link) => link.loadingSheetId === manifest.loadingSheetId,
    );
    const dockets = this.dockets.filter((d) => docketLinks.some((link) => link.docketId === d.id));
    const thc = this.thcs.find((t) => t.manifestId === manifest.id) ?? null;

    return { ...manifest, loadingSheet: sheet, dockets, thc };
  }

  async createManifest(manifestData: CreateManifestRequest): Promise<Manifest> {
    const manifest: Manifest = {
      id: this.nextId("manifest"),
      manifestNumber: generateManifestNumber(),
      loadingSheetId: manifestData.loadingSheetId,
      generatedAt: new Date(),
      status: "generated",
    };

    this.manifests.push(manifest);

    const sheet = this.loadingSheets.find((s) => s.id === manifestData.loadingSheetId);
    if (sheet) {
      sheet.status = "finalized";
    }

    const docketIds = this.loadingSheetDockets
      .filter((link) => link.loadingSheetId === manifestData.loadingSheetId)
      .map((link) => link.docketId);

    this.dockets.forEach((docket) => {
      if (docketIds.includes(docket.id)) {
        docket.status = "in_transit";
      }
    });

    return manifest;
  }

  async getThcs(): Promise<Thc[]> {
    return [...this.thcs].sort(
      (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
    );
  }

  async getThc(
    id: number,
  ): Promise<
    | (Thc & { manifest: Manifest | null; loadingSheet: LoadingSheet | null; dockets: Docket[] })
    | undefined
  > {
    const thc = this.thcs.find((t) => t.id === id);
    if (!thc) return undefined;
    const manifest = this.manifests.find((m) => m.id === thc.manifestId) ?? null;
    const loadingSheet = manifest
      ? this.loadingSheets.find((s) => s.id === manifest.loadingSheetId) ?? null
      : null;
    const docketLinks = manifest
      ? this.loadingSheetDockets.filter((link) => link.loadingSheetId === manifest.loadingSheetId)
      : [];
    const dockets = this.dockets.filter((d) => docketLinks.some((link) => link.docketId === d.id));

    return { ...thc, manifest, loadingSheet, dockets };
  }

  async createThc(thcData: InsertThc): Promise<Thc> {
    const thc: Thc = {
      id: this.nextId("thc"),
      thcNumber: thcData.thcNumber,
      manifestId: thcData.manifestId,
      hireAmount: thcData.hireAmount,
      advanceAmount: thcData.advanceAmount,
      balanceAmount: thcData.balanceAmount,
      driverName: thcData.driverName ?? null,
      vehicleNumber: thcData.vehicleNumber ?? null,
      status: thcData.status ?? "generated",
      createdAt: new Date(),
    };

    this.thcs.push(thc);
    return thc;
  }

  async updateThc(id: number, updates: Partial<InsertThc>): Promise<Thc> {
    const thc = this.thcs.find((t) => t.id === id);
    if (!thc) {
      const error = new Error("THC not found");
      (error as any).status = 404;
      throw error;
    }

    Object.assign(thc, updates);
    return thc;
  }

  async getPods(): Promise<Pod[]> {
    return [...this.pods].sort(
      (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
    );
  }

  async getPod(id: number): Promise<Pod | undefined> {
    return this.pods.find((p) => p.id === id);
  }

  async createPod(podData: InsertPod): Promise<Pod> {
    const pod: Pod = {
      id: this.nextId("pod"),
      docketId: podData.docketId,
      imageUrl: podData.imageUrl,
      status: "pending_review",
      aiAnalysis: null,
      rejectionReason: null,
      approvedBy: null,
      approvedAt: null,
      createdAt: new Date(),
    };

    this.pods.push(pod);

    const docket = this.dockets.find((d) => d.id === podData.docketId);
    if (docket) {
      docket.status = "delivered";
    }

    return pod;
  }

  async updatePodReview(id: number, status: "approved" | "rejected", rejectionReason?: string): Promise<Pod> {
    const pod = this.pods.find((p) => p.id === id);
    if (!pod) {
      const error = new Error("POD not found");
      (error as any).status = 404;
      throw error;
    }

    pod.status = status;
    pod.rejectionReason = rejectionReason || null;
    pod.approvedAt = status === "approved" ? new Date() : null;

    return pod;
  }

  async updatePodAnalysis(id: number, analysis: any): Promise<Pod> {
    const pod = this.pods.find((p) => p.id === id);
    if (!pod) {
      const error = new Error("POD not found");
      (error as any).status = 404;
      throw error;
    }

    pod.aiAnalysis = analysis;
    return pod;
  }

  async createAuditLog(logData: InsertAuditLog): Promise<AuditLog> {
    const log: AuditLog = {
      id: this.nextId("auditLog"),
      userId: logData.userId ?? null,
      username: logData.username ?? null,
      action: logData.action,
      entityType: logData.entityType ?? null,
      entityId: logData.entityId ?? null,
      summary: logData.summary ?? null,
      meta: logData.meta ?? null,
      ip: logData.ip ?? null,
      userAgent: logData.userAgent ?? null,
      createdAt: new Date(),
    };
    this.auditLogs.push(log);
    return log;
  }

  async getAuditLogs(filters?: {
    action?: string;
    entityType?: string;
    entityId?: number;
    userId?: number;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> {
    const search = filters?.search?.toLowerCase();
    let results = [...this.auditLogs].sort(
      (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
    );

    if (filters?.action) results = results.filter((l) => l.action === filters.action);
    if (filters?.entityType) results = results.filter((l) => l.entityType === filters.entityType);
    if (filters?.entityId != null) results = results.filter((l) => l.entityId === filters.entityId);
    if (filters?.userId != null) results = results.filter((l) => l.userId === filters.userId);
    if (search) {
      results = results.filter((l) => {
        return (
          l.summary?.toLowerCase().includes(search) ||
          l.action.toLowerCase().includes(search) ||
          l.username?.toLowerCase().includes(search) ||
          l.entityType?.toLowerCase().includes(search)
        );
      });
    }

    const offset = filters?.offset ?? 0;
    const limit = filters?.limit ?? results.length;
    return results.slice(offset, offset + limit);
  }

  async getDashboardStats() {
    const now = new Date();
    const weekBuckets = buildWeeklyBuckets(now);
    const weekStart = startOfDay(addDays(now, -6));
    const dayStart = startOfDay(now);
    const nextDay = addDays(dayStart, 1);

    const activeDockets = this.dockets.filter((d) => d.status !== "delivered").length;
    const vehiclesInTransit = this.dockets.filter((d) => d.status === "in_transit").length;
    const pendingPods = this.pods.filter((p) => p.status === "pending_review").length;
    const completedToday = this.pods.filter((p) => {
      if (p.status !== "approved" || !p.approvedAt) return false;
      return p.approvedAt >= dayStart && p.approvedAt < nextDay;
    }).length;

    this.dockets.forEach((docket) => {
      if (!docket.createdAt || docket.createdAt < weekStart) return;
      const key = toDateString(docket.createdAt);
      const bucket = weekBuckets.find((b) => b.key === key);
      if (bucket) bucket.dockets += 1;
    });

    this.thcs.forEach((thc) => {
      if (!thc.createdAt || thc.createdAt < weekStart) return;
      const key = toDateString(thc.createdAt);
      const bucket = weekBuckets.find((b) => b.key === key);
      if (!bucket) return;
      const value = typeof thc.hireAmount === "string" ? Number(thc.hireAmount) : Number(thc.hireAmount ?? 0);
      bucket.revenue += Number.isNaN(value) ? 0 : value;
    });

    return {
      updatedAt: now.toISOString(),
      stats: {
        activeDockets,
        vehiclesInTransit,
        pendingPods,
        completedToday,
      },
      weekly: weekBuckets.map(({ name, dockets, revenue }) => ({
        name,
        dockets,
        revenue: Math.round(revenue * 100) / 100,
      })),
    };
  }
}

if (!dbInstance) {
  console.warn("DATABASE_URL not set. Falling back to in-memory storage.");
}

export const storage: IStorage = dbInstance ? new DatabaseStorage() : new MemoryStorage();
