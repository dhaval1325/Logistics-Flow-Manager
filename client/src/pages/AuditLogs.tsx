import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuditLogs } from "@/hooks/use-logistics";

function getCategory(action: string) {
  const prefix = action.split(".")[0] ?? "system";
  switch (prefix) {
    case "auth":
      return "Auth";
    case "docket":
      return "Dockets";
    case "loading_sheet":
      return "Loading Sheets";
    case "manifest":
      return "Manifests";
    case "thc":
      return "THC";
    case "pod":
      return "POD";
    default:
      return "System";
  }
}

export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const { data: logs, isLoading, error } = useAuditLogs({ search, limit: 200 });
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const rows = useMemo(() => logs ?? [], [logs]);
  const selected = rows.find((log) => log.id === selectedId) ?? null;
  const metaJson = selected?.meta ? JSON.stringify(selected.meta, null, 2) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Audit Logs</h1>
        <p className="text-muted-foreground mt-1">
          Track every important action performed in the system.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by action, user, or summary..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 max-w-md bg-muted/30"
            />
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold">Time</TableHead>
                  <TableHead className="font-semibold">User</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Action</TableHead>
                  <TableHead className="font-semibold">Entity</TableHead>
                  <TableHead className="font-semibold">Summary</TableHead>
                  <TableHead className="font-semibold">IP</TableHead>
                  <TableHead className="font-semibold text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      Loading audit logs...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-destructive">
                      Failed to load audit logs.
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No audit logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>{log.username ?? "System"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getCategory(log.action)}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-primary">
                        {log.action}
                      </TableCell>
                      <TableCell>
                        {log.entityType ? `${log.entityType} #${log.entityId ?? "-"}` : "--"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.summary ?? "--"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.ip ?? "--"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedId(log.id)}
                        >
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Time</div>
                    <div className="font-medium">{new Date(selected.createdAt).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">User</div>
                    <div className="font-medium">{selected.username ?? "System"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Action</div>
                    <div className="font-mono text-xs text-primary">{selected.action}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Category</div>
                    <div className="font-medium">{getCategory(selected.action)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Entity</div>
                    <div className="font-medium">
                      {selected.entityType ? `${selected.entityType} #${selected.entityId ?? "-"}` : "--"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">IP</div>
                    <div className="font-medium">{selected.ip ?? "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">User Agent</div>
                    <div className="text-xs text-muted-foreground break-all">
                      {selected.userAgent ?? "--"}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase text-muted-foreground">Summary</div>
                  <div className="mt-1 text-muted-foreground">{selected.summary ?? "--"}</div>
                </div>

                <div>
                  <div className="text-xs uppercase text-muted-foreground">Meta</div>
                  <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">
                    {metaJson ? (
                      <pre className="text-xs whitespace-pre-wrap break-words">{metaJson}</pre>
                    ) : (
                      <div className="text-muted-foreground">No metadata</div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
