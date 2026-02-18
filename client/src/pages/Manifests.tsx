import { useManifests, useCreateManifest, useLoadingSheets } from "@/hooks/use-logistics";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

export default function Manifests() {
  const { data: manifests, isLoading } = useManifests();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
                      <Button variant="ghost" size="sm">
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
