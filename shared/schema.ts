
import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("staff"), // admin, staff, driver
  createdAt: timestamp("created_at").defaultNow(),
});

export const dockets = pgTable("dockets", {
  id: serial("id").primaryKey(),
  docketNumber: text("docket_number").notNull().unique(),
  senderName: text("sender_name").notNull(),
  senderAddress: text("sender_address").notNull(),
  receiverName: text("receiver_name").notNull(),
  receiverAddress: text("receiver_address").notNull(),
  pickupDate: date("pickup_date"),
  deliveryDate: date("delivery_date"),
  status: text("status").notNull().default("booked"), // booked, loaded, in_transit, delivered
  specialInstructions: text("special_instructions"),
  totalWeight: decimal("total_weight"),
  totalPackages: integer("total_packages"),
  geofenceLat: decimal("geofence_lat"),
  geofenceLng: decimal("geofence_lng"),
  geofenceRadiusKm: decimal("geofence_radius_km"),
  currentLat: decimal("current_lat"),
  currentLng: decimal("current_lng"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const docketItems = pgTable("docket_items", {
  id: serial("id").primaryKey(),
  docketId: integer("docket_id").notNull(),
  description: text("description").notNull(),
  weight: decimal("weight").notNull(),
  quantity: integer("quantity").notNull(),
  packageType: text("package_type").notNull(), // box, pallet, drum, etc.
});

export const loadingSheets = pgTable("loading_sheets", {
  id: serial("id").primaryKey(),
  sheetNumber: text("sheet_number").notNull().unique(),
  vehicleNumber: text("vehicle_number").notNull(),
  driverName: text("driver_name").notNull(),
  destination: text("destination").notNull(),
  date: date("date").defaultNow(),
  status: text("status").notNull().default("draft"), // draft, finalized
  createdAt: timestamp("created_at").defaultNow(),
});

export const loadingSheetDockets = pgTable("loading_sheet_dockets", {
  id: serial("id").primaryKey(),
  loadingSheetId: integer("loading_sheet_id").notNull(),
  docketId: integer("docket_id").notNull(),
});

export const manifests = pgTable("manifests", {
  id: serial("id").primaryKey(),
  manifestNumber: text("manifest_number").notNull().unique(),
  loadingSheetId: integer("loading_sheet_id").notNull(),
  generatedAt: timestamp("generated_at").defaultNow(),
  status: text("status").notNull().default("generated"),
});

export const thcs = pgTable("thcs", {
  id: serial("id").primaryKey(),
  thcNumber: text("thc_number").notNull().unique(),
  manifestId: integer("manifest_id").notNull(),
  hireAmount: decimal("hire_amount").notNull(),
  advanceAmount: decimal("advance_amount").notNull(),
  balanceAmount: decimal("balance_amount").notNull(),
  driverName: text("driver_name"), // Can be different from loading sheet if driver changes
  vehicleNumber: text("vehicle_number"),
  status: text("status").notNull().default("generated"), // generated, paid, completed
  createdAt: timestamp("created_at").defaultNow(),
});

export const pods = pgTable("pods", {
  id: serial("id").primaryKey(),
  docketId: integer("docket_id").notNull(),
  imageUrl: text("image_url").notNull(),
  status: text("status").notNull().default("pending_review"), // pending_review, approved, rejected
  aiAnalysis: jsonb("ai_analysis"), // Store structured analysis from OpenAI
  rejectionReason: text("rejection_reason"),
  approvedBy: integer("approved_by"), // User ID
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===

export const docketItemsRelations = relations(docketItems, ({ one }) => ({
  docket: one(dockets, {
    fields: [docketItems.docketId],
    references: [dockets.id],
  }),
}));

export const docketsRelations = relations(dockets, ({ many, one }) => ({
  items: many(docketItems),
  pod: one(pods, {
    fields: [dockets.id],
    references: [pods.docketId],
  }),
  loadingSheetDockets: many(loadingSheetDockets),
}));

export const loadingSheetsRelations = relations(loadingSheets, ({ many, one }) => ({
  dockets: many(loadingSheetDockets),
  manifest: one(manifests, {
    fields: [loadingSheets.id],
    references: [manifests.loadingSheetId],
  }),
}));

export const loadingSheetDocketsRelations = relations(loadingSheetDockets, ({ one }) => ({
  loadingSheet: one(loadingSheets, {
    fields: [loadingSheetDockets.loadingSheetId],
    references: [loadingSheets.id],
  }),
  docket: one(dockets, {
    fields: [loadingSheetDockets.docketId],
    references: [dockets.id],
  }),
}));

export const manifestsRelations = relations(manifests, ({ one, many }) => ({
  loadingSheet: one(loadingSheets, {
    fields: [manifests.loadingSheetId],
    references: [loadingSheets.id],
  }),
  thc: one(thcs, {
    fields: [manifests.id],
    references: [thcs.manifestId],
  }),
}));

export const thcsRelations = relations(thcs, ({ one }) => ({
  manifest: one(manifests, {
    fields: [thcs.manifestId],
    references: [manifests.id],
  }),
}));

export const podsRelations = relations(pods, ({ one }) => ({
  docket: one(dockets, {
    fields: [pods.docketId],
    references: [dockets.id],
  }),
  approver: one(users, {
    fields: [pods.approvedBy],
    references: [users.id],
  }),
}));


// === ZOD SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertDocketSchema = createInsertSchema(dockets).omit({ id: true, createdAt: true });
export const insertDocketItemSchema = createInsertSchema(docketItems).omit({ id: true, docketId: true });
export const insertLoadingSheetSchema = createInsertSchema(loadingSheets).omit({ id: true, createdAt: true });
export const insertLoadingSheetDocketSchema = createInsertSchema(loadingSheetDockets).omit({ id: true });
export const insertManifestSchema = createInsertSchema(manifests).omit({ id: true, generatedAt: true });
export const insertThcSchema = createInsertSchema(thcs).omit({ id: true, createdAt: true });
export const insertPodSchema = createInsertSchema(pods).omit({ id: true, createdAt: true, approvedAt: true, approvedBy: true, aiAnalysis: true, rejectionReason: true, status: true });


// === EXPLICIT TYPES ===

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Docket = typeof dockets.$inferSelect;
export type InsertDocket = z.infer<typeof insertDocketSchema>;
export type DocketItem = typeof docketItems.$inferSelect;
export type InsertDocketItem = z.infer<typeof insertDocketItemSchema>;

export type LoadingSheet = typeof loadingSheets.$inferSelect;
export type InsertLoadingSheet = z.infer<typeof insertLoadingSheetSchema>;

export type LoadingSheetDocket = typeof loadingSheetDockets.$inferSelect;

export type Manifest = typeof manifests.$inferSelect;
export type InsertManifest = z.infer<typeof insertManifestSchema>;

export type Thc = typeof thcs.$inferSelect;
export type InsertThc = z.infer<typeof insertThcSchema>;

export type Pod = typeof pods.$inferSelect;
export type InsertPod = z.infer<typeof insertPodSchema>;

// Request Types
export type CreateDocketRequest = InsertDocket & { items: InsertDocketItem[] };
export type CreateLoadingSheetRequest = InsertLoadingSheet & { docketIds: number[] };
export type CreateManifestRequest = { loadingSheetId: number };
export type CreateThcRequest = InsertThc;

export type UpdateDocketStatusRequest = { status: string };
export type ReviewPodRequest = { status: "approved" | "rejected", rejectionReason?: string };
