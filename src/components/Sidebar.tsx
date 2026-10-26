import React from 'react';
import {
  Activity,
  Archive,
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileCheck,
  FileSearch,
  Fingerprint,
  Flame,
  LayoutDashboard,
  Network,
  Shield,
  ShieldAlert,
  Sliders,
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'topology'
  | 'telemetry'
  | 'incidents'
  | 'investigation'
  | 'recovery'
  | 'approvals'
  | 'chaos-lab'
  | 'analytics'
  | 'timeline'
  | 'runbooks'
  | 'audit'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeIncidentsCount: number;
  pendingApprovalsCount?: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavSection {
  title: string;
  items: {
    id: NavTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activeIncidentsCount,
  pendingApprovalsCount = 0,
  collapsed,
  onToggleCollapse,
}) => {
  const sections: NavSection[] = [
    {
      title: 'OBSERVE',
      items: [
        { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'topology', label: 'Service Topology', icon: <Network className="w-4 h-4" /> },
        { id: 'telemetry', label: 'Live Telemetry', icon: <Activity className="w-4 h-4" /> },
      ],
    },
    {
      title: 'INVESTIGATE',
      items: [
        {
          id: 'incidents',
          label: 'Incidents',
          icon: <ShieldAlert className="w-4 h-4" />,
          badge: activeIncidentsCount > 0 ? activeIncidentsCount : undefined,
        },
        {
          id: 'investigation',
          label: 'Root Cause Analysis',
          icon: <FileSearch className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'RECOVER',
      items: [
        { id: 'recovery', label: 'Recovery Center', icon: <Shield className="w-4 h-4" /> },
        {
          id: 'approvals',
          label: 'Approval Inbox',
          icon: <FileCheck className="w-4 h-4" />,
          badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
        },
      ],
    },
    {
      title: 'IMPROVE',
      items: [
        { id: 'chaos-lab', label: 'Chaos Lab', icon: <Flame className="w-4 h-4" /> },
        { id: 'analytics', label: 'Experiment Analytics', icon: <BarChart3 className="w-4 h-4" /> },
        { id: 'timeline', label: 'Event Timeline', icon: <Clock className="w-4 h-4" /> },
        { id: 'runbooks', label: 'Runbook Library', icon: <BookOpen className="w-4 h-4" /> },
        { id: 'audit', label: 'Audit Explorer', icon: <Fingerprint className="w-4 h-4" /> },
        { id: 'settings', label: 'Settings', icon: <Sliders className="w-4 h-4" /> },
      ],
    },
  ];

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } border-r border-slate-800 bg-[#070B14] flex flex-col justify-between transition-all duration-200 select-none shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 z-30`}
    >
      {/* Scrollable Navigation Sections */}
      <div className="p-3 space-y-5 overflow-y-auto overflow-x-hidden flex-1">
        {sections.map((sec, secIdx) => (
          <div key={secIdx} className="space-y-1">
            {!collapsed && (
              <div className="px-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                {sec.title}
              </div>
            )}
            {sec.items.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center ${
                    collapsed ? 'justify-center px-2' : 'justify-between px-3'
                  } py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 shadow-sm shadow-cyan-950/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                  title={collapsed ? `${item.label} (${sec.title})` : undefined}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className={isActive ? 'text-cyan-400' : 'text-slate-500'}>
                      {item.icon}
                    </span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!collapsed && item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-bold border ${
                        item.id === 'approvals'
                          ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                          : 'bg-rose-950/80 text-rose-300 border-rose-800'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-slate-800/80 bg-[#070B14]">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-900 rounded-lg transition-colors text-xs cursor-pointer"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span className="ml-2">Collapse Sidebar</span>}
        </button>
      </div>
    </aside>
  );
};
