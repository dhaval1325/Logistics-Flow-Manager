import { useManifests, useCreateManifest, useLoadingSheets, useManifest } from "@/hooks/use-logistics";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, FileText, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { openPrintWindow } from "@/lib/print";

export default function Manifests() {
  const { data: manifests, isLoading } = useManifests();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const manifestQuery = useManifest(selectedId ?? 0);
  const selected = useMemo(() => manifestQuery.data ?? null, [manifestQuery.data]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-display">Manifests</h1>
          <p className="text-muted-foreground mt-1">Trip records and documentation.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/25">
              <Plus className="w-4 h-4 mr-2" /> Generate Manifest
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Manifest</DialogTitle>
            </DialogHeader>
            <GenerateManifestForm onSuccess={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Manifest #</TableHead>
                  <TableHead>Loading Sheet Ref</TableHead>
                  <TableHead>Generated At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : manifests?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No manifests generated.
                  </TableCell>
                </TableRow>
              ) : (
                manifests?.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono font-medium">{m.manifestNumber}</TableCell>
                    <TableCell className="text-muted-foreground">LS-{m.loadingSheetId}</TableCell>
                    <TableCell>{new Date(m.generatedAt!).toLocaleString()}</TableCell>
                    <TableCell><StatusBadge status={m.status} /></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedId(m.id)}>
                        <FileText className="w-4 h-4 mr-2" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedId} onOpenChange={(open) => (!open ? setSelectedId(null) : undefined)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manifest Details</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            {selected ? (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Manifest #</div>
                    <div className="font-medium">{selected.manifestNumber}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Status</div>
                    <div className="font-medium capitalize">{selected.status}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Generated At</div>
                    <div className="font-medium">
                      {selected.generatedAt ? new Date(selected.generatedAt).toLocaleString() : "--"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Loading Sheet</div>
                    <div className="font-medium">{selected.loadingSheet?.sheetNumber ?? `LS-${selected.loadingSheetId}`}</div>
                  </div>
                </div>

                {selected.loadingSheet && (
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Loading Sheet Details</div>
                    <div className="mt-2 rounded-lg border border-border p-3 text-sm text-muted-foreground">
                      Vehicle: <span className="text-foreground">{selected.loadingSheet.vehicleNumber}</span> | Driver:{" "}
                      <span className="text-foreground">{selected.loadingSheet.driverName}</span> | Destination:{" "}
                      <span className="text-foreground">{selected.loadingSheet.destination}</span>
                    </div>
                  </div>
                )}

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

                <div className="rounded-lg border border-border p-3 text-sm">
                  <div className="text-xs uppercase text-muted-foreground">THC</div>
                  {selected.thc ? (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{selected.thc.thcNumber}</span> •{" "}
                      {selected.thc.status}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-muted-foreground">No THC linked</div>
                  )}
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
                      const bodyHtml = `
                        <div class="grid">
                          <div><div class="meta">Manifest #</div><div>${selected.manifestNumber}</div></div>
                          <div><div class="meta">Status</div><div>${selected.status}</div></div>
                          <div><div class="meta">Generated At</div><div>${selected.generatedAt ? new Date(selected.generatedAt).toLocaleString() : "--"}</div></div>
                          <div><div class="meta">Loading Sheet</div><div>${selected.loadingSheet?.sheetNumber ?? `LS-${selected.loadingSheetId}`}</div></div>
                        </div>
                        ${
                          selected.loadingSheet
                            ? `<div class="section"><h2>Loading Sheet</h2><div class="meta">Vehicle: ${selected.loadingSheet.vehicleNumber} | Driver: ${selected.loadingSheet.driverName} | Destination: ${selected.loadingSheet.destination}</div></div>`
                            : ""
                        }
                        <div class="section">
                          <h2>Dockets</h2>
                          <table>
                            <thead><tr><th>Docket #</th><th>Sender</th><th>Receiver</th><th>Status</th></tr></thead>
                            <tbody>${docketRows || "<tr><td colspan='4'>No dockets</td></tr>"}</tbody>
                          </table>
                        </div>
                        <div class="section">
                          <h2>THC</h2>
                          <div class="meta">${selected.thc ? `${selected.thc.thcNumber} • ${selected.thc.status}` : "No THC linked"}</div>
                        </div>
                      `;
                      openPrintWindow(`Manifest ${selected.manifestNumber}`, bodyHtml);
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

const manifestFormSchema = z.object({
  loadingSheetId: z.coerce.number().min(1, "Required"),
});

function GenerateManifestForm({ onSuccess }: { onSuccess: () => void }) {
  const { mutate, isPending } = useCreateManifest();
  const { data: sheets } = useLoadingSheets(); // Should ideally filter for finalized sheets w/o manifests

  const form = useForm<z.infer<typeof manifestFormSchema>>({
    resolver: zodResolver(manifestFormSchema),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutate(data, { onSuccess }))} className="space-y-4">
        <FormField
          control={form.control}
          name="loadingSheetId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select Loading Sheet</FormLabel>
              <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value || "")}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sheet..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {sheets?.filter(s => s.status === 'finalized').map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.sheetNumber} ({s.vehicleNumber})
                    </SelectItem>
                  ))}
                  {(!sheets || sheets.filter(s => s.status === 'finalized').length === 0) && (
                    <div className="p-2 text-xs text-muted-foreground text-center">No finalized sheets available</div>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate"}
        </Button>
      </form>
    </Form>
  );
}
