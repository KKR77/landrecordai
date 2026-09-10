import { 
  LayoutDashboard, 
  ListChecks, 
  Upload, 
  Bell, 
  Settings, 
  Shield,
  Activity
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export default function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'queue', label: 'Admin Queue', icon: ListChecks, badge: 23 },
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: 2 },
    { id: 'system', label: 'System Health', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide">DocVerify</h1>
            <p className="text-[10px] text-slate-400 tracking-wider uppercase">Fraud Detection</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  isActive ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-xs font-medium">
            AD
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium">Admin User</p>
            <p className="text-[10px] text-slate-400">Super Admin</p>
          </div>
          <div className="w-2 h-2 bg-green-400 rounded-full" title="Online"></div>
        </div>
      </div>
    </aside>
  );
}
