import { useMemo, useState, type ReactNode } from "react";
import { useDockets, useCreateDocket, useDocket } from "@/hooks/use-logistics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  ClipboardList, 
  FileText, 
  Loader2, 
  Plus, 
  Search, 
  Truck, 
  User, 
  Users 
} from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertDocketSchema, insertDocketItemSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { openPrintWindow } from "@/lib/print";
import type { LoadingSheet, Manifest, Pod, Thc } from "@shared/schema";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const itemSchema = insertDocketItemSchema.extend({
  weight: z.coerce.number(),
  quantity: z.coerce.number(),
});

// Extended schema for the form including items
const formSchema = insertDocketSchema.extend({
  docketNumber: z.string().min(1, "Required"),
  senderName: z.string().min(1, "Required"),
  senderAddress: z.string().min(1, "Required"),
  receiverName: z.string().min(1, "Required"),
  receiverAddress: z.string().min(1, "Required"),
  items: z.array(itemSchema).min(1, "Add at least one item"),
  totalWeight: z.coerce.number(), // Coerce from input string
  totalPackages: z.coerce.number(),
  geofenceLat: z.preprocess(
    (value) => (value === "" || value == null ? undefined : Number(value)),
    z.number().optional(),
  ),
  geofenceLng: z.preprocess(
    (value) => (value === "" || value == null ? undefined : Number(value)),
    z.number().optional(),
  ),
  geofenceRadiusKm: z.preprocess(
    (value) => (value === "" || value == null ? undefined : Number(value)),
    z.number().positive().optional(),
  ),
  currentLat: z.preprocess(
    (value) => (value === "" || value == null ? undefined : Number(value)),
    z.number().optional(),
  ),
  currentLng: z.preprocess(
    (value) => (value === "" || value == null ? undefined : Number(value)),
    z.number().optional(),
  ),
});

type FormData = z.infer<typeof formSchema>;

function SimpleField({
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
    <div className={`space-y-2 ${className ?? ""}`.trim()}>
      <Label className="text-xs font-semibold text-muted-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}

export default function Dockets() {
  const [search, setSearch] = useState("");
  const { data: dockets, isLoading } = useDockets({ search });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selectedQuery = useDocket(selectedId ?? 0);
  const selected = useMemo(
    () => dockets?.find((docket) => docket.id === selectedId) ?? null,
    [dockets, selectedId],
  );
  const details = selectedQuery.data ?? null;
  const loadingSheets: LoadingSheet[] = details?.loadingSheets ?? [];
  const manifests: Manifest[] = details?.manifests ?? [];
  const thcs: Thc[] = details?.thcs ?? [];
  const pod: Pod | null = details?.pod ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display">Dockets</h1>
          <p className="text-muted-foreground mt-1">Manage all shipment bookings.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
              <Plus className="w-4 h-4 mr-2" />
              New Docket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Docket</DialogTitle>
            </DialogHeader>
            <CreateDocketForm onSuccess={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search dockets by number, sender, or receiver..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 max-w-md bg-muted/30"
            />
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold">Docket #</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Sender</TableHead>
                  <TableHead className="font-semibold">Receiver</TableHead>
                  <TableHead className="font-semibold">Items</TableHead>
                  <TableHead className="font-semibold">Weight</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">View/Print</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : dockets?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      No dockets found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  dockets?.map((docket) => (
                    <TableRow key={docket.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono font-medium">{docket.docketNumber}</TableCell>
                      <TableCell>{new Date(docket.createdAt!).toLocaleDateString()}</TableCell>
                      <TableCell>{docket.senderName}</TableCell>
                      <TableCell>{docket.receiverName}</TableCell>
                      <TableCell>{docket.totalPackages} pkgs</TableCell>
                      <TableCell>{docket.totalWeight} kg</TableCell>
                      <TableCell>
                        <StatusBadge status={docket.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelectedId(docket.id)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => (!open ? setSelectedId(null) : undefined)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Docket Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Docket #</div>
                    <div className="font-medium">{selected.docketNumber}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Status</div>
                    <div className="font-medium capitalize">{selected.status}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Sender</div>
                    <div className="font-medium">{selected.senderName}</div>
                    <div className="text-xs text-muted-foreground">{selected.senderAddress}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Receiver</div>
                    <div className="font-medium">{selected.receiverName}</div>
                    <div className="text-xs text-muted-foreground">{selected.receiverAddress}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Total Packages</div>
                    <div className="font-medium">{selected.totalPackages ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Total Weight</div>
                    <div className="font-medium">{selected.totalWeight ?? 0} kg</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase text-muted-foreground mb-2">Items</div>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Weight</TableHead>
                          <TableHead>Qty</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.items?.length ? (
                          selected.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.description}</TableCell>
                              <TableCell>{item.packageType}</TableCell>
                              <TableCell>{item.weight}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              No items
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs uppercase text-muted-foreground">Loading Sheets</div>
                    {loadingSheets.length ? (
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {loadingSheets.map((sheet) => (
                          <li key={sheet.id}>
                            <span className="font-semibold text-foreground">{sheet.sheetNumber}</span> •{" "}
                            {sheet.vehicleNumber} • {sheet.status}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-2 text-xs text-muted-foreground">Not linked yet</div>
                    )}
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs uppercase text-muted-foreground">Manifests</div>
                    {manifests.length ? (
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {manifests.map((manifest) => (
                          <li key={manifest.id}>
                            <span className="font-semibold text-foreground">{manifest.manifestNumber}</span> •{" "}
                            {manifest.status}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-2 text-xs text-muted-foreground">Not generated</div>
                    )}
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs uppercase text-muted-foreground">THCs</div>
                    {thcs.length ? (
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {thcs.map((thc) => (
                          <li key={thc.id}>
                            <span className="font-semibold text-foreground">{thc.thcNumber}</span> •{" "}
                            {thc.status}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-2 text-xs text-muted-foreground">Not created</div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs uppercase text-muted-foreground">POD</div>
                  {pod ? (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Status: <span className="text-foreground font-semibold">{pod.status}</span>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-muted-foreground">No POD uploaded</div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const itemsRows = (selected.items ?? [])
                        .map(
                          (item) =>
                            `<tr><td>${item.description}</td><td>${item.packageType}</td><td>${item.weight}</td><td>${item.quantity}</td></tr>`,
                        )
                        .join("");
                      const loadingSheetRows = loadingSheets
                        .map(
                          (sheet) =>
                            `<tr><td>${sheet.sheetNumber}</td><td>${sheet.vehicleNumber}</td><td>${sheet.status}</td></tr>`,
                        )
                        .join("");
                      const manifestRows = manifests
                        .map(
                          (manifest) =>
                            `<tr><td>${manifest.manifestNumber}</td><td>${manifest.status}</td></tr>`,
                        )
                        .join("");
                      const thcRows = thcs
                        .map(
                          (thc) =>
                            `<tr><td>${thc.thcNumber}</td><td>${thc.status}</td><td>${thc.hireAmount ?? ""}</td></tr>`,
                        )
                        .join("");
                      const bodyHtml = `
                        <div class="grid">
                          <div><div class="meta">Docket #</div><div>${selected.docketNumber}</div></div>
                          <div><div class="meta">Status</div><div>${selected.status}</div></div>
                          <div><div class="meta">Sender</div><div>${selected.senderName}</div><div class="meta">${selected.senderAddress}</div></div>
                          <div><div class="meta">Receiver</div><div>${selected.receiverName}</div><div class="meta">${selected.receiverAddress}</div></div>
                          <div><div class="meta">Total Packages</div><div>${selected.totalPackages ?? 0}</div></div>
                          <div><div class="meta">Total Weight</div><div>${selected.totalWeight ?? 0} kg</div></div>
                        </div>
                        <div class="section">
                          <h2>Items</h2>
                          <table>
                            <thead><tr><th>Description</th><th>Type</th><th>Weight</th><th>Qty</th></tr></thead>
                            <tbody>${itemsRows || "<tr><td colspan='4'>No items</td></tr>"}</tbody>
                          </table>
                        </div>
                        <div class="section">
                          <h2>Loading Sheets</h2>
                          <table>
                            <thead><tr><th>Sheet #</th><th>Vehicle</th><th>Status</th></tr></thead>
                            <tbody>${loadingSheetRows || "<tr><td colspan='3'>Not linked</td></tr>"}</tbody>
                          </table>
                        </div>
                        <div class="section">
                          <h2>Manifests</h2>
                          <table>
                            <thead><tr><th>Manifest #</th><th>Status</th></tr></thead>
                            <tbody>${manifestRows || "<tr><td colspan='2'>Not generated</td></tr>"}</tbody>
                          </table>
                        </div>
                        <div class="section">
                          <h2>THCs</h2>
                          <table>
                            <thead><tr><th>THC #</th><th>Status</th><th>Hire Amt</th></tr></thead>
                            <tbody>${thcRows || "<tr><td colspan='3'>Not created</td></tr>"}</tbody>
                          </table>
                        </div>
                        <div class="section">
                          <h2>POD</h2>
                          <div class="meta">${pod ? `Status: ${pod.status}` : "No POD uploaded"}</div>
                        </div>
                      `;
                      openPrintWindow(`Docket ${selected.docketNumber}`, bodyHtml);
                    }}
                  >
                    Print
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateDocketForm({ onSuccess }: { onSuccess: () => void }) {
  const { mutate, isPending } = useCreateDocket();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      docketNumber: `DKT-${Math.floor(Math.random() * 10000)}`,
      items: [{ description: "", weight: 0, quantity: 1, packageType: "box" }],
      totalWeight: 0,
      totalPackages: 0,
      geofenceLat: undefined,
      geofenceLng: undefined,
      geofenceRadiusKm: undefined,
      currentLat: undefined,
      currentLng: undefined,
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const onSubmit = (data: FormData) => {
    // Recalculate totals just in case
    const totalWeight = data.items.reduce((sum, item) => sum + Number(item.weight), 0);
    const totalPackages = data.items.reduce((sum, item) => sum + Number(item.quantity), 0);

    const trackingFields = {
      geofenceLat: data.geofenceLat != null ? String(data.geofenceLat) : undefined,
      geofenceLng: data.geofenceLng != null ? String(data.geofenceLng) : undefined,
      geofenceRadiusKm: data.geofenceRadiusKm != null ? String(data.geofenceRadiusKm) : undefined,
      currentLat: data.currentLat != null ? String(data.currentLat) : undefined,
      currentLng: data.currentLng != null ? String(data.currentLng) : undefined,
    };

    mutate({
      ...data,
      totalWeight: String(totalWeight), // Schema expects decimal string or number
      totalPackages,
      ...trackingFields,
      // Ensure strings for decimal fields in items
      items: data.items.map(item => ({ ...item, weight: String(item.weight) }))
    } as any, {
      onSuccess
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Accordion
          type="multiple"
          defaultValue={["basic", "consignor", "consignee", "invoice", "items", "freight"]}
          className="space-y-4"
        >
          <AccordionItem value="basic" className="border-none">
            <Card className="overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <ClipboardList className="h-4 w-4" />
                  Basic Detail
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="docketNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Docket / GCN No *</FormLabel>
                        <FormControl>
                          <Input {...field} className="font-mono" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <SimpleField label="GCN Date" required>
                    <Input type="datetime-local" />
                  </SimpleField>
                  <SimpleField label="GCN Mode" required>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="road">Road</SelectItem>
                        <SelectItem value="air">Air</SelectItem>
                        <SelectItem value="rail">Rail</SelectItem>
                        <SelectItem value="sea">Sea</SelectItem>
                      </SelectContent>
                    </Select>
                  </SimpleField>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <SimpleField label="PRQ No">
                    <Input placeholder="PRQ-0000" />
                  </SimpleField>
                  <SimpleField label="Payment Type" required>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="to-pay">To Pay</SelectItem>
                        <SelectItem value="tbb">TBB</SelectItem>
                      </SelectContent>
                    </Select>
                  </SimpleField>
                  <SimpleField label="Billing Party" required>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select billing party" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consignor">Consignor</SelectItem>
                        <SelectItem value="consignee">Consignee</SelectItem>
                        <SelectItem value="third-party">Third Party</SelectItem>
                      </SelectContent>
                    </Select>
                  </SimpleField>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <SimpleField label="Origin" required>
                    <Input placeholder="City code" />
                  </SimpleField>
                  <SimpleField label="From City" required>
                    <Input placeholder="City name and pin" />
                  </SimpleField>
                  <SimpleField label="To City" required>
                    <Input placeholder="City name and pin" />
                  </SimpleField>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <SimpleField label="Destination" required>
                    <Input placeholder="Destination hub" />
                  </SimpleField>
                  <SimpleField label="Transport Mode" required>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select transport mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-load">Full Load</SelectItem>
                        <SelectItem value="part-load">Part Load</SelectItem>
                        <SelectItem value="courier">Courier</SelectItem>
                      </SelectContent>
                    </Select>
                  </SimpleField>
                  <SimpleField label="EDD Date">
                    <Input type="datetime-local" />
                  </SimpleField>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <SimpleField label="Packaging Type">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select packaging" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="box">Box</SelectItem>
                        <SelectItem value="bag">Bag</SelectItem>
                        <SelectItem value="pallet">Pallet</SelectItem>
                        <SelectItem value="crate">Crate</SelectItem>
                      </SelectContent>
                    </Select>
                  </SimpleField>
                  <SimpleField label="Risk" required>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select risk" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="carrier">Carrier</SelectItem>
                        <SelectItem value="owner">Owner</SelectItem>
                      </SelectContent>
                    </Select>
                  </SimpleField>
                  <SimpleField label="Delivery Type" required>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select delivery type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="door">Door Delivery</SelectItem>
                        <SelectItem value="godown">Godown Delivery</SelectItem>
                        <SelectItem value="pickup">Pickup</SelectItem>
                      </SelectContent>
                    </Select>
                  </SimpleField>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <SimpleField label="Distance From Google">
                    <div className="flex h-9 items-center justify-between rounded-md border border-input bg-background px-3">
                      <span className="text-sm text-muted-foreground">Auto-calculate</span>
                      <Switch />
                    </div>
                  </SimpleField>
                  <SimpleField label="Distance (km)">
                    <Input type="number" placeholder="0" />
                  </SimpleField>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <SimpleField label="Consignor same as Billing Party">
                    <div className="flex h-9 items-center justify-between rounded-md border border-input bg-background px-3">
                      <span className="text-sm text-muted-foreground">Enable</span>
                      <Switch />
                    </div>
                  </SimpleField>
                  <SimpleField label="Consignee same as Billing Party">
                    <div className="flex h-9 items-center justify-between rounded-md border border-input bg-background px-3">
                      <span className="text-sm text-muted-foreground">Enable</span>
                      <Switch />
                    </div>
                  </SimpleField>
                  <SimpleField label="Volumetric">
                    <div className="flex h-9 items-center justify-between rounded-md border border-input bg-background px-3">
                      <span className="text-sm text-muted-foreground">Enable</span>
                      <Switch />
                    </div>
                  </SimpleField>
                  <SimpleField label="Individual">
                    <div className="flex h-9 items-center justify-between rounded-md border border-input bg-background px-3">
                      <span className="text-sm text-muted-foreground">Enable</span>
                      <Switch />
                    </div>
                  </SimpleField>
                </div>
              </AccordionContent>
            </Card>
          </AccordionItem>

          <AccordionItem value="consignor" className="border-none">
            <Card className="overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <User className="h-4 w-4" />
                  Consignor Details
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="senderName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Consignor Name *</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <SimpleField label="Contact Number" required>
                    <Input placeholder="Phone number" />
                  </SimpleField>
                  <SimpleField label="Alternate Contact No">
                    <Input placeholder="Alternate number" />
                  </SimpleField>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="senderAddress"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Consignor Address *</FormLabel>
                        <FormControl><Textarea {...field} className="min-h-[80px]" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <SimpleField label="Consignor GST Number" required>
                    <Input placeholder="GSTIN" />
                  </SimpleField>
                </div>
              </AccordionContent>
            </Card>
          </AccordionItem>

          <AccordionItem value="consignee" className="border-none">
            <Card className="overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Users className="h-4 w-4" />
                  Consignee Details
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="receiverName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Consignee Name *</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <SimpleField label="Contact Number" required>
                    <Input placeholder="Phone number" />
                  </SimpleField>
                  <SimpleField label="Alternate Contact No">
                    <Input placeholder="Alternate number" />
                  </SimpleField>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="receiverAddress"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Consignee Address *</FormLabel>
                        <FormControl><Textarea {...field} className="min-h-[80px]" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <SimpleField label="Consignee GST Number" required>
                    <Input placeholder="GSTIN" />
                  </SimpleField>
                </div>
              </AccordionContent>
            </Card>
          </AccordionItem>

          <AccordionItem value="invoice" className="border-none">
            <Card className="overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <FileText className="h-4 w-4" />
                  Invoice Details
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <SimpleField label="Eway Bill No">
                    <Input placeholder="Eway bill no" />
                  </SimpleField>
                  <SimpleField label="Eway Bill Date">
                    <Input type="date" />
                  </SimpleField>
                  <SimpleField label="Eway Bill Expiry Date">
                    <Input type="date" />
                  </SimpleField>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <SimpleField label="Invoice No" required>
                    <Input placeholder="Invoice number" />
                  </SimpleField>
                  <SimpleField label="Invoice Date" required>
                    <Input type="date" />
                  </SimpleField>
                  <SimpleField label="Invoice Amount" required>
                    <Input type="number" placeholder="0.00" />
                  </SimpleField>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <SimpleField label="No Of Package" required>
                    <Input type="number" placeholder="0" />
                  </SimpleField>
                  <SimpleField label="Actual Weight (KG)" required>
                    <Input type="number" placeholder="0.00" />
                  </SimpleField>
                  <SimpleField label="Cubic Weight">
                    <Input type="number" placeholder="0.00" readOnly className="bg-muted/40" />
                  </SimpleField>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <SimpleField label="Charged Weight (KG)" required>
                    <Input type="number" placeholder="0.00" />
                  </SimpleField>
                  <SimpleField label="Material Name">
                    <Input placeholder="Material name" />
                  </SimpleField>
                  <SimpleField label="Material Density">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select density" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </SimpleField>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <SimpleField label="Packaging Type">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select packaging" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="box">Box</SelectItem>
                        <SelectItem value="bag">Bag</SelectItem>
                        <SelectItem value="pallet">Pallet</SelectItem>
                        <SelectItem value="crate">Crate</SelectItem>
                      </SelectContent>
                    </Select>
                  </SimpleField>
                  <SimpleField label="GST Exempt">
                    <div className="flex h-9 items-center justify-between rounded-md border border-input bg-background px-3">
                      <span className="text-sm text-muted-foreground">Enable</span>
                      <Switch />
                    </div>
                  </SimpleField>
                </div>
              </AccordionContent>
            </Card>
          </AccordionItem>

          <AccordionItem value="items" className="border-none">
            <Card className="overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <ClipboardList className="h-4 w-4" />
                  Items
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-sm text-muted-foreground">Items</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ description: "", weight: 0, quantity: 1, packageType: "box" })}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Item
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <FormField
                        control={form.control}
                        name={`items.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Description</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name={`items.${index}.packageType`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Type</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name={`items.${index}.weight`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Weight (kg)</FormLabel>
                            <FormControl><Input type="number" {...field} /></FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Qty</FormLabel>
                            <FormControl><Input type="number" {...field} /></FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive">
                        <span className="sr-only">Delete</span>
                        &times;
                      </Button>
                    </div>
                  </div>
                ))}
              </AccordionContent>
            </Card>
          </AccordionItem>

          <AccordionItem value="freight" className="border-none">
            <Card className="overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Truck className="h-4 w-4" />
                  Freight Details
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <SimpleField label="Freight Rate" required>
                    <Input type="number" placeholder="0.00" />
                  </SimpleField>
                  <SimpleField label="Freight Rate Type">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select rate type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per-kg">Per KG</SelectItem>
                        <SelectItem value="per-package">Per Package</SelectItem>
                        <SelectItem value="flat">Flat</SelectItem>
                      </SelectContent>
                    </Select>
                  </SimpleField>
                  <SimpleField label="Freight Amount" required>
                    <Input type="number" placeholder="0.00" />
                  </SimpleField>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <SimpleField label="Other Amount">
                    <Input type="number" placeholder="0.00" />
                  </SimpleField>
                  <SimpleField label="Gross Amount">
                    <Input type="number" placeholder="0.00" readOnly className="bg-muted/40" />
                  </SimpleField>
                  <SimpleField label="RCM">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select RCM" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </SimpleField>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <SimpleField label="SAC">
                    <Input placeholder="Service accounting code" />
                  </SimpleField>
                  <SimpleField label="GST Rate (%)">
                    <Input type="number" placeholder="0" />
                  </SimpleField>
                  <SimpleField label="GST Charged Amount">
                    <Input type="number" placeholder="0.00" readOnly className="bg-muted/40" />
                  </SimpleField>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <SimpleField label="GST Amount">
                    <Input type="number" placeholder="0.00" readOnly className="bg-muted/40" />
                  </SimpleField>
                  <SimpleField label="Grand Total Amount">
                    <Input type="number" placeholder="0.00" readOnly className="bg-muted/40" />
                  </SimpleField>
                </div>
              </AccordionContent>
            </Card>
          </AccordionItem>
        </Accordion>

        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          Geofence and current location coordinates are auto-filled from sender and receiver
          addresses when you create the docket.
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onSuccess?.()}>Cancel</Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create Docket
          </Button>
        </div>
      </form>
    </Form>
  );
}
