import { Shield, Lock, Key, Database, CheckCircle2 } from "lucide-react";

const securityFeatures = [
  {
    icon: Key,
    title: "JWT Authentication",
    description: "Secure token-based authentication protects your sessions"
  },
  {
    icon: Database,
    title: "Encrypted Storage",
    description: "MongoDB with encryption for all sensitive health data"
  },
  {
    icon: Lock,
    title: "Data Privacy",
    description: "Full compliance with privacy standards and user consent"
  },
  {
    icon: Shield,
    title: "Ethical AI",
    description: "Responsible AI usage with clear ethical boundaries"
  }
];

const SecuritySection = () => {
  return (
    <section id="security" className="py-20">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div>
              <span className="inline-block px-4 py-1 bg-accent/10 text-accent text-sm font-medium rounded-full mb-4">
                Security & Privacy
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Your Health Data, <br />Protected
              </h2>
              <p className="text-lg text-muted-foreground">
                We prioritize security and responsible AI usage. Your sensitive health 
                information is protected with industry-standard encryption and authentication.
              </p>
            </div>

            {/* Security Features List */}
            <div className="space-y-4">
              {securityFeatures.map((feature, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Visual */}
          <div className="relative">
            <div className="bg-card rounded-2xl border border-border p-8 shadow-xl">
              {/* Shield Icon */}
              <div className="w-24 h-24 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-12 h-12 text-accent" />
              </div>
              
              <h3 className="text-2xl font-bold text-foreground text-center mb-4">
                Enterprise-Grade Security
              </h3>
              
              {/* Checklist */}
              <div className="space-y-3">
                {[
                  "End-to-end encryption",
                  "HIPAA-compliant practices",
                  "Regular security audits",
                  "User consent management",
                  "Secure API services",
                  "No data sharing with third parties"
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Decorative */}
            <div className="absolute -top-4 -right-4 w-32 h-32 bg-accent/5 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default SecuritySection;
