import { useMemo, useState } from "react";
import { useLoadingSheet, useLoadingSheets, useFinalizeLoadingSheet } from "@/hooks/use-logistics";
import { Button } from "@/components/ui/button";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { openPrintWindow } from "@/lib/print";
import { Link } from "wouter";

export default function LoadingSheets() {
  const { data: sheets, isLoading } = useLoadingSheets();
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
        <Button asChild className="shadow-lg shadow-primary/25">
          <Link href="/loading-sheets/new">
            <Plus className="w-4 h-4 mr-2" />
            Create Loading Sheet
          </Link>
        </Button>
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
