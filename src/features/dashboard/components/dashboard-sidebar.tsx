import { 
  BookOpen,
  Compass, 
  Gift,
  Home, 
  LayoutGrid, 
  LayoutTemplate, 
  Search, 
  Star, 
  Users, 
  Zap} from "lucide-react";
import Link from "next/link";

import { cn } from "@/core/utils";

export function DashboardSidebar() {
  return (
    <aside className="w-[240px] flex-shrink-0 h-full bg-[#fdfdfd]/80 backdrop-blur-md border-r border-surface-container flex flex-col pt-4 pb-6 px-3">
      {/* Logo Area */}
      <div className="flex items-center gap-2 px-3 mb-8">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-bold text-sm shadow-sm">
          B
        </div>
        <span className="font-extrabold text-foreground tracking-tight text-lg">Bridges</span>
      </div>

      {/* Main Nav */}
      <nav className="flex flex-col gap-0.5 mb-8">
        <NavItem icon={<Home size={18} />} label="Home" active />
        <NavItem icon={<Search size={18} />} label="Search" />
      </nav>

      {/* Projects */}
      <div className="mb-8">
        <h4 className="px-3 text-xs font-semibold text-muted mb-2 tracking-wider uppercase">Projects</h4>
        <nav className="flex flex-col gap-0.5">
          <NavItem icon={<LayoutGrid size={18} />} label="All projects" />
          <NavItem icon={<Star size={18} />} label="Starred" />
          <NavItem icon={<Users size={18} />} label="Shared with me" />
        </nav>
      </div>

      {/* Resources */}
      <div className="flex-1">
        <h4 className="px-3 text-xs font-semibold text-muted mb-2 tracking-wider uppercase">Resources</h4>
        <nav className="flex flex-col gap-0.5">
          <NavItem icon={<Compass size={18} />} label="Discover" />
          <NavItem icon={<LayoutTemplate size={18} />} label="Templates" />
          <NavItem icon={<BookOpen size={18} />} label="Learn" />
        </nav>
      </div>

      {/* Bottom Area */}
      <div className="mt-auto flex flex-col gap-2">
        <div className="p-3 bg-surface-container-low rounded-xl flex items-center justify-between cursor-pointer hover:bg-surface-container transition-colors group">
          <div>
            <p className="text-sm font-semibold text-foreground">Share Bridges</p>
            <p className="text-xs text-muted">Get 10 credits each</p>
          </div>
          <Gift size={16} className="text-muted group-hover:text-primary transition-colors" />
        </div>
        
        <div className="p-3 bg-surface-container-low rounded-xl flex items-center justify-between cursor-pointer hover:bg-surface-container border border-primary/10 transition-colors group">
          <div>
            <p className="text-sm font-semibold text-foreground">Upgrade to Pro</p>
            <p className="text-xs text-muted">Unlock more benefits</p>
          </div>
          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
            <Zap size={14} fill="currentColor" />
          </div>
        </div>

        <div className="mt-2 flex items-center gap-3 px-2 py-2 cursor-pointer hover:bg-surface-container-low rounded-lg transition-colors">
          <div className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs font-bold">
            U
          </div>
          <span className="text-sm font-medium text-foreground">User Profile</span>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link 
      href="#"
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        active 
          ? "bg-surface-container-high text-foreground" 
          : "text-muted hover:text-foreground hover:bg-surface-container-low"
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
