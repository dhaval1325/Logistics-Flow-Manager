import { useEffect, useMemo, useState } from "react";
import { Activity, Check, ChevronsUpDown, ClipboardList, MapPin, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDockets, useDocketTracker } from "@/hooks/use-logistics";
import { cn } from "@/lib/utils";
import { MapContainer, TileLayer, Circle, CircleMarker, Polyline } from "react-leaflet";

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

function getZoom(radiusMeters?: number | null) {
  if (!radiusMeters) return 11;
  if (radiusMeters > 50000) return 7;
  if (radiusMeters > 20000) return 9;
  if (radiusMeters > 10000) return 10;
  return 12;
}

export default function DocketTracker() {
  const { data: dockets, isLoading: loadingDockets } = useDockets();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!selectedId && dockets && dockets.length > 0) {
      setSelectedId(dockets[0].id);
    }
  }, [dockets, selectedId]);

  const trackerQuery = useDocketTracker(selectedId ?? 0);
  const fallbackEvents = useMemo(
    () => [
      { key: "docket_created", label: "Docket created", timestamp: null },
      { key: "loading_sheet_created", label: "Loading sheet created", timestamp: null },
      { key: "manifest_created", label: "Manifest created", timestamp: null },
      { key: "thc_created", label: "THC created", timestamp: null },
      { key: "pod_uploaded", label: "POD uploaded", timestamp: null },
    ],
    [],
  );
  const events = trackerQuery.data?.events ?? (selectedId ? fallbackEvents : []);
  const docketStatus = trackerQuery.data?.status ?? "—";
  const geofence = trackerQuery.data?.geofence ?? null;
  const currentLocation = trackerQuery.data?.currentLocation ?? null;
  const defaultCenter: [number, number] = [40.7128, -74.006];
  const center: [number, number] = geofence
    ? [geofence.lat, geofence.lng]
    : currentLocation
      ? [currentLocation.lat, currentLocation.lng]
      : defaultCenter;

  const docketOptions = useMemo(() => {
    if (!dockets) return [];
    return dockets.map((docket) => ({
      id: docket.id,
      label: `${docket.docketNumber} • ${docket.senderName} → ${docket.receiverName}`,
    }));
  }, [dockets]);
  const selectedOption = docketOptions.find((option) => option.id === selectedId) ?? null;

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
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                  disabled={loadingDockets || docketOptions.length === 0}
                >
                  {selectedOption
                    ? selectedOption.label
                    : loadingDockets
                      ? "Loading dockets..."
                      : "Choose a docket"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search dockets..." />
                  <CommandEmpty>No dockets found.</CommandEmpty>
                  <CommandGroup>
                    {docketOptions.map((option) => (
                      <CommandItem
                        key={option.id}
                        value={`${option.label} ${option.id}`}
                        onSelect={() => {
                          setSelectedId(option.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedId === option.id ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="truncate">{option.label}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
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
                  <div className="text-sm text-muted-foreground">
                    No docket selected yet. Choose one from the dropdown.
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Live Map & Geofence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!geofence && !currentLocation && (
            <div className="text-sm text-muted-foreground">
              No tracking coordinates saved for this docket yet. Add geofence and current location
              values when creating or editing the docket.
            </div>
          )}
          <div className="h-[360px] w-full overflow-hidden rounded-xl border border-border">
            <MapContainer
              key={`${selectedId}-${center[0]}-${center[1]}`}
              center={center}
              zoom={getZoom(geofence?.radiusMeters ?? null)}
              scrollWheelZoom
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {geofence && (
                <Circle
                  center={[geofence.lat, geofence.lng]}
                  radius={geofence.radiusMeters}
                  pathOptions={{ color: "#2563eb", fillColor: "#93c5fd", fillOpacity: 0.2 }}
                />
              )}
              {currentLocation && (
                <CircleMarker
                  center={[currentLocation.lat, currentLocation.lng]}
                  radius={6}
                  pathOptions={{ color: "#16a34a", fillColor: "#22c55e", fillOpacity: 0.9 }}
                />
              )}
              {geofence && currentLocation && (
                <Polyline
                  positions={[
                    [currentLocation.lat, currentLocation.lng],
                    [geofence.lat, geofence.lng],
                  ]}
                  pathOptions={{ color: "#0f172a", dashArray: "6 6" }}
                />
              )}
            </MapContainer>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-muted-foreground">
            <div>
              <div className="text-xs uppercase tracking-wide">Geofence</div>
              <div className="text-foreground font-medium">
                {geofence
                  ? `${geofence.lat.toFixed(4)}, ${geofence.lng.toFixed(4)}`
                  : "Not set"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide">Radius</div>
              <div className="text-foreground font-medium">
                {geofence ? `${(geofence.radiusMeters / 1000).toFixed(1)} km` : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide">Current Location</div>
              <div className="text-foreground font-medium">
                {currentLocation
                  ? `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`
                  : "Not set"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
