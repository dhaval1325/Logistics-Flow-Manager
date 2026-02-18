import { cn } from "@/lib/utils";

type StatusType = 
  | "booked" | "loaded" | "in_transit" | "delivered" 
  | "draft" | "finalized" 
  | "generated" | "paid" | "completed"
  | "pending_review" | "approved" | "rejected";

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

const statusConfig: Record<string, string> = {
  // Dockets
  booked: "bg-blue-100 text-blue-700 border-blue-200",
  loaded: "bg-purple-100 text-purple-700 border-purple-200",
  in_transit: "bg-orange-100 text-orange-700 border-orange-200 animate-pulse",
  delivered: "bg-green-100 text-green-700 border-green-200",
  
  // Loading Sheets
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  finalized: "bg-indigo-100 text-indigo-700 border-indigo-200",
  
  // Manifests/THC
  generated: "bg-cyan-100 text-cyan-700 border-cyan-200",
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  completed: "bg-slate-800 text-slate-100 border-slate-600",

  // POD
  pending_review: "bg-yellow-100 text-yellow-700 border-yellow-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles = statusConfig[status.toLowerCase()] || "bg-gray-100 text-gray-600 border-gray-200";

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize",
      styles,
      className
    )}>
      {status.replace('_', ' ')}
    </span>
  );
}
