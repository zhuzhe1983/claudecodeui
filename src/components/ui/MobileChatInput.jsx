import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import { cn } from '../../lib/utils';

const MobileChatInput = ({ 
  onSubmit, 
  placeholder = "Type a message...",
  attachedFiles = [],
  onAttachFiles,
  onRemoveFile,
  disabled = false,
  sendByCtrlEnter = false,
  className = ""
}) => {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    if (value.trim() || attachedFiles.length > 0) {
      onSubmit(value, attachedFiles);
      setValue('');
      // Clear attached files after submit
      if (onRemoveFile) {
        attachedFiles.forEach(file => onRemoveFile(file));
      }
      // Blur on mobile to hide keyboard
      if (window.innerWidth < 768) {
        textareaRef.current?.blur();
      }
    }
  };

  const handleKeyDown = (e) => {
    const shouldSubmit = sendByCtrlEnter 
      ? (e.key === 'Enter' && (e.ctrlKey || e.metaKey))
      : (e.key === 'Enter' && !e.shiftKey);
    
    if (shouldSubmit) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (onAttachFiles) {
      onAttachFiles(files);
    }
    // Reset input
    e.target.value = '';
  };

  return (
    <div className={cn("mobile-chat-input", className)}>
      {/* Attached files preview */}
      {attachedFiles.length > 0 && (
        <div className="flex gap-2 p-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {attachedFiles.map((file, index) => (
            <div 
              key={index}
              className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-sm whitespace-nowrap"
            >
              <Paperclip className="w-3 h-3" />
              <span className="max-w-[100px] truncate">{file.name}</span>
              {onRemoveFile && (
                <button
                  onClick={() => onRemoveFile(file)}
                  className="ml-1 hover:text-red-500"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="relative flex items-end gap-2 p-2 md:p-3">
        {/* File attach button */}
        {onAttachFiles && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Attach files"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Attach files"
            >
              <Paperclip className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "w-full px-3 py-2 md:py-3 bg-gray-50 dark:bg-gray-800 rounded-lg resize-none transition-all",
              "border-2 focus:outline-none",
              isFocused 
                ? "border-blue-500 dark:border-blue-400" 
                : "border-transparent",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "min-h-[44px]" // Ensure minimum touch target
            )}
            style={{ 
              fontSize: '16px', // Prevents zoom on iOS
              maxHeight: '200px',
              overflowY: 'auto'
            }}
            rows={1}
            aria-label="Message input"
          />
          
          {/* Character count for long messages */}
          {value.length > 500 && (
            <div className="absolute bottom-1 right-1 text-xs text-gray-400">
              {value.length}
            </div>
          )}
        </div>

        {/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={disabled || (!value.trim() && attachedFiles.length === 0)}
          className={cn(
            "p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            value.trim() || attachedFiles.length > 0
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-gray-200 dark:bg-gray-700 text-gray-400"
          )}
          aria-label="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* Helper text */}
      <div className="px-3 pb-1 text-xs text-gray-400 dark:text-gray-500">
        {sendByCtrlEnter 
          ? "Press Ctrl+Enter to send" 
          : "Press Enter to send, Shift+Enter for new line"}
      </div>
    </div>
  );
};

export default MobileChatInput;