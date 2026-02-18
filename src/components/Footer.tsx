// import { Heart } from "lucide-react"; // Removed unused import

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img
                src="/baymax.jpg"
                alt="NeuraPulse Logo"
                className="w-10 h-10 rounded-xl object-cover shadow-sm"
              />
              <span className="text-xl font-bold text-foreground">NeuraPulse AI</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Your intelligent healthcare companion for AI-assisted health support and wellness guidance.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Product</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Features</a></li>
              <li><a href="#dashboard" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Dashboard</a></li>
              <li><a href="#security" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Security</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Pricing</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Resources</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Documentation</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">API Reference</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Health Blog</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Support</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Privacy Policy</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Terms of Service</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">HIPAA Compliance</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Cookie Policy</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            © 2024 NeuraPulse AI. All rights reserved.
          </p>
          <p className="text-muted-foreground text-sm">
            Disclaimer: NeuraPulse AI provides wellness guidance only, not medical diagnosis.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
