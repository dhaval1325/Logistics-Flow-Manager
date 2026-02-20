import { useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Layers, Truck } from "lucide-react";
import { useCreateManifest, useLoadingSheet, useLoadingSheets } from "@/hooks/use-logistics";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-xs font-semibold text-muted-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number | string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 px-4 py-3 text-white shadow-sm",
        className,
      )}
    >
      <div className="text-xs uppercase tracking-wide text-white/80">{label}</div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
    </div>
  );
}

export default function ManifestCreate() {
  const { data: sheets } = useLoadingSheets();
  const finalizedSheets = useMemo(
    () => (sheets ?? []).filter((sheet) => sheet.status === "finalized"),
    [sheets],
  );
  const [selectedSheetId, setSelectedSheetId] = useState<number | null>(null);
  const { data: selectedSheet } = useLoadingSheet(selectedSheetId ?? 0);
  const { mutate, isPending } = useCreateManifest();

  const dockets = selectedSheet?.dockets ?? [];
  const totals = useMemo(() => {
    return dockets.reduce(
      (acc, docket) => {
        acc.shipments += 1;
        acc.packages += docket.totalPackages ?? 0;
        acc.weight += Number(docket.totalWeight ?? 0);
        return acc;
      },
      { shipments: 0, packages: 0, weight: 0 },
    );
  }, [dockets]);

  const handleGenerate = () => {
    if (!selectedSheetId) return;
    mutate(
      { loadingSheetId: selectedSheetId },
      { onSuccess: () => (window.location.href = "/manifests") },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={() => window.history.back()}
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-display">Vehicle Loading</h1>
            <p className="text-muted-foreground mt-1">Prepare manifest and vehicle load plan.</p>
          </div>
        </div>
        <Breadcrumb className="hidden md:block">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Loading Sheet</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Vehicle Loading</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Shipments" value={totals.shipments} className="bg-[#0f766e]" />
        <StatCard label="Packages" value={totals.packages} className="bg-[#0369a1]" />
        <StatCard label="Shipments Loaded" value={0} className="bg-[#b45309]" />
        <StatCard label="Packages Loaded" value={0} className="bg-[#1d4ed8]" />
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3 text-base font-semibold text-primary">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Truck className="h-4 w-4" />
          </span>
          <span>Vehicle Loading</span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Field label="Vehicle" required>
            <Input
              value={selectedSheet?.vehicleNumber ?? ""}
              placeholder="Vehicle number"
              readOnly
              className="bg-muted/40"
            />
          </Field>
          <Field label="Route" required>
            <Input
              value={selectedSheet?.destination ?? ""}
              placeholder="Route"
              readOnly
              className="bg-muted/40"
            />
          </Field>
          <Field label="Trip ID">
            <Input
              value={selectedSheet?.sheetNumber ?? ""}
              placeholder="Trip ID"
              readOnly
              className="bg-muted/40"
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Field label="Arrival Location">
            <Input value={selectedSheet?.destination ?? ""} readOnly className="bg-muted/40" />
          </Field>
          <Field label="Loading Sheet" required>
            <Select
              value={selectedSheetId ? String(selectedSheetId) : ""}
              onValueChange={(value) => setSelectedSheetId(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select loading sheet..." />
              </SelectTrigger>
              <SelectContent>
                {finalizedSheets.map((sheet) => (
                  <SelectItem key={sheet.id} value={String(sheet.id)}>
                    {sheet.sheetNumber} • {sheet.vehicleNumber}
                  </SelectItem>
                ))}
                {finalizedSheets.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No finalized sheets available
                  </SelectItem>
                ) : null}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Loading Location">
            <Input value={selectedSheet?.destination ?? ""} readOnly className="bg-muted/40" />
          </Field>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 text-sm font-semibold text-primary">
          <Layers className="h-4 w-4" />
          <span>Leg Summary</span>
        </div>
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Leg</TableHead>
              <TableHead>Shipments Loaded</TableHead>
              <TableHead>Packages Loaded</TableHead>
              <TableHead>Pending</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedSheet ? (
              <TableRow>
                <TableCell className="font-medium">{selectedSheet.destination}</TableCell>
                <TableCell>0</TableCell>
                <TableCell>0</TableCell>
                <TableCell>{totals.shipments}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" disabled>
                    Load Vehicle
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Select a loading sheet to view legs.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="text-sm font-semibold text-primary">GCN Details</div>
          <div className="text-xs text-muted-foreground">
            {dockets.length} GCNs • {totals.packages} pkgs • {totals.weight.toFixed(2)} kg
          </div>
        </div>
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>GCN No</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Pkgs</TableHead>
              <TableHead>Weight (KG)</TableHead>
              <TableHead>Leg</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dockets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No GCNs loaded for this sheet.
                </TableCell>
              </TableRow>
            ) : (
              dockets.map((docket) => (
                <TableRow key={docket.id}>
                  <TableCell className="font-mono">{docket.docketNumber}</TableCell>
                  <TableCell>{docket.senderName}</TableCell>
                  <TableCell>{docket.receiverName}</TableCell>
                  <TableCell>{docket.totalPackages ?? 0}</TableCell>
                  <TableCell>{Number(docket.totalWeight ?? 0).toFixed(2)}</TableCell>
                  <TableCell>{selectedSheet?.destination ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button onClick={handleGenerate} disabled={!selectedSheetId || isPending}>
          {isPending ? "Generating..." : "Generate Manifest"}
        </Button>
      </div>
    </div>
  );
}
