import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { Activity, Heart, Thermometer, Moon } from "lucide-react";

const healthData = [
  { day: "Mon", heart: 72, sleep: 7.5, stress: 35 },
  { day: "Tue", heart: 68, sleep: 8, stress: 30 },
  { day: "Wed", heart: 75, sleep: 6.5, stress: 45 },
  { day: "Thu", heart: 70, sleep: 7, stress: 40 },
  { day: "Fri", heart: 73, sleep: 7.5, stress: 35 },
  { day: "Sat", heart: 65, sleep: 9, stress: 25 },
  { day: "Sun", heart: 67, sleep: 8.5, stress: 28 }
];

const stats = [
  { icon: Heart, label: "Heart Rate", value: "72 bpm", change: "+2%", color: "text-destructive" },
  { icon: Moon, label: "Avg Sleep", value: "7.7 hrs", change: "+5%", color: "text-primary" },
  { icon: Activity, label: "Stress Level", value: "Low", change: "-12%", color: "text-accent" },
  { icon: Thermometer, label: "Temperature", value: "98.6°F", change: "Normal", color: "text-chart-4" }
];

const DashboardPreview = () => {
  return (
    <section id="dashboard" className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full mb-4">
            Dashboard
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Visualize Your Health Data
          </h2>
          <p className="text-lg text-muted-foreground">
            Interactive charts and insights to help you understand your wellness trends.
          </p>
        </div>

        {/* Dashboard Preview */}
        <div className="bg-card rounded-2xl border border-border shadow-xl p-6 md:p-8">
          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, index) => (
              <Card key={index} className="bg-secondary/50 border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className={`text-xs mt-1 ${stat.color}`}>{stat.change}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg bg-card flex items-center justify-center ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Heart Rate Chart */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-foreground">
                  Heart Rate Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={healthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="day" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        domain={[60, 80]}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.5rem'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="heart" 
                        stroke="hsl(var(--destructive))" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Sleep & Stress Chart */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-foreground">
                  Sleep & Stress Levels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={healthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="day" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.5rem'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="sleep" 
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary) / 0.2)"
                        strokeWidth={2}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="stress" 
                        stroke="hsl(var(--accent))" 
                        fill="hsl(var(--accent) / 0.2)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardPreview;
