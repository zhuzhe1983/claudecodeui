import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Eye, 
  EyeOff,
  Zap,
  Layout,
  Terminal,
  Code2,
  Settings2,
  Moon,
  Sun
} from 'lucide-react';
import DarkModeToggle from './DarkModeToggle';
import { useTheme } from '../contexts/ThemeContext';

const QuickSettingsPanel = ({ 
  isOpen, 
  onToggle,
  autoExpandTools,
  onAutoExpandChange,
  showRawParameters,
  onShowRawParametersChange,
  isMobile
}) => {
  const [localIsOpen, setLocalIsOpen] = useState(isOpen);
  const { isDarkMode } = useTheme();

  useEffect(() => {
    setLocalIsOpen(isOpen);
  }, [isOpen]);

  const handleToggle = () => {
    const newState = !localIsOpen;
    setLocalIsOpen(newState);
    onToggle(newState);
  };

  return (
    <>
      {/* Pull Tab */}
      <div
        className={`fixed ${isMobile ? 'bottom-44' : 'top-1/2 -translate-y-1/2'} ${
          localIsOpen ? 'right-64' : 'right-0'
        } z-40 transition-all duration-300 ease-in-out`}
      >
        <button
          onClick={handleToggle}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-l-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-lg"
          aria-label={localIsOpen ? 'Close settings panel' : 'Open settings panel'}
        >
          {localIsOpen ? (
            <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          )}
        </button>
      </div>

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl transform transition-transform duration-300 ease-in-out z-30 ${
          localIsOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              Quick Settings
            </h3>
          </div>

          {/* Settings Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-white dark:bg-gray-800">
            {/* Appearance Settings */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Appearance</h4>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-transparent hover:border-gray-300 dark:hover:border-gray-600">
                <span className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                  {isDarkMode ? <Moon className="h-4 w-4 text-gray-600 dark:text-gray-400" /> : <Sun className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                  Dark Mode
                </span>
                <DarkModeToggle />
              </div>
            </div>

            {/* Tool Display Settings */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Tool Display</h4>
              
              <label className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors border border-transparent hover:border-gray-300 dark:hover:border-gray-600">
                <span className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                  <Maximize2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  Auto-expand tools
                </span>
                <input
                  type="checkbox"
                  checked={autoExpandTools}
                  onChange={(e) => onAutoExpandChange(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 accent-blue-600"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors border border-transparent hover:border-gray-300 dark:hover:border-gray-600">
                <span className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                  <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  Show raw parameters
                </span>
                <input
                  type="checkbox"
                  checked={showRawParameters}
                  onChange={(e) => onShowRawParametersChange(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 accent-blue-600"
                />
              </label>

              <button disabled className="w-full flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-left text-gray-500 dark:text-gray-400 transition-colors opacity-60 cursor-not-allowed">
                <Code2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                Syntax highlighting
              </button>
            </div>

            {/* Performance Settings */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Performance</h4>
              
              <button disabled className="w-full flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-left text-gray-500 dark:text-gray-400 transition-colors opacity-60 cursor-not-allowed">
                <Zap className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                Stream optimizations
              </button>

              <button disabled className="w-full flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-left text-gray-500 dark:text-gray-400 transition-colors opacity-60 cursor-not-allowed">
                <Layout className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                Compact mode
              </button>
            </div>

            {/* View Options */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">View Options</h4>
              
              <button disabled className="w-full flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-left text-gray-500 dark:text-gray-400 transition-colors opacity-60 cursor-not-allowed">
                <Terminal className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                Terminal theme
              </button>

              <button disabled className="w-full flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-left text-gray-500 dark:text-gray-400 transition-colors opacity-60 cursor-not-allowed">
                <EyeOff className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                Hide timestamps
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <button disabled className="w-full py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-md transition-colors text-sm cursor-not-allowed opacity-60">
              Advanced Settings
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop for mobile */}
      {isMobile && localIsOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20"
          onClick={handleToggle}
        />
      )}
    </>
  );
};

export default QuickSettingsPanel;