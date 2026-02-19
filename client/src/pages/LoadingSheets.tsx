import { useMemo, useState } from "react";
import { useDockets, useLoadingSheet, useLoadingSheets, useCreateLoadingSheet, useFinalizeLoadingSheet } from "@/hooks/use-logistics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Plus, Loader2, Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertLoadingSheetSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { openPrintWindow } from "@/lib/print";

const formSchema = insertLoadingSheetSchema.extend({
  sheetNumber: z.string().min(1),
  vehicleNumber: z.string().min(1),
  driverName: z.string().min(1),
  destination: z.string().min(1),
  docketIds: z.array(z.number()).min(1, "Select at least one docket"),
});

type FormData = z.infer<typeof formSchema>;

export default function LoadingSheets() {
  const { data: sheets, isLoading } = useLoadingSheets();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { mutate: finalizeSheet, isPending: isFinalizing } = useFinalizeLoadingSheet();
  const [finalizingId, setFinalizingId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedQuery = useLoadingSheet(selectedId ?? 0);
  const selected = useMemo(() => selectedQuery.data ?? null, [selectedQuery.data]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-display">Loading Sheets</h1>
          <p className="text-muted-foreground mt-1">Prepare vehicle loading plans.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/25">
              <Plus className="w-4 h-4 mr-2" />
              New Sheet
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Loading Sheet</DialogTitle>
            </DialogHeader>
            <CreateLoadingSheetForm onSuccess={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Sheet #</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : sheets?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No loading sheets yet.
                  </TableCell>
                </TableRow>
              ) : (
                sheets?.map((sheet) => (
                  <TableRow key={sheet.id}>
                    <TableCell className="font-mono font-medium">{sheet.sheetNumber}</TableCell>
                    <TableCell>{sheet.vehicleNumber}</TableCell>
                    <TableCell>{sheet.driverName}</TableCell>
                    <TableCell>{sheet.destination}</TableCell>
                    <TableCell>{new Date(sheet.createdAt!).toLocaleDateString()}</TableCell>
                    <TableCell><StatusBadge status={sheet.status} /></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setSelectedId(sheet.id)}>
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={sheet.status === "finalized" || (isFinalizing && finalizingId === sheet.id)}
                          onClick={() => {
                            setFinalizingId(sheet.id);
                            finalizeSheet(sheet.id, {
                              onSettled: () => setFinalizingId(null),
                            });
                          }}
                        >
                          {isFinalizing && finalizingId === sheet.id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : null}
                          Finalize
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedId} onOpenChange={(open) => (!open ? setSelectedId(null) : undefined)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Loading Sheet Details</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            {selected ? (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Sheet #</div>
                    <div className="font-medium">{selected.sheetNumber}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Status</div>
                    <div className="font-medium capitalize">{selected.status}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Vehicle</div>
                    <div className="font-medium">{selected.vehicleNumber}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Driver</div>
                    <div className="font-medium">{selected.driverName}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Destination</div>
                    <div className="font-medium">{selected.destination}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Date</div>
                    <div className="font-medium">
                      {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "--"}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase text-muted-foreground mb-2">Dockets</div>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Docket #</TableHead>
                          <TableHead>Sender</TableHead>
                          <TableHead>Receiver</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.dockets?.length ? (
                          selected.dockets.map((docket) => (
                            <TableRow key={docket.id}>
                              <TableCell className="font-mono">{docket.docketNumber}</TableCell>
                              <TableCell>{docket.senderName}</TableCell>
                              <TableCell>{docket.receiverName}</TableCell>
                              <TableCell className="capitalize">{docket.status}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              No dockets
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs uppercase text-muted-foreground">Manifests</div>
                    {selected.manifests?.length ? (
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {selected.manifests.map((manifest) => (
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
                    {selected.thcs?.length ? (
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {selected.thcs.map((thc) => (
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

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const docketRows = (selected.dockets ?? [])
                        .map(
                          (d) =>
                            `<tr><td>${d.docketNumber}</td><td>${d.senderName}</td><td>${d.receiverName}</td><td>${d.status}</td></tr>`,
                        )
                        .join("");
                      const manifestRows = (selected.manifests ?? [])
                        .map(
                          (manifest) =>
                            `<tr><td>${manifest.manifestNumber}</td><td>${manifest.status}</td></tr>`,
                        )
                        .join("");
                      const thcRows = (selected.thcs ?? [])
                        .map(
                          (thc) =>
                            `<tr><td>${thc.thcNumber}</td><td>${thc.status}</td><td>${thc.hireAmount ?? ""}</td></tr>`,
                        )
                        .join("");
                      const bodyHtml = `
                        <div class="grid">
                          <div><div class="meta">Sheet #</div><div>${selected.sheetNumber}</div></div>
                          <div><div class="meta">Status</div><div>${selected.status}</div></div>
                          <div><div class="meta">Vehicle</div><div>${selected.vehicleNumber}</div></div>
                          <div><div class="meta">Driver</div><div>${selected.driverName}</div></div>
                          <div><div class="meta">Destination</div><div>${selected.destination}</div></div>
                          <div><div class="meta">Date</div><div>${selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "--"}</div></div>
                        </div>
                        <div class="section">
                          <h2>Dockets</h2>
                          <table>
                            <thead><tr><th>Docket #</th><th>Sender</th><th>Receiver</th><th>Status</th></tr></thead>
                            <tbody>${docketRows || "<tr><td colspan='4'>No dockets</td></tr>"}</tbody>
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
                      `;
                      openPrintWindow(`Loading Sheet ${selected.sheetNumber}`, bodyHtml);
                    }}
                  >
                    Print
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Loading details...</div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateLoadingSheetForm({ onSuccess }: { onSuccess: () => void }) {
  const { mutate, isPending } = useCreateLoadingSheet();
  const { data: dockets } = useDockets({ status: "booked" }); // Only fetch booked dockets

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sheetNumber: `LS-${Math.floor(Math.random() * 10000)}`,
      vehicleNumber: "",
      driverName: "",
      destination: "",
      docketIds: [],
    }
  });

  function onSubmit(data: FormData) {
    mutate(data, { onSuccess });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="sheetNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sheet Number</FormLabel>
                <FormControl><Input {...field} className="font-mono" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vehicleNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle Number</FormLabel>
                <FormControl><Input {...field} placeholder="XX-00-YY-1234" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="driverName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Driver Name</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="destination"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Destination</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-sm text-muted-foreground">Select Booked Dockets</h3>
          <div className="border rounded-md max-h-[200px] overflow-y-auto p-2 space-y-2">
            {dockets?.length === 0 && <p className="text-center text-sm p-4 text-muted-foreground">No booked dockets available.</p>}
            <FormField
              control={form.control}
              name="docketIds"
              render={() => (
                <FormItem>
                  {dockets?.map((docket) => (
                    <FormField
                      key={docket.id}
                      control={form.control}
                      name="docketIds"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={docket.id}
                            className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 hover:bg-muted/50 transition-colors"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(docket.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, docket.id])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== docket.id
                                        )
                                      )
                                }}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="font-mono text-sm">
                                {docket.docketNumber}
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
                                {docket.totalPackages} pkgs | {docket.receiverName} | {docket.receiverAddress}
                              </p>
                            </div>
                          </FormItem>
                        )
                      }}
                    />
                  ))}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onSuccess?.()}>Cancel</Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
            Create Sheet
          </Button>
        </div>
      </form>
    </Form>
  );
}
