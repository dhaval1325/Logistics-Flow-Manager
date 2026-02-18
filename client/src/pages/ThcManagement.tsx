import { useThcs, useCreateThc, useManifests } from "@/hooks/use-logistics";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

export default function ThcManagement() {
  const { data: thcs, isLoading } = useThcs();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : thcs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
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
