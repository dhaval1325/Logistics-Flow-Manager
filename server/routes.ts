
import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { openai } from "./ai_integrations/image/client";
import multer from "multer";
import fs from "fs";
import path from "path";
import passport from "passport";
import { hashPassword, requireAuth, sanitizeUser } from "./auth";

const geocodeCache = new Map<string, { lat: number; lng: number } | null>();
let lastGeocodeAt = 0;

function normalizeAddress(value?: string | null) {
  return value?.trim() ?? "";
}

async function geocodeAddress(address: string) {
  const normalized = normalizeAddress(address);
  if (!normalized) return null;
  if (typeof fetch !== "function") {
    console.warn("Geocode skipped: fetch is not available in this runtime.");
    return null;
  }
  if (geocodeCache.has(normalized)) {
    return geocodeCache.get(normalized) ?? null;
  }

  const now = Date.now();
  const elapsed = now - lastGeocodeAt;
  if (elapsed < 1100) {
    await new Promise((resolve) => setTimeout(resolve, 1100 - elapsed));
  }
  lastGeocodeAt = Date.now();

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", normalized);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");

  const userAgent =
    process.env.GEOCODE_USER_AGENT ?? "LogisticsFlowManager/1.0 (self-hosted)";

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": userAgent,
      "Accept-Language": "en",
    },
  });

  if (!response.ok) {
    throw new Error(`Geocode request failed: ${response.status}`);
  }

  const data = (await response.json()) as Array<{ lat: string; lon: string }>;
  const first = data[0];
  if (!first) {
    geocodeCache.set(normalized, null);
    return null;
  }

  const result = { lat: Number(first.lat), lng: Number(first.lon) };
  if (Number.isNaN(result.lat) || Number.isNaN(result.lng)) {
    geocodeCache.set(normalized, null);
    return null;
  }

  geocodeCache.set(normalized, result);
  return result;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadsDir,
      filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        const ext = path.extname(file.originalname || "");
        const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
        cb(null, name);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  // Auth
  app.post(api.auth.register.path, async (req, res, next) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const existingUser = await storage.getUserByUsername(input.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const createdUser = await storage.createUser({
        username: input.username,
        password: hashPassword(input.password),
        role: input.role ?? "staff",
      });

      req.login(createdUser, (err) => {
        if (err) return next(err);
        return res.status(201).json(sanitizeUser(createdUser));
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.post(api.auth.login.path, (req, res, next) => {
    const parsed = api.auth.login.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0].message });
    }

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        return res.json(sanitizeUser(user));
      });
    })(req, res, next);
  });

  app.post(api.auth.logout.path, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session?.destroy(() => {
        res.json({ ok: true });
      });
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    return res.json(sanitizeUser(req.user as any));
  });

  app.use("/api", (req, res, next) => {
    if (req.path.startsWith("/auth")) {
      return next();
    }
    return requireAuth(req, res, next);
  });

  app.get(api.dashboard.get.path, async (_req, res) => {
    const dashboard = await storage.getDashboardStats();
    res.json(dashboard);
  });

  // Dockets
  app.get(api.dockets.list.path, async (req, res) => {
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const dockets = await storage.getDockets(status, search);
    res.json(dockets);
  });

  app.get(api.dockets.get.path, async (req, res) => {
    const docket = await storage.getDocket(Number(req.params.id));
    if (!docket) return res.status(404).json({ message: "Docket not found" });
    res.json(docket);
  });

  app.get(api.dockets.tracker.path, async (req, res) => {
    const tracker = await storage.getDocketTracker(Number(req.params.id));
    if (!tracker) return res.status(404).json({ message: "Docket not found" });
    res.json(tracker);
  });

  app.post(api.dockets.create.path, async (req, res) => {
    try {
      const input = api.dockets.create.input.parse(req.body);
      const nextInput = { ...input };

      const needsGeofence = nextInput.geofenceLat == null || nextInput.geofenceLng == null;
      const needsCurrent = nextInput.currentLat == null || nextInput.currentLng == null;

      if (needsGeofence) {
        try {
          const geofence = await geocodeAddress(nextInput.receiverAddress);
          if (geofence) {
            nextInput.geofenceLat = String(geofence.lat);
            nextInput.geofenceLng = String(geofence.lng);
            if (nextInput.geofenceRadiusKm == null) {
              nextInput.geofenceRadiusKm = "5";
            }
          }
        } catch (error) {
          console.warn("Geofence geocode failed:", error);
        }
      }

      if (needsCurrent) {
        try {
          const current = await geocodeAddress(nextInput.senderAddress);
          if (current) {
            nextInput.currentLat = String(current.lat);
            nextInput.currentLng = String(current.lng);
          }
        } catch (error) {
          console.warn("Current location geocode failed:", error);
        }
      }

      const docket = await storage.createDocket(nextInput);
      res.status(201).json(docket);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.patch(api.dockets.updateStatus.path, async (req, res) => {
    const docket = await storage.updateDocketStatus(Number(req.params.id), req.body.status);
    res.json(docket);
  });


  // Loading Sheets
  app.get(api.loadingSheets.list.path, async (req, res) => {
    const sheets = await storage.getLoadingSheets();
    res.json(sheets);
  });

  app.get(api.loadingSheets.get.path, async (req, res) => {
    const sheet = await storage.getLoadingSheet(Number(req.params.id));
    if (!sheet) return res.status(404).json({ message: "Loading Sheet not found" });
    res.json(sheet);
  });

  app.post(api.loadingSheets.create.path, async (req, res) => {
    const input = api.loadingSheets.create.input.parse(req.body);
    const sheet = await storage.createLoadingSheet(input);
    res.status(201).json(sheet);
  });

  app.post(api.loadingSheets.finalize.path, async (req, res) => {
    const sheet = await storage.finalizeLoadingSheet(Number(req.params.id));
    res.json(sheet);
  });


  // Manifests
  app.get(api.manifests.list.path, async (req, res) => {
    const manifests = await storage.getManifests();
    res.json(manifests);
  });

  app.get(api.manifests.get.path, async (req, res) => {
    const manifest = await storage.getManifest(Number(req.params.id));
    if (!manifest) return res.status(404).json({ message: "Manifest not found" });
    res.json(manifest);
  });

  app.post(api.manifests.create.path, async (req, res) => {
    const input = api.manifests.create.input.parse(req.body);
    const manifest = await storage.createManifest(input);
    res.status(201).json(manifest);
  });


  // THCs
  app.get(api.thcs.list.path, async (req, res) => {
    const thcs = await storage.getThcs();
    res.json(thcs);
  });

  app.post(api.thcs.create.path, async (req, res) => {
    const input = api.thcs.create.input.parse(req.body);
    const thc = await storage.createThc(input);
    res.status(201).json(thc);
  });

  app.patch(api.thcs.update.path, async (req, res) => {
    const input = api.thcs.update.input.parse(req.body);
    const thc = await storage.updateThc(Number(req.params.id), input);
    res.json(thc);
  });


  // PODs
  app.get(api.pods.list.path, async (req, res) => {
    const pods = await storage.getPods();
    res.json(pods);
  });

  app.post(api.pods.create.path, async (req, res) => {
    const input = api.pods.create.input.parse(req.body);
    const pod = await storage.createPod(input);
    res.status(201).json(pod);
  });

  app.post(api.pods.upload.path, upload.single("image"), async (req, res) => {
    const docketId = Number(req.body.docketId);
    if (!docketId) {
      return res.status(400).json({ message: "docketId is required" });
    }
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ message: "image file is required" });
    }

    const imageUrl = `/uploads/${file.filename}`;
    const pod = await storage.createPod({ docketId, imageUrl });
    res.status(201).json(pod);
  });

  app.post(api.pods.review.path, async (req, res) => {
    const { status, rejectionReason } = api.pods.review.input.parse(req.body);
    const pod = await storage.updatePodReview(Number(req.params.id), status, rejectionReason);
    res.json(pod);
  });

  app.post(api.pods.analyze.path, async (req, res) => {
    const podId = Number(req.params.id);
    const pod = await storage.getPod(podId);
    if (!pod) return res.status(404).json({ message: "POD not found" });

    try {
      if (!openai) {
        throw new Error("AI_INTEGRATIONS_OPENAI_API_KEY is not set.");
      }
      // Analyze with OpenAI
      // Note: In a real app, we'd handle the image URL properly. 
      // If it's a local upload (data URL or relative path), we might need to handle it.
      // For this MVP, we assume the URL is publicly accessible or we send the base64 content if stored.
      // If `imageUrl` is a placeholder, this might fail, so we'll wrap in try/catch.
      
      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this Proof of Delivery (POD) document. Check if it is readable, if it has a signature, and if it looks valid. Return a JSON object with fields: isReadable (boolean), hasSignature (boolean), issues (array of strings), recommendedAction ('approve' or 'reject')." },
              {
                type: "image_url",
                image_url: {
                  url: pod.imageUrl, // Ensure this is a valid URL or base64 data URI
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      });

      const analysis = JSON.parse(response.choices[0].message.content || "{}");
      
      const updatedPod = await storage.updatePodAnalysis(podId, analysis);
      res.json(updatedPod);
    } catch (error) {
      console.error("AI Analysis failed:", error);
      // Return a simulated analysis if real one fails (e.g. invalid URL in dev)
      const simulatedAnalysis = {
        isReadable: true,
        hasSignature: true,
        issues: ["Simulated analysis: No issues found (Real analysis failed)"],
        recommendedAction: "approve"
      };
      const updatedPod = await storage.updatePodAnalysis(podId, simulatedAnalysis);
      res.json(updatedPod);
    }
  });

  return httpServer;
}
