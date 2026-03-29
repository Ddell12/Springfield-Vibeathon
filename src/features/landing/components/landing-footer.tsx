import { APP_BRAND } from "@/core/config";

export function LandingFooter() {
  return (
    <footer className="bg-surface-container-low py-12">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col items-center md:items-start gap-2">
          <span className="text-lg font-medium text-primary font-headline">
            Bridges
          </span>
          <span className="text-xs text-on-surface-variant">
            &copy; {new Date().getFullYear()} {APP_BRAND}. All rights reserved.
          </span>
        </div>
        <div className="flex gap-8">
          <a href="#" className="text-xs text-on-surface-variant hover:text-on-surface transition-colors">
            Privacy Policy
          </a>
          <a href="#" className="text-xs text-on-surface-variant hover:text-on-surface transition-colors">
            Terms of Service
          </a>
          <a href="#" className="text-xs text-on-surface-variant hover:text-on-surface transition-colors">
            Accessibility
          </a>
        </div>
      </div>
    </footer>
  );
}
