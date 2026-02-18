import { Button } from "@/components/ui/button";
import { ArrowRight, Mic, MessageCircle } from "lucide-react";
import heroImage from "@/assets/hero-baymax.jpg";

const HeroSection = () => {
  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
              <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              <span className="text-sm font-medium text-primary">AI-Powered Healthcare</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              Your Intelligent
              <span className="text-primary block">Healthcare Companion</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-lg">
              Experience empathetic AI-assisted health support with secure data management,
              symptom analysis, and personalized wellness guidance — all while maintaining
              your privacy.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="xl">
                Start Your Journey
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button variant="heroOutline" size="xl">
                Watch Demo
              </Button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm">Text Input</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                  <Mic className="w-5 h-5 text-accent" />
                </div>
                <span className="text-sm">Voice Input</span>
              </div>
            </div>
          </div>

          {/* Right Content - Hero Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border">
              <img
                src={heroImage}
                alt="NeuraPulse AI Healthcare Companion"
                className="w-full h-auto object-cover"
              />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-card/60 via-transparent to-transparent" />

              {/* Floating Stats Card */}
              <div className="absolute bottom-4 left-4 right-4 bg-card/90 backdrop-blur-sm rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Users</p>
                    <p className="text-2xl font-bold text-foreground">50K+</p>
                  </div>
                  <div className="w-px h-10 bg-border" />
                  <div>
                    <p className="text-sm text-muted-foreground">Health Logs</p>
                    <p className="text-2xl font-bold text-foreground">2M+</p>
                  </div>
                  <div className="w-px h-10 bg-border" />
                  <div>
                    <p className="text-sm text-muted-foreground">Satisfaction</p>
                    <p className="text-2xl font-bold text-accent">98%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-accent/10 rounded-full blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
