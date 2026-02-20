import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Banknote, ClipboardList, Truck, User } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateThc, useManifest, useManifests } from "@/hooks/use-logistics";
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

const formSchema = z.object({
  thcNumber: z.string().min(1),
  manifestId: z.coerce.number().min(1, "Select a manifest"),
  hireAmount: z.coerce.number().min(0),
  advanceAmount: z.coerce.number().min(0),
  balanceAmount: z.coerce.number().min(0),
  driverName: z.string().optional(),
  vehicleNumber: z.string().optional(),
  vendorType: z.string().optional(),
  vendorName: z.string().optional(),
  driverMobile: z.string().optional(),
  licenseNo: z.string().optional(),
  licenseExpiry: z.string().optional(),
  insuranceExpiry: z.string().optional(),
  fitnessValidity: z.string().optional(),
  vehicleRegisterDate: z.string().optional(),
  chasisNumber: z.string().optional(),
  engineNumber: z.string().optional(),
  departureTime: z.string().optional(),
  departureSeal: z.string().optional(),
  cewbNumber: z.string().optional(),
  advancePayableAt: z.string().optional(),
  balancePayableAt: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

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

function SectionTitle({ icon: Icon, title }: { icon: typeof Truck; title: string }) {
  return (
    <div className="flex items-center gap-3 text-base font-semibold text-primary">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span>{title}</span>
    </div>
  );
}

export default function ThcCreate() {
  const { data: manifests } = useManifests();
  const [selectedManifestId, setSelectedManifestId] = useState<number | null>(null);
  const manifestQuery = useManifest(selectedManifestId ?? 0);
  const selected = manifestQuery.data ?? null;
  const { mutate, isPending } = useCreateThc();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      thcNumber: `THC-${Math.floor(Math.random() * 10000)}`,
      hireAmount: 0,
      advanceAmount: 0,
      balanceAmount: 0,
      vendorType: "Market",
    },
  });

  const hireAmount = form.watch("hireAmount");
  const advanceAmount = form.watch("advanceAmount");
  const calculatedBalance = Math.max(0, Number(hireAmount) - Number(advanceAmount));

  useEffect(() => {
    if (!selected) return;
    if (selected.loadingSheet?.vehicleNumber) {
      form.setValue("vehicleNumber", selected.loadingSheet.vehicleNumber);
    }
  }, [selected, form]);

  const dockets = selected?.dockets ?? [];
  const totals = useMemo(
    () =>
      dockets.reduce(
        (acc, docket) => {
          acc.shipments += 1;
          acc.packages += docket.totalPackages ?? 0;
          acc.weight += Number(docket.totalWeight ?? 0);
          return acc;
        },
        { shipments: 0, packages: 0, weight: 0 },
      ),
    [dockets],
  );

  const onSubmit = (data: FormData) => {
    mutate(
      {
        thcNumber: data.thcNumber,
        manifestId: data.manifestId,
        hireAmount: String(data.hireAmount),
        advanceAmount: String(data.advanceAmount),
        balanceAmount: String(calculatedBalance),
        driverName: data.driverName,
        vehicleNumber: data.vehicleNumber,
      } as any,
      { onSuccess: () => (window.location.href = "/thc") },
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
            <h1 className="text-3xl font-bold font-display">THC Vehicle Loading</h1>
            <p className="text-muted-foreground mt-1">Prepare transport hire challan.</p>
          </div>
        </div>
        <Breadcrumb className="hidden md:block">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Operations</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>THC</BreadcrumbPage>
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

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="p-6 space-y-6">
          <SectionTitle icon={ClipboardList} title="Vehicle Loading" />

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Manifest" required>
              <Select
                value={selectedManifestId ? String(selectedManifestId) : ""}
                onValueChange={(value) => {
                  const numeric = Number(value);
                  setSelectedManifestId(numeric);
                  form.setValue("manifestId", numeric, { shouldValidate: true });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manifest..." />
                </SelectTrigger>
                <SelectContent>
                  {(manifests ?? []).map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.manifestNumber}
                    </SelectItem>
                  ))}
                  {(manifests ?? []).length === 0 ? (
                    <SelectItem value="none" disabled>
                      No manifests available
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Loading Sheet">
              <Input value={selected?.loadingSheet?.sheetNumber ?? ""} readOnly className="bg-muted/40" />
            </Field>
            <Field label="Trip ID">
              <Input value={selected?.manifestNumber ?? ""} readOnly className="bg-muted/40" />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Vehicle">
              <Input
                {...form.register("vehicleNumber")}
                placeholder="Vehicle number"
              />
            </Field>
            <Field label="Route">
              <Input value={selected?.loadingSheet?.destination ?? ""} readOnly className="bg-muted/40" />
            </Field>
            <Field label="Arrival Location">
              <Input value={selected?.loadingSheet?.destination ?? ""} readOnly className="bg-muted/40" />
            </Field>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 text-sm font-semibold text-primary">
            <Truck className="h-4 w-4" />
            <span>Leg Summary</span>
          </div>
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Leg</TableHead>
                <TableHead>Manifest</TableHead>
                <TableHead>Shipments</TableHead>
                <TableHead>Packages</TableHead>
                <TableHead>Weight (KG)</TableHead>
                <TableHead>Volume (CFT)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selected ? (
                <TableRow>
                  <TableCell className="font-medium">{selected.loadingSheet?.destination ?? "—"}</TableCell>
                  <TableCell className="font-mono">{selected.manifestNumber}</TableCell>
                  <TableCell>{totals.shipments}</TableCell>
                  <TableCell>{totals.packages}</TableCell>
                  <TableCell>{totals.weight.toFixed(2)}</TableCell>
                  <TableCell>0</TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Select a manifest to view summary.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <Card className="p-6 space-y-6">
          <SectionTitle icon={User} title="Vehicle Details" />
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Vendor Type">
              <Input {...form.register("vendorType")} placeholder="Market" />
            </Field>
            <Field label="Vendor">
              <Input {...form.register("vendorName")} placeholder="Vendor name" />
            </Field>
            <Field label="Driver">
              <Input {...form.register("driverName")} placeholder="Driver name" />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Driver Mobile">
              <Input {...form.register("driverMobile")} placeholder="Phone number" />
            </Field>
            <Field label="License No">
              <Input {...form.register("licenseNo")} placeholder="License number" />
            </Field>
            <Field label="Expiry Date">
              <Input {...form.register("licenseExpiry")} type="date" />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Chasis Number">
              <Input {...form.register("chasisNumber")} placeholder="Chasis number" />
            </Field>
            <Field label="Engine Number">
              <Input {...form.register("engineNumber")} placeholder="Engine number" />
            </Field>
            <Field label="Insurance Expiry Date">
              <Input {...form.register("insuranceExpiry")} type="date" />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Fitness Validity Date">
              <Input {...form.register("fitnessValidity")} type="date" />
            </Field>
            <Field label="Vehicle Register Date">
              <Input {...form.register("vehicleRegisterDate")} type="date" />
            </Field>
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <SectionTitle icon={Banknote} title="Advance and Balance" />
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Contract Amount (INR)" required>
              <Input type="number" {...form.register("hireAmount")} />
            </Field>
            <Field label="S. Charge (INR)">
              <Input type="number" placeholder="0.00" />
            </Field>
            <Field label="Other Amount (INR)">
              <Input type="number" placeholder="0.00" />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Total Trip Amount (INR)">
              <Input type="number" value={hireAmount} readOnly className="bg-muted/40" />
            </Field>
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <SectionTitle icon={Banknote} title="Balance Amount" />
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Advance Amount (INR)" required>
              <Input type="number" {...form.register("advanceAmount")} />
            </Field>
            <Field label="Advance Payable At">
              <Input {...form.register("advancePayableAt")} placeholder="Location" />
            </Field>
            <Field label="Balance Amount (INR)">
              <Input value={calculatedBalance} readOnly className="bg-muted/40" />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Balance Payable At">
              <Input {...form.register("balancePayableAt")} placeholder="Location" />
            </Field>
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <SectionTitle icon={ClipboardList} title="Departure Details" />
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Enter Departure Time" required>
              <Input type="datetime-local" {...form.register("departureTime")} />
            </Field>
            <Field label="Enter Departure Seal" required>
              <Input {...form.register("departureSeal")} placeholder="Seal number" />
            </Field>
            <Field label="CEWB Number" required>
              <Input {...form.register("cewbNumber")} placeholder="CEWB number" />
            </Field>
          </div>
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={!selectedManifestId || isPending}>
            {isPending ? "Creating..." : "Depart"}
          </Button>
        </div>
      </form>
    </div>
  );
}
