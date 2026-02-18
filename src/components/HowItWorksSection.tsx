import { UserPlus, MessageCircle, ClipboardList, TrendingUp } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Create Account",
    description: "Sign up securely with JWT authentication. Your data is encrypted from day one."
  },
  {
    number: "02",
    icon: MessageCircle,
    title: "Describe Symptoms",
    description: "Use text or voice to tell NeuraPulse how you're feeling. Our AI understands natural language."
  },
  {
    number: "03",
    icon: ClipboardList,
    title: "Get Guidance",
    description: "Receive wellness advice, care suggestions, and know when to seek professional help."
  },
  {
    number: "04",
    icon: TrendingUp,
    title: "Track Progress",
    description: "Monitor your health journey with interactive dashboards and smart insights."
  }
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1 bg-accent/10 text-accent text-sm font-medium rounded-full mb-4">
            How It Works
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Your Health Journey Simplified
          </h2>
          <p className="text-lg text-muted-foreground">
            Get started in minutes with our intuitive four-step process.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2 z-0" />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Card */}
                <div className="bg-card p-6 rounded-xl border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                  {/* Step Number */}
                  <div className="absolute -top-4 left-6 px-3 py-1 bg-primary text-primary-foreground text-sm font-bold rounded-lg">
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div className="w-14 h-14 bg-secondary rounded-xl flex items-center justify-center mb-4 mt-2">
                    <step.icon className="w-7 h-7 text-primary" />
                  </div>

                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {step.description}
                  </p>
                </div>

                {/* Arrow for desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-8 bg-card border border-border rounded-full -translate-y-1/2 z-20 flex items-center justify-center">
                    <div className="w-3 h-3 border-t-2 border-r-2 border-primary rotate-45 -ml-1" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
