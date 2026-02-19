import { useThcs, useCreateThc, useManifests, useThc } from "@/hooks/use-logistics";
import type { Docket, LoadingSheet, Manifest } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { openPrintWindow } from "@/lib/print";

export default function ThcManagement() {
  const { data: thcs, isLoading } = useThcs();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedQuery = useThc(selectedId ?? 0);
  const selected = useMemo(
    () => thcs?.find((thc) => thc.id === selectedId) ?? null,
    [thcs, selectedId],
  );
  const details = selectedQuery.data ?? null;
  const manifest: Manifest | null = details?.manifest ?? null;
  const loadingSheet: LoadingSheet | null = details?.loadingSheet ?? null;
  const dockets: Docket[] = details?.dockets ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-display">THC Management</h1>
          <p className="text-muted-foreground mt-1">Transport Hire Challan & Payments.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/25">
              <Plus className="w-4 h-4 mr-2" /> New THC
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Transport Hire Challan</DialogTitle>
            </DialogHeader>
            <CreateThcForm onSuccess={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>THC #</TableHead>
                <TableHead>Manifest ID</TableHead>
                <TableHead>Hire Amt</TableHead>
                <TableHead>Advance</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">View/Print</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : thcs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No THCs created.
                  </TableCell>
                </TableRow>
              ) : (
                thcs?.map((thc) => (
                  <TableRow key={thc.id}>
                    <TableCell className="font-mono font-medium">{thc.thcNumber}</TableCell>
                    <TableCell>{thc.manifestId}</TableCell>
                    <TableCell className="font-mono">${Number(thc.hireAmount).toFixed(2)}</TableCell>
                    <TableCell className="font-mono text-green-600">${Number(thc.advanceAmount).toFixed(2)}</TableCell>
                    <TableCell className="font-mono text-red-600 font-medium">${Number(thc.balanceAmount).toFixed(2)}</TableCell>
                    <TableCell><StatusBadge status={thc.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelectedId(thc.id)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => (!open ? setSelectedId(null) : undefined)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>THC Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">THC #</div>
                    <div className="font-medium">{selected.thcNumber}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Status</div>
                    <div className="font-medium capitalize">{selected.status}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Manifest</div>
                    <div className="font-medium">{selected.manifestId}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Driver</div>
                    <div className="font-medium">{selected.driverName ?? "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Vehicle</div>
                    <div className="font-medium">{selected.vehicleNumber ?? "--"}</div>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hire Amount</span>
                    <span className="font-mono">${Number(selected.hireAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-muted-foreground">Advance</span>
                    <span className="font-mono">${Number(selected.advanceAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-muted-foreground">Balance</span>
                    <span className="font-mono font-semibold">${Number(selected.balanceAmount).toFixed(2)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs uppercase text-muted-foreground">Manifest</div>
                    {manifest ? (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{manifest.manifestNumber}</span> •{" "}
                        {manifest.status}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-muted-foreground">No manifest linked</div>
                    )}
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs uppercase text-muted-foreground">Loading Sheet</div>
                    {loadingSheet ? (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{loadingSheet.sheetNumber}</span> •{" "}
                        {loadingSheet.vehicleNumber}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-muted-foreground">No loading sheet linked</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase text-muted-foreground">Dockets</div>
                  <div className="mt-2 rounded-lg border border-border overflow-hidden">
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
                        {dockets.length ? (
                          dockets.map((docket) => (
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
                              No dockets linked
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const docketRows = dockets
                        .map(
                          (d) =>
                            `<tr><td>${d.docketNumber}</td><td>${d.senderName}</td><td>${d.receiverName}</td><td>${d.status}</td></tr>`,
                        )
                        .join("");
                      const bodyHtml = `
                        <div class="grid">
                          <div><div class="meta">THC #</div><div>${selected.thcNumber}</div></div>
                          <div><div class="meta">Status</div><div>${selected.status}</div></div>
                          <div><div class="meta">Manifest</div><div>${selected.manifestId}</div></div>
                          <div><div class="meta">Driver</div><div>${selected.driverName ?? "--"}</div></div>
                          <div><div class="meta">Vehicle</div><div>${selected.vehicleNumber ?? "--"}</div></div>
                        </div>
                        <div class="section">
                          <h2>Amounts</h2>
                          <table>
                            <tbody>
                              <tr><th>Hire Amount</th><td>$${Number(selected.hireAmount).toFixed(2)}</td></tr>
                              <tr><th>Advance</th><td>$${Number(selected.advanceAmount).toFixed(2)}</td></tr>
                              <tr><th>Balance</th><td>$${Number(selected.balanceAmount).toFixed(2)}</td></tr>
                            </tbody>
                          </table>
                        </div>
                        <div class="section">
                          <h2>Manifest</h2>
                          <div class="meta">${manifest ? `${manifest.manifestNumber} • ${manifest.status}` : "No manifest linked"}</div>
                        </div>
                        <div class="section">
                          <h2>Loading Sheet</h2>
                          <div class="meta">${loadingSheet ? `${loadingSheet.sheetNumber} • ${loadingSheet.vehicleNumber}` : "No loading sheet linked"}</div>
                        </div>
                        <div class="section">
                          <h2>Dockets</h2>
                          <table>
                            <thead><tr><th>Docket #</th><th>Sender</th><th>Receiver</th><th>Status</th></tr></thead>
                            <tbody>${docketRows || "<tr><td colspan='4'>No dockets linked</td></tr>"}</tbody>
                          </table>
                        </div>
                      `;
                      openPrintWindow(`THC ${selected.thcNumber}`, bodyHtml);
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

const thcFormSchema = z.object({
  thcNumber: z.string().min(1),
  manifestId: z.coerce.number().min(1),
  hireAmount: z.coerce.number().min(0),
  advanceAmount: z.coerce.number().min(0),
  balanceAmount: z.coerce.number(), // Calculated
  driverName: z.string().optional(),
  vehicleNumber: z.string().optional(),
});

function CreateThcForm({ onSuccess }: { onSuccess: () => void }) {
  const { mutate, isPending } = useCreateThc();
  const { data: manifests } = useManifests();

  const form = useForm<z.infer<typeof thcFormSchema>>({
    resolver: zodResolver(thcFormSchema),
    defaultValues: {
      thcNumber: `THC-${Math.floor(Math.random() * 10000)}`,
      hireAmount: 0,
      advanceAmount: 0,
      balanceAmount: 0,
    }
  });

  // Auto-calc balance
  const hire = form.watch("hireAmount");
  const advance = form.watch("advanceAmount");
  
  // NOTE: in a real app use useEffect to update balanceAmount field

  const onSubmit = (data: z.infer<typeof thcFormSchema>) => {
    mutate({
      ...data,
      hireAmount: String(data.hireAmount), // API expects decimal string/number
      advanceAmount: String(data.advanceAmount),
      balanceAmount: String(Number(data.hireAmount) - Number(data.advanceAmount)),
    } as any, { onSuccess });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="thcNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>THC Number</FormLabel>
              <FormControl><Input {...field} className="font-mono" /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="manifestId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Manifest</FormLabel>
              <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value || "")}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select manifest..." /></SelectTrigger></FormControl>
                <SelectContent>
                  {manifests?.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.manifestNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="hireAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Hire Amount</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="advanceAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Advance Paid</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="p-3 bg-muted rounded-md text-right">
          <span className="text-sm text-muted-foreground mr-2">Balance Due:</span>
          <span className="text-lg font-mono font-bold">${(Number(hire) - Number(advance)).toFixed(2)}</span>
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create THC"}
        </Button>
      </form>
    </Form>
  );
}
