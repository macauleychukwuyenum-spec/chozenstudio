import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function PublicFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-navy text-navy-foreground">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-14 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2 space-y-4">
          <Logo />
          <p className="text-sm text-navy-foreground/70 max-w-sm">
            If You Can Imagine It, We Can Build It. Premium learning, digital products,
            and technology services — with rewards for every recommendation.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">Explore</h4>
          <ul className="space-y-2 text-sm text-navy-foreground/70">
            <li><Link to="/tiers" className="hover:text-navy-foreground">Chozen Tiers</Link></li>
            <li><Link to="/courses" className="hover:text-navy-foreground">Courses</Link></li>
            <li><Link to="/products" className="hover:text-navy-foreground">Digital Products</Link></li>
            <li><Link to="/services" className="hover:text-navy-foreground">Services</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">Company</h4>
          <ul className="space-y-2 text-sm text-navy-foreground/70">
            <li><Link to="/about" className="hover:text-navy-foreground">About</Link></li>
            <li><Link to="/blog" className="hover:text-navy-foreground">Blog</Link></li>
            <li><Link to="/contact" className="hover:text-navy-foreground">Contact</Link></li>
            <li><Link to="/auth" className="hover:text-navy-foreground">Sign in</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-6 text-xs text-navy-foreground/60 flex flex-col md:flex-row items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} Chozen Studio. All rights reserved.</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
            <Link to="/privacy" className="hover:text-navy-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-navy-foreground">Terms</Link>
            <Link to="/referral-policy" className="hover:text-navy-foreground">Referral Policy</Link>
            <Link to="/cookies" className="hover:text-navy-foreground">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

