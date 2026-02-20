import { useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDockets, useCreateLoadingSheet } from "@/hooks/use-logistics";
import { insertLoadingSheetSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

const formSchema = insertLoadingSheetSchema.extend({
  driverName: z.string().optional(),
  docketIds: z.array(z.number()).min(1, "Select at least one GCN"),
  vehicleType: z.string().optional(),
  transportMode: z.string().optional(),
  loadingLocation: z.string().optional(),
  expectedDeparture: z.string().optional(),
  capacityTons: z.coerce.number().optional(),
  capacityCft: z.coerce.number().optional(),
  loadedKg: z.coerce.number().optional(),
  loadedCft: z.coerce.number().optional(),
  loadAddedKg: z.coerce.number().optional(),
  volumeAddedCft: z.coerce.number().optional(),
  weightUtil: z.coerce.number().optional(),
  volumeUtil: z.coerce.number().optional(),
});

type FormData = z.infer<typeof formSchema>;

function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: ReactNode }) {
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

function getLocation(value?: string | null, fallback?: string | null) {
  const source = value?.trim() || fallback?.trim() || "";
  if (!source) return "--";
  return source.split(",")[0]?.trim() || source;
}

function StatBadge({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

export default function LoadingSheetCreate() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: dockets } = useDockets({ status: "booked", search });
  const { mutate, isPending } = useCreateLoadingSheet();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sheetNumber: `LS-${Math.floor(Math.random() * 10000)}`,
      vehicleNumber: "",
      driverName: "",
      destination: "",
      docketIds: [],
      vehicleType: "",
      transportMode: "road",
      loadingLocation: "",
      expectedDeparture: "",
    },
  });

  const selectedIds = form.watch("docketIds") ?? [];
  const selectedDockets = useMemo(
    () => (dockets ?? []).filter((docket) => selectedIds.includes(docket.id)),
    [dockets, selectedIds],
  );

  const legs = useMemo(() => {
    const legSet = new Set<string>();
    selectedDockets.forEach((docket) => {
      const from = getLocation(docket.senderAddress, docket.senderName);
      const to = getLocation(docket.receiverAddress, docket.receiverName);
      legSet.add(`${from}-${to}`);
    });
    return Array.from(legSet);
  }, [selectedDockets]);

  const totals = useMemo(() => {
    return selectedDockets.reduce(
      (acc, docket) => {
        acc.count += 1;
        acc.packages += docket.totalPackages ?? 0;
        acc.weight += Number(docket.totalWeight ?? 0);
        return acc;
      },
      { count: 0, packages: 0, weight: 0 },
    );
  }, [selectedDockets]);

  const allIds = useMemo(() => (dockets ?? []).map((docket) => docket.id), [dockets]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));

  const onSubmit = (data: FormData) => {
    mutate(
      {
        sheetNumber: data.sheetNumber,
        vehicleNumber: data.vehicleNumber,
        driverName: data.driverName || "System",
        destination: data.destination,
        docketIds: data.docketIds,
      },
      { onSuccess: () => (window.location.href = "/loading-sheets") },
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
            <h1 className="text-3xl font-bold font-display">Create Loading Sheet</h1>
            <p className="text-muted-foreground mt-1">Assign GCNs to vehicle legs.</p>
          </div>
        </div>
        <Breadcrumb className="hidden md:block">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Departure</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Create Loading Sheet</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 text-base font-semibold text-primary">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Plus className="h-4 w-4" />
              </span>
              <span>Create Loading Sheet</span>
            </div>
            <Button type="button" variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Market
            </Button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Field label="Route" required>
              <Input {...form.register("destination")} placeholder="R0031: DELB-MUMB" />
            </Field>
            <Field label="Vehicle" required>
              <Input {...form.register("vehicleNumber")} placeholder="Vehicle number" />
            </Field>
            <Field label="Vehicle Type" required>
              <Select onValueChange={(value) => form.setValue("vehicleType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="truck">Truck</SelectItem>
                  <SelectItem value="container">Container</SelectItem>
                  <SelectItem value="trailer">Trailer</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Field label="Transport Mode" required>
              <Select
                defaultValue="road"
                onValueChange={(value) => form.setValue("transportMode", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="road">Road</SelectItem>
                  <SelectItem value="air">Air</SelectItem>
                  <SelectItem value="rail">Rail</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Trip ID">
              <Input
                {...form.register("sheetNumber")}
                readOnly
                className="bg-muted/40 text-muted-foreground"
              />
            </Field>
            <Field label="Loading Location">
              <Input {...form.register("loadingLocation")} placeholder="DELB" />
            </Field>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Field label="Expected Departure">
              <Input {...form.register("expectedDeparture")} type="datetime-local" />
            </Field>
            <Field label="Driver Name" required>
              <Input {...form.register("driverName")} placeholder="Driver name" />
            </Field>
            <Field label="Capacity (In Tons)" required>
              <Input {...form.register("capacityTons")} type="number" placeholder="0" />
            </Field>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Field label="Capacity Volume CFT" required>
              <Input {...form.register("capacityCft")} type="number" placeholder="0" />
            </Field>
            <Field label="Loaded Kg">
              <Input {...form.register("loadedKg")} type="number" placeholder="0" />
            </Field>
            <Field label="Loaded Volume CFT">
              <Input {...form.register("loadedCft")} type="number" placeholder="0" />
            </Field>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Field label="Load Added Kg">
              <Input {...form.register("loadAddedKg")} type="number" placeholder="0" />
            </Field>
            <Field label="Volume Added CFT">
              <Input {...form.register("volumeAddedCft")} type="number" placeholder="0" />
            </Field>
            <Field label="Weight Utilization (%)">
              <Input {...form.register("weightUtil")} type="number" placeholder="0" />
            </Field>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Field label="Volume Utilization (%)">
              <Input {...form.register("volumeUtil")} type="number" placeholder="0" />
            </Field>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-base font-semibold text-primary">GCNs</div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline">
                  Select GCNs
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl">
                <DialogHeader>
                  <DialogTitle>Select GCNs</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="relative w-full md:max-w-sm">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search GCNs..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatBadge label="Dockets" value={totals.count} />
                      <StatBadge label="Packages" value={totals.packages} />
                      <StatBadge label="Weight" value={totals.weight.toFixed(2)} />
                    </div>
                  </div>

                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-10">
                              <Checkbox
                                checked={allSelected}
                                onCheckedChange={(checked) =>
                                  form.setValue("docketIds", checked === true ? allIds : [], { shouldValidate: true })
                                }
                              />
                          </TableHead>
                          <TableHead>GCN Date</TableHead>
                          <TableHead>GCN No</TableHead>
                          <TableHead>Suffix</TableHead>
                          <TableHead>Current Location</TableHead>
                          <TableHead>Origin</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>Packages</TableHead>
                          <TableHead>Weight (KG)</TableHead>
                          <TableHead>Volume (CFT)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(dockets ?? []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                              No GCNs found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          (dockets ?? []).map((docket) => (
                            <TableRow key={docket.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedIds.includes(docket.id)}
                                  onCheckedChange={(checked) => {
                                    form.setValue(
                                      "docketIds",
                                      checked === true
                                        ? [...selectedIds, docket.id]
                                        : selectedIds.filter((id) => id !== docket.id),
                                      { shouldValidate: true },
                                    );
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                {docket.createdAt ? new Date(docket.createdAt).toLocaleDateString() : "--"}
                              </TableCell>
                              <TableCell className="font-mono">{docket.docketNumber}</TableCell>
                              <TableCell>—</TableCell>
                              <TableCell>—</TableCell>
                              <TableCell>{getLocation(docket.senderAddress, docket.senderName)}</TableCell>
                              <TableCell>{getLocation(docket.receiverAddress, docket.receiverName)}</TableCell>
                              <TableCell>{docket.totalPackages ?? 0}</TableCell>
                              <TableCell>{Number(docket.totalWeight ?? 0).toFixed(2)}</TableCell>
                              <TableCell>0</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mt-4 rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Leg</TableHead>
                  <TableHead>GCNs</TableHead>
                  <TableHead className="text-right">Packages</TableHead>
                  <TableHead className="text-right">Weight (KG)</TableHead>
                  <TableHead className="text-right">Volume (CFT)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedDockets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                      No GCNs selected yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableCell className="font-medium">
                      {legs.length === 1 ? legs[0] : `${legs.length} legs`}
                    </TableCell>
                    <TableCell>{totals.count}</TableCell>
                    <TableCell className="text-right">{totals.packages}</TableCell>
                    <TableCell className="text-right">{totals.weight.toFixed(2)}</TableCell>
                    <TableCell className="text-right">0</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {form.formState.errors.docketIds ? (
            <p className="mt-3 text-sm text-destructive">{form.formState.errors.docketIds.message}</p>
          ) : null}
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Create Loading Sheet"}
          </Button>
        </div>
      </form>
    </div>
  );
}
