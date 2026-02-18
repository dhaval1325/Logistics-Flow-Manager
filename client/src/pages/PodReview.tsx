import { usePods, useCreatePod, useAnalyzePod, useReviewPod } from "@/hooks/use-logistics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Upload, FileImage, Sparkles, Check, X, AlertCircle, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useDockets } from "@/hooks/use-logistics";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const uploadSchema = z.object({
  docketId: z.coerce.number().min(1, "Select a docket"),
  imageUrl: z.string().url("Must be a valid URL (simulated upload)"),
});

export default function PodReview() {
  const { data: pods, isLoading } = usePods();
  const { mutate: analyze, isPending: isAnalyzing } = useAnalyzePod();
  const { mutate: review, isPending: isReviewing } = useReviewPod();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectId, setRejectId] = useState<number | null>(null);

  const handleApprove = (id: number) => {
    review({ id, status: "approved" });
  };

  const handleReject = (id: number) => {
    if (!rejectReason) return;
    review({ id, status: "rejected", rejectionReason: rejectReason }, {
      onSuccess: () => {
        setRejectId(null);
        setRejectReason("");
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display">POD Review</h1>
          <p className="text-muted-foreground mt-1">AI-assisted Proof of Delivery verification.</p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/25">
              <Upload className="w-4 h-4 mr-2" />
              Upload POD
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Proof of Delivery</DialogTitle>
            </DialogHeader>
            <UploadPodForm onSuccess={() => setIsUploadOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <p>Loading PODs...</p>
        ) : pods?.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-muted/20 rounded-xl border border-dashed border-muted-foreground/25">
            <FileImage className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No PODs Pending</h3>
            <p className="text-muted-foreground">Upload a delivery receipt to start the review process.</p>
          </div>
        ) : (
          pods?.map((pod) => (
            <Card key={pod.id} className="overflow-hidden group hover:shadow-xl transition-all duration-300">
              <div className="relative h-48 bg-muted overflow-hidden">
                {/* Simulated Image Display */}
                <img 
                  src={pod.imageUrl} 
                  alt="POD" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-2 right-2">
                  <StatusBadge status={pod.status} className="shadow-sm" />
                </div>
              </div>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex justify-between">
                  <span>Docket #{pod.docketId}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {new Date(pod.createdAt!).toLocaleDateString()}
                  </span>
                </CardTitle>
                <CardDescription>
                  {pod.status === 'pending_review' ? 'Needs verification' : 'Review complete'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                {pod.aiAnalysis ? (
                  <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-sm space-y-2">
                    <div className="flex items-center gap-2 text-blue-700 font-medium">
                      <Sparkles className="w-3.5 h-3.5" /> AI Analysis
                    </div>
                    {/* Assuming structure of jsonb analysis */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>Clarity: <span className="text-foreground font-medium">{(pod.aiAnalysis as any).clarity || "Good"}</span></div>
                      <div>Signature: <span className="text-foreground font-medium">{(pod.aiAnalysis as any).signature ? "Detected" : "Missing"}</span></div>
                    </div>
                    <p className="text-xs border-t border-blue-200/50 pt-2 mt-1">
                      Rec: <span className="font-semibold text-blue-800">{(pod.aiAnalysis as any).recommendation || "Approve"}</span>
                    </p>
                  </div>
                ) : (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full"
                    onClick={() => analyze(pod.id)}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Sparkles className="w-3 h-3 mr-2" />}
                    Run AI Analysis
                  </Button>
                )}
              </CardContent>
              <CardFooter className="pt-0 gap-2">
                {pod.status === 'pending_review' && (
                  <>
                    {rejectId === pod.id ? (
                      <div className="w-full space-y-2 animate-in fade-in zoom-in-95 duration-200">
                        <Textarea 
                          placeholder="Reason for rejection..." 
                          className="h-20 text-xs"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" className="flex-1" onClick={() => setRejectId(null)}>Cancel</Button>
                          <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleReject(pod.id)} disabled={isReviewing}>
                            Confirm Reject
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Button 
                          variant="outline" 
                          className="flex-1 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                          onClick={() => setRejectId(pod.id)}
                        >
                          <X className="w-4 h-4 mr-1" /> Reject
                        </Button>
                        <Button 
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(pod.id)}
                          disabled={isReviewing}
                        >
                          <Check className="w-4 h-4 mr-1" /> Approve
                        </Button>
                      </>
                    )}
                  </>
                )}
                {pod.status === 'rejected' && (
                   <div className="w-full p-2 bg-red-50 text-red-800 text-xs rounded border border-red-100 flex items-start gap-2">
                     <AlertCircle className="w-4 h-4 shrink-0" />
                     <span>Reason: {pod.rejectionReason}</span>
                   </div>
                )}
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function UploadPodForm({ onSuccess }: { onSuccess: () => void }) {
  const { mutate, isPending } = useCreatePod();
  const { data: dockets } = useDockets({ status: "in_transit" }); // Or delivered

  const form = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutate(data as any, { onSuccess }))} className="space-y-4">
        <FormField
          control={form.control}
          name="docketId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select Docket</FormLabel>
              <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value || "")}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a docket..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {dockets?.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.docketNumber} - {d.receiverName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL (Mock)</FormLabel>
              {/* NOTE: In a real app this would be a file input uploading to S3/Cloudinary */}
              <FormControl>
                <Input {...field} placeholder="https://example.com/pod.jpg" />
              </FormControl>
              <p className="text-xs text-muted-foreground">For this demo, paste any image URL.</p>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload"}
        </Button>
      </form>
    </Form>
  );
}
