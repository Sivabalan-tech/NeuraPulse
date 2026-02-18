import { 
  MessageSquare, 
  Activity, 
  CalendarCheck, 
  Bell, 
  Shield, 
  Mic,
  BarChart3,
  Heart
} from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "AI Chat Assistant",
    description: "Describe symptoms naturally using text or voice. Our AI processes your input to provide non-diagnostic care suggestions.",
    color: "primary" as const
  },
  {
    icon: Activity,
    title: "Health Log Tracking",
    description: "Keep comprehensive records of your health data with encrypted storage and easy access to your history.",
    color: "accent" as const
  },
  {
    icon: BarChart3,
    title: "Interactive Dashboard",
    description: "Visualize health trends with beautiful charts and gain insights into your wellness journey over time.",
    color: "primary" as const
  },
  {
    icon: CalendarCheck,
    title: "Appointment Assistance",
    description: "Get help scheduling appointments and receive guidance on when professional consultation may be needed.",
    color: "accent" as const
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Never miss medications or health check-ups with intelligent notification scheduling.",
    color: "primary" as const
  },
  {
    icon: Shield,
    title: "Data Privacy",
    description: "Your health data is protected with JWT authentication and encrypted MongoDB storage.",
    color: "accent" as const
  },
  {
    icon: Mic,
    title: "Voice Recording",
    description: "Record symptoms via audio for a more natural and accessible health logging experience.",
    color: "primary" as const
  },
  {
    icon: Heart,
    title: "Stress Detection",
    description: "Experimental feature to monitor and detect stress levels for holistic wellness support.",
    color: "accent" as const
  }
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full mb-4">
            Features
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Comprehensive Healthcare Support
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need for AI-assisted health management, all in one secure platform.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-card p-6 rounded-xl border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                feature.color === 'primary' 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-accent/10 text-accent'
              }`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
