import { useState } from "react";
import { useDockets, useLoadingSheets, useCreateLoadingSheet } from "@/hooks/use-logistics";
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : sheets?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
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
