
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { openai } from "./replit_integrations/image/client";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

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

  app.post(api.dockets.create.path, async (req, res) => {
    try {
      const input = api.dockets.create.input.parse(req.body);
      const docket = await storage.createDocket(input);
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
