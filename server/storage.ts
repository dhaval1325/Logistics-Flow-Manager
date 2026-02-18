
import { db } from "./db";
import { 
  dockets, docketItems, loadingSheets, loadingSheetDockets, manifests, thcs, pods,
  type Docket, type InsertDocket, type InsertDocketItem,
  type LoadingSheet, type InsertLoadingSheet,
  type Manifest, type InsertManifest,
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

  // Manifests
  getManifests(): Promise<Manifest[]>;
  getManifest(id: number): Promise<(Manifest & { loadingSheet: LoadingSheet }) | undefined>;
  createManifest(manifest: InsertManifest): Promise<Manifest>;

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
}

export class DatabaseStorage implements IStorage {
  // Dockets
  async getDockets(status?: string, search?: string): Promise<(Docket & { items: DocketItem[] })[]> {
    let query = db.select().from(dockets);
    
    // Ideally we would do complex filtering here, but for MVP we'll filter in memory or basic SQL
    // Drizzle query builder for relations is better but let's stick to simple selects + manual join or query.
    // Actually, let's use db.query if we had the relational query builder setup in db.ts, but standard select is fine.
    
    const allDockets = await query.orderBy(desc(dockets.createdAt));
    
    // Fetch items for all dockets (N+1 but okay for MVP scale)
    const results = await Promise.all(allDockets.map(async (d) => {
      const items = await db.select().from(docketItems).where(eq(docketItems.docketId, d.id));
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
    const [docket] = await db.select().from(dockets).where(eq(dockets.id, id));
    if (!docket) return undefined;

    const items = await db.select().from(docketItems).where(eq(docketItems.docketId, id));
    const [pod] = await db.select().from(pods).where(eq(pods.docketId, id));

    return { ...docket, items, pod: pod || null };
  }

  async createDocket(docketData: InsertDocket & { items: InsertDocketItem[] }): Promise<Docket> {
    const { items, ...docketFields } = docketData;
    
    const [docket] = await db.insert(dockets).values(docketFields).returning();

    if (items.length > 0) {
      await db.insert(docketItems).values(
        items.map(item => ({ ...item, docketId: docket.id }))
      );
    }

    return docket;
  }

  async updateDocketStatus(id: number, status: string): Promise<Docket> {
    const [docket] = await db.update(dockets)
      .set({ status })
      .where(eq(dockets.id, id))
      .returning();
    return docket;
  }

  // Loading Sheets
  async getLoadingSheets(): Promise<LoadingSheet[]> {
    return await db.select().from(loadingSheets).orderBy(desc(loadingSheets.createdAt));
  }

  async getLoadingSheet(id: number): Promise<(LoadingSheet & { dockets: Docket[] }) | undefined> {
    const [sheet] = await db.select().from(loadingSheets).where(eq(loadingSheets.id, id));
    if (!sheet) return undefined;

    // Get linked dockets
    const links = await db.select().from(loadingSheetDockets).where(eq(loadingSheetDockets.loadingSheetId, id));
    const docketIds = links.map(l => l.docketId);
    
    let linkedDockets: Docket[] = [];
    if (docketIds.length > 0) {
      linkedDockets = await db.select().from(dockets).where(inArray(dockets.id, docketIds));
    }

    return { ...sheet, dockets: linkedDockets };
  }

  async createLoadingSheet(sheetData: InsertLoadingSheet & { docketIds: number[] }): Promise<LoadingSheet> {
    const { docketIds, ...sheetFields } = sheetData;
    
    const [sheet] = await db.insert(loadingSheets).values(sheetFields).returning();

    if (docketIds.length > 0) {
      await db.insert(loadingSheetDockets).values(
        docketIds.map(dId => ({ loadingSheetId: sheet.id, docketId: dId }))
      );
      
      // Update status of these dockets to 'loaded'
      await db.update(dockets)
        .set({ status: 'loaded' })
        .where(inArray(dockets.id, docketIds));
    }

    return sheet;
  }

  // Manifests
  async getManifests(): Promise<Manifest[]> {
    return await db.select().from(manifests).orderBy(desc(manifests.generatedAt));
  }

  async getManifest(id: number): Promise<(Manifest & { loadingSheet: LoadingSheet }) | undefined> {
    const [manifest] = await db.select().from(manifests).where(eq(manifests.id, id));
    if (!manifest) return undefined;

    const [sheet] = await db.select().from(loadingSheets).where(eq(loadingSheets.id, manifest.loadingSheetId));
    
    return { ...manifest, loadingSheet: sheet };
  }

  async createManifest(manifestData: InsertManifest): Promise<Manifest> {
    const [manifest] = await db.insert(manifests).values(manifestData).returning();
    
    // Find the loading sheet and mark it finalized if not already
    await db.update(loadingSheets)
      .set({ status: 'finalized' })
      .where(eq(loadingSheets.id, manifestData.loadingSheetId));

    // Also update dockets to 'in_transit'
    const links = await db.select().from(loadingSheetDockets).where(eq(loadingSheetDockets.loadingSheetId, manifestData.loadingSheetId));
    const docketIds = links.map(l => l.docketId);
    if (docketIds.length > 0) {
      await db.update(dockets)
        .set({ status: 'in_transit' })
        .where(inArray(dockets.id, docketIds));
    }

    return manifest;
  }

  // THCs
  async getThcs(): Promise<Thc[]> {
    return await db.select().from(thcs).orderBy(desc(thcs.createdAt));
  }

  async createThc(thcData: InsertThc): Promise<Thc> {
    const [thc] = await db.insert(thcs).values(thcData).returning();
    return thc;
  }

  async updateThc(id: number, updates: Partial<InsertThc>): Promise<Thc> {
    const [thc] = await db.update(thcs).set(updates).where(eq(thcs.id, id)).returning();
    return thc;
  }

  // PODs
  async getPods(): Promise<Pod[]> {
    return await db.select().from(pods).orderBy(desc(pods.createdAt));
  }

  async getPod(id: number): Promise<Pod | undefined> {
    const [pod] = await db.select().from(pods).where(eq(pods.id, id));
    return pod;
  }

  async createPod(podData: InsertPod): Promise<Pod> {
    const [pod] = await db.insert(pods).values(podData).returning();
    // Update docket status to delivered
    await db.update(dockets).set({ status: 'delivered' }).where(eq(dockets.id, podData.docketId));
    return pod;
  }

  async updatePodReview(id: number, status: "approved" | "rejected", rejectionReason?: string): Promise<Pod> {
    const [pod] = await db.update(pods)
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
    const [pod] = await db.update(pods)
      .set({ aiAnalysis: analysis })
      .where(eq(pods.id, id))
      .returning();
    return pod;
  }
}

export const storage = new DatabaseStorage();
