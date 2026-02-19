import { useEffect, useMemo, useState } from "react";
import { Activity, ClipboardList, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDockets, useDocketTracker } from "@/hooks/use-logistics";

function formatTimestamp(value: string | null) {
  if (!value) return "Pending";
  const date = new Date(value);
  return `${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function renderMeta(meta?: Record<string, any>) {
  if (!meta) return null;
  if (meta.sheetNumbers?.length) {
    return `Sheets: ${meta.sheetNumbers.join(", ")}`;
  }
  if (meta.manifestNumbers?.length) {
    return `Manifests: ${meta.manifestNumbers.join(", ")}`;
  }
  if (meta.thcNumbers?.length) {
    return `THCs: ${meta.thcNumbers.join(", ")}`;
  }
  if (meta.status && meta.imageUrl) {
    return `POD status: ${meta.status}`;
  }
  if (meta.status) {
    return `Status: ${meta.status}`;
  }
  return null;
}

export default function DocketTracker() {
  const { data: dockets, isLoading: loadingDockets } = useDockets();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedId && dockets && dockets.length > 0) {
      setSelectedId(dockets[0].id);
    }
  }, [dockets, selectedId]);

  const trackerQuery = useDocketTracker(selectedId ?? 0);
  const events = trackerQuery.data?.events ?? [];
  const docketStatus = trackerQuery.data?.status ?? "—";

  const docketOptions = useMemo(() => {
    if (!dockets) return [];
    return dockets.map((docket) => ({
      id: docket.id,
      label: `${docket.docketNumber} • ${docket.senderName} → ${docket.receiverName}`,
    }));
  }, [dockets]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Docket Tracker</h1>
          <p className="text-muted-foreground mt-1">
            Track lifecycle milestones from booking to delivery.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit capitalize">
          Current status: {docketStatus}
        </Badge>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-primary">
            <ClipboardList className="h-5 w-5" />
            <CardTitle className="text-lg">Select docket</CardTitle>
          </div>
          <div className="w-full lg:w-96">
            <Select
              value={selectedId ? String(selectedId) : undefined}
              onValueChange={(value) => setSelectedId(Number(value))}
              disabled={loadingDockets || docketOptions.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingDockets ? "Loading dockets..." : "Choose a docket"} />
              </SelectTrigger>
              <SelectContent>
                {docketOptions.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {trackerQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading tracker...</div>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
              <div className="space-y-4">
                {events.map((event, index) => {
                  const metaText = renderMeta(event.meta);
                  const isDone = !!event.timestamp;
                  return (
                    <div key={event.key} className="relative">
                      <div
                        className={`absolute left-[-22px] top-3 h-3 w-3 rounded-full border-2 ${
                          isDone ? "bg-primary border-primary" : "bg-background border-muted-foreground"
                        }`}
                      />
                      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-semibold text-foreground">{event.label}</h3>
                          </div>
                          <Badge variant={isDone ? "default" : "outline"}>
                            {isDone ? "Completed" : "Pending"}
                          </Badge>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {formatTimestamp(event.timestamp)}
                        </div>
                        {metaText && (
                          <div className="mt-2 text-sm text-muted-foreground">{metaText}</div>
                        )}
                      </div>
                      {index === events.length - 1 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 ml-4">
                          <Truck className="h-4 w-4" />
                          Lifecycle summary ends here.
                        </div>
                      )}
                    </div>
                  );
                })}
                {events.length === 0 && (
                  <div className="text-sm text-muted-foreground">No tracker data available.</div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
