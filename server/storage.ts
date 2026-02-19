
import { db as dbInstance } from "./db";
import { 
  dockets, docketItems, loadingSheets, loadingSheetDockets, manifests, thcs, pods,
  type Docket, type InsertDocket, type InsertDocketItem,
  type LoadingSheet, type InsertLoadingSheet,
  type LoadingSheetDocket,
  type Manifest, type InsertManifest,
  type CreateManifestRequest,
  type Thc, type InsertThc,
  type Pod, type InsertPod, type DocketItem
} from "@shared/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // Dockets
  getDockets(status?: string, search?: string): Promise<(Docket & { items: DocketItem[] })[]>;
  getDocket(id: number): Promise<(Docket & { items: DocketItem[], pod: Pod | null }) | undefined>;
  createDocket(docket: InsertDocket & { items: InsertDocketItem[] }): Promise<Docket>;
  updateDocketStatus(id: number, status: string): Promise<Docket>;

  // Loading Sheets
  getLoadingSheets(): Promise<LoadingSheet[]>;
  getLoadingSheet(id: number): Promise<(LoadingSheet & { dockets: Docket[] }) | undefined>;
  createLoadingSheet(sheet: InsertLoadingSheet & { docketIds: number[] }): Promise<LoadingSheet>;
  finalizeLoadingSheet(id: number): Promise<LoadingSheet>;

  // Manifests
  getManifests(): Promise<Manifest[]>;
  getManifest(id: number): Promise<(Manifest & { loadingSheet: LoadingSheet }) | undefined>;
  createManifest(manifest: CreateManifestRequest): Promise<Manifest>;

  // THCs
  getThcs(): Promise<Thc[]>;
  createThc(thc: InsertThc): Promise<Thc>;
  updateThc(id: number, updates: Partial<InsertThc>): Promise<Thc>;

  // PODs
  getPods(): Promise<Pod[]>;
  getPod(id: number): Promise<Pod | undefined>;
  createPod(pod: InsertPod): Promise<Pod>;
  updatePodReview(id: number, status: "approved" | "rejected", rejectionReason?: string): Promise<Pod>;
  updatePodAnalysis(id: number, analysis: any): Promise<Pod>;

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

  async getDocket(id: number): Promise<(Docket & { items: DocketItem[], pod: Pod | null }) | undefined> {
    const [docket] = await this.db.select().from(dockets).where(eq(dockets.id, id));
    if (!docket) return undefined;

    const items = await this.db.select().from(docketItems).where(eq(docketItems.docketId, id));
    const [pod] = await this.db.select().from(pods).where(eq(pods.docketId, id));

    return { ...docket, items, pod: pod || null };
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

  async getLoadingSheet(id: number): Promise<(LoadingSheet & { dockets: Docket[] }) | undefined> {
    const [sheet] = await this.db.select().from(loadingSheets).where(eq(loadingSheets.id, id));
    if (!sheet) return undefined;

    // Get linked dockets
    const links = await this.db.select().from(loadingSheetDockets).where(eq(loadingSheetDockets.loadingSheetId, id));
    const docketIds = links.map(l => l.docketId);
    
    let linkedDockets: Docket[] = [];
    if (docketIds.length > 0) {
      linkedDockets = await this.db.select().from(dockets).where(inArray(dockets.id, docketIds));
    }

    return { ...sheet, dockets: linkedDockets };
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

  async getManifest(id: number): Promise<(Manifest & { loadingSheet: LoadingSheet }) | undefined> {
    const [manifest] = await this.db.select().from(manifests).where(eq(manifests.id, id));
    if (!manifest) return undefined;

    const [sheet] = await this.db.select().from(loadingSheets).where(eq(loadingSheets.id, manifest.loadingSheetId));
    
    return { ...manifest, loadingSheet: sheet };
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
  private dockets: Docket[] = [];
  private docketItems: DocketItem[] = [];
  private loadingSheets: LoadingSheet[] = [];
  private loadingSheetDockets: LoadingSheetDocket[] = [];
  private manifests: Manifest[] = [];
  private thcs: Thc[] = [];
  private pods: Pod[] = [];
  private counters = {
    docket: 1,
    docketItem: 1,
    loadingSheet: 1,
    loadingSheetDocket: 1,
    manifest: 1,
    thc: 1,
    pod: 1,
  };

  private nextId(key: keyof typeof this.counters) {
    const value = this.counters[key];
    this.counters[key] += 1;
    return value;
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

  async getDocket(id: number): Promise<(Docket & { items: DocketItem[], pod: Pod | null }) | undefined> {
    const docket = this.dockets.find((d) => d.id === id);
    if (!docket) return undefined;

    const items = this.docketItems.filter((item) => item.docketId === id);
    const pod = this.pods.find((p) => p.docketId === id) ?? null;

    return { ...docket, items, pod };
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

  async getLoadingSheet(id: number): Promise<(LoadingSheet & { dockets: Docket[] }) | undefined> {
    const sheet = this.loadingSheets.find((s) => s.id === id);
    if (!sheet) return undefined;

    const docketIds = this.loadingSheetDockets
      .filter((link) => link.loadingSheetId === id)
      .map((link) => link.docketId);
    const dockets = this.dockets.filter((d) => docketIds.includes(d.id));

    return { ...sheet, dockets };
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

  async getManifest(id: number): Promise<(Manifest & { loadingSheet: LoadingSheet }) | undefined> {
    const manifest = this.manifests.find((m) => m.id === id);
    if (!manifest) return undefined;

    const sheet = this.loadingSheets.find((s) => s.id === manifest.loadingSheetId);
    if (!sheet) return undefined;

    return { ...manifest, loadingSheet: sheet };
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
