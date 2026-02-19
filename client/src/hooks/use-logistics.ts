import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { 
  CreateDocketRequest, 
  CreateLoadingSheetRequest, 
  CreateManifestRequest, 
  CreateThcRequest, 
  InsertPod,
  UpdateDocketStatusRequest,
  ReviewPodRequest
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// ==========================================
// DOCKETS
// ==========================================

export function useDockets(filters?: { status?: string, search?: string }) {
  const queryString = filters ? `?${new URLSearchParams(filters as any).toString()}` : '';
  return useQuery({
    queryKey: [api.dockets.list.path, filters],
    queryFn: async () => {
      const res = await fetch(`${api.dockets.list.path}${queryString}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch dockets");
      return api.dockets.list.responses[200].parse(await res.json());
    },
  });
}

export function useDocket(id: number) {
  return useQuery({
    queryKey: [api.dockets.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.dockets.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch docket");
      return api.dockets.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useDocketTracker(id: number) {
  return useQuery({
    queryKey: [api.dockets.tracker.path, id],
    queryFn: async () => {
      const url = buildUrl(api.dockets.tracker.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tracker");
      return api.dockets.tracker.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateDocket() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: CreateDocketRequest) => {
      const res = await fetch(api.dockets.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create docket");
      return api.dockets.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.dockets.list.path] });
      toast({ title: "Success", description: "Docket created successfully" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

// ==========================================
// LOADING SHEETS
// ==========================================

export function useLoadingSheets() {
  return useQuery({
    queryKey: [api.loadingSheets.list.path],
    queryFn: async () => {
      const res = await fetch(api.loadingSheets.list.path, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch loading sheets");
      return api.loadingSheets.list.responses[200].parse(await res.json());
    },
  });
}

export function useLoadingSheet(id: number) {
  return useQuery({
    queryKey: [api.loadingSheets.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.loadingSheets.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch loading sheet");
      return api.loadingSheets.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateLoadingSheet() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: CreateLoadingSheetRequest) => {
      const res = await fetch(api.loadingSheets.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create loading sheet");
      return api.loadingSheets.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.loadingSheets.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dockets.list.path] }); // Dockets status changes
      toast({ title: "Success", description: "Loading sheet created" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

export function useFinalizeLoadingSheet() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.loadingSheets.finalize.path, { id });
      const res = await fetch(url, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed to finalize loading sheet");
      return api.loadingSheets.finalize.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.loadingSheets.list.path] });
      toast({ title: "Success", description: "Loading sheet finalized" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

// ==========================================
// MANIFESTS
// ==========================================

export function useManifests() {
  return useQuery({
    queryKey: [api.manifests.list.path],
    queryFn: async () => {
      const res = await fetch(api.manifests.list.path, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch manifests");
      return api.manifests.list.responses[200].parse(await res.json());
    },
  });
}

export function useManifest(id: number) {
  return useQuery({
    queryKey: [api.manifests.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.manifests.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch manifest");
      return api.manifests.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateManifest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: CreateManifestRequest) => {
      const res = await fetch(api.manifests.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create manifest");
      return api.manifests.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.manifests.list.path] });
      toast({ title: "Success", description: "Manifest generated" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

// ==========================================
// THC (Transport Hire Challan)
// ==========================================

export function useThcs() {
  return useQuery({
    queryKey: [api.thcs.list.path],
    queryFn: async () => {
      const res = await fetch(api.thcs.list.path, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch THCs");
      return api.thcs.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateThc() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: CreateThcRequest) => {
      const res = await fetch(api.thcs.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate THC");
      return api.thcs.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.thcs.list.path] });
      toast({ title: "Success", description: "THC generated successfully" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

// ==========================================
// POD (Proof of Delivery)
// ==========================================

export function usePods() {
  return useQuery({
    queryKey: [api.pods.list.path],
    queryFn: async () => {
      const res = await fetch(api.pods.list.path, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch PODs");
      return api.pods.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreatePod() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: InsertPod) => {
      const res = await fetch(api.pods.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to upload POD");
      return api.pods.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.pods.list.path] });
      toast({ title: "Success", description: "POD uploaded, ready for AI analysis" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

export function useUploadPod() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch(api.pods.upload.path, {
        method: "POST",
        body: data,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to upload POD");
      return api.pods.upload.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.pods.list.path] });
      toast({ title: "Success", description: "POD uploaded, ready for AI analysis" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

export function useAnalyzePod() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.pods.analyze.path, { id });
      const res = await fetch(url, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("AI Analysis failed");
      return api.pods.analyze.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.pods.list.path] });
      toast({ title: "AI Analysis Complete", description: "Review the findings below." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

export function useReviewPod() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & ReviewPodRequest) => {
      const url = buildUrl(api.pods.review.path, { id });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to submit review");
      return api.pods.review.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.pods.list.path] });
      toast({ title: "Success", description: "POD review submitted" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

// ==========================================
// DASHBOARD
// ==========================================

export function useDashboard() {
  return useQuery({
    queryKey: [api.dashboard.get.path],
    queryFn: async () => {
      const res = await fetch(api.dashboard.get.path, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return api.dashboard.get.responses[200].parse(await res.json());
    },
    refetchInterval: 5000,
  });
}

// ==========================================
// AUDIT LOGS
// ==========================================

export function useAuditLogs(filters?: {
  action?: string;
  entityType?: string;
  entityId?: number;
  userId?: number;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const queryString = filters ? `?${new URLSearchParams(filters as any).toString()}` : "";
  return useQuery({
    queryKey: [api.auditLogs.list.path, filters],
    queryFn: async () => {
      const res = await fetch(`${api.auditLogs.list.path}${queryString}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return api.auditLogs.list.responses[200].parse(await res.json());
    },
  });
}
