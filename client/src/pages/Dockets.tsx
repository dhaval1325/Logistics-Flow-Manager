import { useState } from "react";
import { useDockets, useCreateDocket } from "@/hooks/use-logistics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Search, Loader2 } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertDocketSchema, insertDocketItemSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";

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

export default function Dockets() {
  const [search, setSearch] = useState("");
  const { data: dockets, isLoading } = useDockets({ search });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : dockets?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
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
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
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
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="docketNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Docket Number</FormLabel>
                <FormControl>
                  <Input {...field} className="font-mono" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Add pickup date etc if needed */}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4 p-4 rounded-lg bg-blue-50/50 border border-blue-100">
            <h3 className="font-semibold text-blue-900">Sender Details</h3>
            <FormField
              control={form.control}
              name="senderName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="senderAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4 p-4 rounded-lg bg-purple-50/50 border border-purple-100">
            <h3 className="font-semibold text-purple-900">Receiver Details</h3>
            <FormField
              control={form.control}
              name="receiverName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="receiverAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Items</h3>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ description: "", weight: 0, quantity: 1, packageType: "box" })}>
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
        </div>

        <div className="space-y-4 rounded-lg border border-dashed border-border p-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Geofence & Tracking (Optional)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="geofenceLat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Geofence Latitude</FormLabel>
                  <FormControl><Input type="number" step="0.0001" placeholder="e.g. 19.0760" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="geofenceLng"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Geofence Longitude</FormLabel>
                  <FormControl><Input type="number" step="0.0001" placeholder="e.g. 72.8777" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="geofenceRadiusKm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Geofence Radius (km)</FormLabel>
                  <FormControl><Input type="number" step="0.1" placeholder="e.g. 5" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="text-xs text-muted-foreground flex items-center">
              Set the geofence center + radius to highlight on the tracker map.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="currentLat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Latitude</FormLabel>
                  <FormControl><Input type="number" step="0.0001" placeholder="e.g. 19.0896" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currentLng"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Longitude</FormLabel>
                  <FormControl><Input type="number" step="0.0001" placeholder="e.g. 72.8656" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
