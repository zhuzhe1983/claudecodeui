import React from 'react';
import { MessageSquare, Terminal, FolderOpen, GitBranch, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

const MobileNavImproved = ({ 
  activeTab, 
  setActiveTab, 
  isInputFocused = false,
  onShowSettings,
  hasNotifications = {}
}) => {
  const tabs = [
    { 
      id: 'chat', 
      label: 'Chat', 
      icon: MessageSquare,
      ariaLabel: 'Chat with AI assistant'
    },
    { 
      id: 'files', 
      label: 'Files', 
      icon: FolderOpen,
      ariaLabel: 'Browse project files'
    },
    { 
      id: 'shell', 
      label: 'Shell', 
      icon: Terminal,
      ariaLabel: 'Terminal shell'
    },
    { 
      id: 'git', 
      label: 'Git', 
      icon: GitBranch,
      ariaLabel: 'Source control'
    },
  ];

  // Hide nav when input is focused to avoid keyboard overlap
  if (isInputFocused) {
    return null;
  }

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 md:hidden safe-area-bottom"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-5 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const hasNotif = hasNotifications[tab.id];
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 transition-all",
                "min-h-[56px] touch-manipulation", // Ensure good touch target
                isActive 
                  ? "text-primary bg-primary/5" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
              )}
              aria-label={tab.ariaLabel}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon 
                  className={cn(
                    "transition-all",
                    isActive ? "w-6 h-6" : "w-5 h-5"
                  )} 
                />
                {hasNotif && (
                  <span 
                    className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"
                    aria-label="New notification"
                  />
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-all",
                isActive ? "opacity-100" : "opacity-70"
              )}>
                {tab.label}
              </span>
              
              {/* Active indicator */}
              {isActive && (
                <div 
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
        
        {/* Settings button */}
        <button
          onClick={onShowSettings}
          className={cn(
            "relative flex flex-col items-center justify-center gap-1 transition-all",
            "min-h-[56px] touch-manipulation",
            "text-muted-foreground hover:text-foreground hover:bg-accent/50",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
          )}
          aria-label="Open settings"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-medium opacity-70">
            Settings
          </span>
        </button>
      </div>
      
      {/* iOS safe area padding */}
      <div className="h-safe-area-inset-bottom bg-card" />
    </nav>
  );
};

export default MobileNavImproved;