
import { storage } from "./storage";
import { db } from "./db";
import { dockets, docketItems, loadingSheets, loadingSheetDockets, manifests, thcs, pods } from "@shared/schema";

async function seed() {
  console.log("Seeding database...");
  if (!db) {
    throw new Error("DATABASE_URL must be set to seed the database.");
  }

  // clear existing data
  await db.delete(pods);
  await db.delete(thcs);
  await db.delete(manifests);
  await db.delete(loadingSheetDockets);
  await db.delete(loadingSheets);
  await db.delete(docketItems);
  await db.delete(dockets);


  // Create Dockets
  const docket1 = await storage.createDocket({
    docketNumber: "DOC-001",
    senderName: "Acme Corp",
    senderAddress: "123 Industrial Park, NY",
    receiverName: "Global Logistics",
    receiverAddress: "456 Port Rd, NJ",
    pickupDate: new Date("2023-10-25").toISOString(),
    deliveryDate: new Date("2023-10-27").toISOString(),
    status: "booked",
    specialInstructions: "Handle with care",
    totalWeight: "500.00",
    totalPackages: 10,
    items: [
      { description: "Electronics", weight: "200.00", quantity: 5, packageType: "box" },
      { description: "Cables", weight: "300.00", quantity: 5, packageType: "pallet" }
    ]
  });

  const docket2 = await storage.createDocket({
    docketNumber: "DOC-002",
    senderName: "Tech Solutions",
    senderAddress: "789 Valley Dr, CA",
    receiverName: "Retail Store A",
    receiverAddress: "321 Main St, CA",
    pickupDate: new Date("2023-10-26").toISOString(),
    deliveryDate: new Date("2023-10-28").toISOString(),
    status: "booked",
    specialInstructions: "Urgent delivery",
    totalWeight: "150.50",
    totalPackages: 2,
    items: [
      { description: "Laptops", weight: "150.50", quantity: 2, packageType: "box" }
    ]
  });

  const docket3 = await storage.createDocket({
    docketNumber: "DOC-003",
    senderName: "Fresh Foods",
    senderAddress: "Farm Lane 1, TX",
    receiverName: "Supermarket Chain",
    receiverAddress: "Market St 5, TX",
    pickupDate: new Date("2023-10-27").toISOString(),
    deliveryDate: new Date("2023-10-27").toISOString(),
    status: "delivered", // Already delivered for POD testing
    specialInstructions: "Temperature controlled",
    totalWeight: "1000.00",
    totalPackages: 20,
    items: [
      { description: "Vegetables", weight: "1000.00", quantity: 20, packageType: "crate" }
    ]
  });

  // Create Loading Sheet with Docket 1 & 2
  const sheet = await storage.createLoadingSheet({
    sheetNumber: "LS-1001",
    vehicleNumber: "KA-01-AB-1234",
    driverName: "John Doe",
    destination: "NJ Hub",
    date: new Date().toISOString(),
    status: "finalized",
    docketIds: [docket1.id, docket2.id]
  });

  // Create Manifest from Loading Sheet
  const manifest = await storage.createManifest({
    loadingSheetId: sheet.id,
  });

  // Create THC for Manifest
  await storage.createThc({
    thcNumber: "THC-3001",
    manifestId: manifest.id,
    hireAmount: "5000.00",
    advanceAmount: "2000.00",
    balanceAmount: "3000.00",
    driverName: "John Doe",
    vehicleNumber: "KA-01-AB-1234",
    status: "generated"
  });

  // Create POD for Docket 3 (delivered)
  await storage.createPod({
    docketId: docket3.id,
    imageUrl: "https://placehold.co/600x400?text=POD+Image", // Placeholder for demo
  });

  console.log("Seeding complete!");
}

seed().catch(console.error);
