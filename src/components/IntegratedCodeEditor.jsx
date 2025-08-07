import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Maximize2, Minimize2, Copy, Download } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { sql } from '@codemirror/lang-sql';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';
import { php } from '@codemirror/lang-php';
import { xml } from '@codemirror/lang-xml';
import { oneDark } from '@codemirror/theme-one-dark';
import { githubLight } from '@uiw/codemirror-theme-github';

const IntegratedCodeEditor = ({
  file,
  content,
  onSave,
  onClose,
  readOnly = false,
  isDarkMode = false,
  className = '',
  position = 'right', // 'right', 'bottom', 'split'
}) => {
  const [code, setCode] = useState(content || '');
  const [isModified, setIsModified] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef(null);

  useEffect(() => {
    setCode(content || '');
    setIsModified(false);
  }, [content, file]);

  // Get language extension based on file extension
  const getLanguageExtension = (filename) => {
    if (!filename) return javascript();
    
    const ext = filename.split('.').pop().toLowerCase();
    const languageMap = {
      'js': javascript(),
      'jsx': javascript({ jsx: true }),
      'ts': javascript({ typescript: true }),
      'tsx': javascript({ jsx: true, typescript: true }),
      'py': python(),
      'html': html(),
      'htm': html(),
      'css': css(),
      'scss': css(),
      'sass': css(),
      'less': css(),
      'json': json(),
      'md': markdown(),
      'markdown': markdown(),
      'sql': sql(),
      'cpp': cpp(),
      'c': cpp(),
      'cc': cpp(),
      'h': cpp(),
      'hpp': cpp(),
      'java': java(),
      'rs': rust(),
      'go': go(),
      'php': php(),
      'xml': xml(),
      'svg': xml(),
    };
    
    return languageMap[ext] || javascript();
  };

  const handleSave = async () => {
    if (readOnly || !isModified) return;
    
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(code);
        setIsModified(false);
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file || 'code.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleKeyDown = (e) => {
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
    // Escape to close
    if (e.key === 'Escape' && !isMaximized) {
      onClose?.();
    }
  };

  const getPositionClasses = () => {
    if (isMaximized) {
      return 'fixed inset-0 z-50';
    }
    
    switch (position) {
      case 'right':
        return 'w-1/2 h-full border-l';
      case 'bottom':
        return 'w-full h-1/2 border-t';
      case 'split':
        return 'w-full md:w-1/2 h-full md:border-l';
      default:
        return 'w-1/2 h-full border-l';
    }
  };

  return (
    <div 
      className={cn(
        "bg-background border-border flex flex-col",
        getPositionClasses(),
        className
      )}
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium truncate">
            {file || 'Untitled'}
          </span>
          {isModified && !readOnly && (
            <span className="text-xs text-orange-500">●</span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {/* Copy button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="h-7 w-7"
            title="Copy to clipboard"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          
          {/* Download button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="h-7 w-7"
            title="Download file"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          
          {/* Save button */}
          {!readOnly && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSave}
              disabled={!isModified || isSaving}
              className="h-7 w-7"
              title="Save (Ctrl+S)"
            >
              <Save className={cn(
                "h-3.5 w-3.5",
                isModified && "text-orange-500"
              )} />
            </Button>
          )}
          
          {/* Maximize/Minimize button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMaximized(!isMaximized)}
            className="h-7 w-7"
            title={isMaximized ? "Minimize" : "Maximize"}
          >
            {isMaximized ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
          
          {/* Close button */}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7"
              title="Close (Esc)"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <CodeMirror
          ref={editorRef}
          value={code}
          height="100%"
          theme={isDarkMode ? oneDark : githubLight}
          extensions={[getLanguageExtension(file)]}
          onChange={(value) => {
            setCode(value);
            setIsModified(value !== content);
          }}
          editable={!readOnly}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            highlightSelectionMatches: true,
            searchKeymap: true,
          }}
        />
      </div>
      
      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-border bg-muted/30 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>{code.split('\n').length} lines</span>
          <span>{code.length} chars</span>
          {!readOnly && (
            <span className={cn(
              isModified ? "text-orange-500" : "text-green-500"
            )}>
              {isModified ? "Modified" : "Saved"}
            </span>
          )}
        </div>
        <div>
          {readOnly && <span className="text-yellow-500">Read-only</span>}
        </div>
      </div>
    </div>
  );
};

export default IntegratedCodeEditor;