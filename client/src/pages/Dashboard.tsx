import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Truck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useDashboard } from "@/hooks/use-logistics";

const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Card className="hover:shadow-md transition-all duration-300 border-none relative overflow-hidden group">
      <div 
        className="absolute left-0 top-0 bottom-0 w-1.5" 
        style={{ backgroundColor: color }}
      />
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-muted-foreground tracking-tight">{title}</p>
            <h3 className="text-3xl font-extrabold tracking-tight text-foreground">{value}</h3>
            {trend && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700">
                  <CheckCircle2 className="w-3 h-3" />
                </span>
                <p className="text-xs font-bold text-green-600">
                  +{trend}% <span className="text-muted-foreground font-normal">vs last week</span>
                </p>
              </div>
            )}
          </div>
          <div className="p-4 rounded-2xl bg-muted/30 group-hover:bg-muted/50 transition-colors" style={{ color: color }}>
            <Icon className="h-7 w-7 stroke-[2.5px]" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export default function Dashboard() {
  const { data, isLoading } = useDashboard();
  const stats = data?.stats;
  const weekly = data?.weekly ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">Real-time logistics analytics and insights.</p>
        </div>
        <div className="text-sm text-muted-foreground font-mono">
          Last updated: {data ? new Date(data.updatedAt).toLocaleTimeString() : "—"}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Active Dockets" value={isLoading ? "—" : stats?.activeDockets ?? 0} icon={Package} color="#3b82f6" />
        <StatCard title="Vehicles in Transit" value={isLoading ? "—" : stats?.vehiclesInTransit ?? 0} icon={Truck} color="#8b5cf6" />
        <StatCard title="Pending PODs" value={isLoading ? "—" : stats?.pendingPods ?? 0} icon={AlertTriangle} color="#f59e0b" />
        <StatCard title="Completed Today" value={isLoading ? "—" : stats?.completedToday ?? 0} icon={CheckCircle2} color="#10b981" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Weekly Docket Volume</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weekly}>
                  <defs>
                    <linearGradient id="colorDockets" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: '1px solid hsl(var(--border))', 
                      boxShadow: 'var(--shadow-md)',
                      backgroundColor: 'hsl(var(--card))',
                      color: 'hsl(var(--card-foreground))'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="dockets" 
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1} 
                    fill="url(#colorDockets)" 
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekly}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <Tooltip 
                    cursor={{fill: 'hsl(var(--muted)/0.2)'}}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: '1px solid hsl(var(--border))', 
                      boxShadow: 'var(--shadow-md)',
                      backgroundColor: 'hsl(var(--card))',
                      color: 'hsl(var(--card-foreground))'
                    }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
