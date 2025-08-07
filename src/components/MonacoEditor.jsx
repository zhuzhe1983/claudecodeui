import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { X, Save, Maximize2, Minimize2, Copy, Download, Settings, FileCode } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { t } from '../utils/i18n';

const MonacoEditor = ({
  file,
  content,
  onSave,
  onClose,
  readOnly = false,
  isDarkMode = false,
  className = '',
}) => {
  const [code, setCode] = useState(content || '');
  const [isModified, setIsModified] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState('on');
  const [minimap, setMinimap] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  useEffect(() => {
    setCode(content || '');
    setIsModified(false);
  }, [content, file]);

  // Get language based on file extension
  const getLanguage = (filename) => {
    if (!filename) return 'plaintext';
    
    const ext = filename.split('.').pop().toLowerCase();
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'html': 'html',
      'htm': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'scss',
      'less': 'less',
      'json': 'json',
      'md': 'markdown',
      'markdown': 'markdown',
      'sql': 'sql',
      'mysql': 'mysql',
      'pgsql': 'pgsql',
      'cpp': 'cpp',
      'c': 'c',
      'h': 'cpp',
      'hpp': 'cpp',
      'java': 'java',
      'rs': 'rust',
      'go': 'go',
      'php': 'php',
      'xml': 'xml',
      'svg': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'ini': 'ini',
      'sh': 'shell',
      'bash': 'shell',
      'ps1': 'powershell',
      'bat': 'bat',
      'cmd': 'bat',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'r': 'r',
      'R': 'r',
      'lua': 'lua',
      'pl': 'perl',
      'dockerfile': 'dockerfile',
      'Dockerfile': 'dockerfile',
      'makefile': 'makefile',
      'Makefile': 'makefile',
      'tf': 'hcl',
      'vue': 'vue',
      'dart': 'dart',
      'elm': 'elm',
      'clj': 'clojure',
      'ex': 'elixir',
      'exs': 'elixir',
    };
    
    return languageMap[ext] || 'plaintext';
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Set EOL to LF (Unix) to properly handle line breaks
    const model = editor.getModel();
    if (model) {
      model.setEOL(monaco.editor.EndOfLineSequence.LF);
    }
    
    // Add keyboard shortcuts
    editor.addAction({
      id: 'save-file',
      label: 'Save File',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => handleSave()
    });
    
    editor.addAction({
      id: 'close-editor',
      label: 'Close Editor',
      keybindings: [monaco.KeyCode.Escape],
      run: () => !isMaximized && onClose?.()
    });

    // Focus editor
    editor.focus();
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

  const handleChange = (value) => {
    setCode(value || '');
    setIsModified((value || '') !== (content || ''));
  };

  const editorOptions = {
    readOnly,
    fontSize,
    wordWrap,
    minimap: {
      enabled: minimap
    },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    lineNumbers: 'on',
    rulers: [80, 120],
    renderLineHighlight: 'line',
    scrollbar: {
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
    },
    padding: {
      top: 10,
      bottom: 10,
    },
    suggestOnTriggerCharacters: true,
    quickSuggestions: true,
    formatOnPaste: true,
    formatOnType: true,
    acceptSuggestionOnEnter: 'on',
    tabSize: 2,
    insertSpaces: true,
    folding: true,
    foldingStrategy: 'indentation',
    showFoldingControls: 'always',
    bracketPairColorization: {
      enabled: true
    },
    guides: {
      bracketPairs: true,
      indentation: true
    },
    stickyScroll: {
      enabled: true
    },
    // Line ending and whitespace settings
    renderWhitespace: 'selection',
    renderControlCharacters: true,
    renderIndentGuides: true,
    renderLineHighlightOnlyWhenFocus: false,
    // Ensure Unix line endings
    'files.eol': '\n'
  };

  return (
    <div 
      className={cn(
        "bg-background border-l border-border flex flex-col h-full",
        isMaximized && "fixed inset-0 z-50",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileCode className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium truncate">
            {file || t('untitled')}
          </span>
          {isModified && !readOnly && (
            <span className="text-xs text-orange-500">●</span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {/* Settings button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
            className="h-7 w-7"
            title={t('editorSettings')}
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>
          
          {/* Copy button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="h-7 w-7"
            title={t('copyToClipboard')}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          
          {/* Download button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="h-7 w-7"
            title={t('downloadFile')}
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
              title={t('saveFile')}
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
            title={isMaximized ? t('minimize') : t('maximize')}
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
              title={t('closeEditor')}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Settings Panel */}
      {showSettings && (
        <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t('fontSize')}:</span>
            <button
              onClick={() => setFontSize(Math.max(10, fontSize - 1))}
              className="px-2 py-0.5 rounded bg-background hover:bg-accent"
            >
              -
            </button>
            <span className="w-8 text-center">{fontSize}</span>
            <button
              onClick={() => setFontSize(Math.min(24, fontSize + 1))}
              className="px-2 py-0.5 rounded bg-background hover:bg-accent"
            >
              +
            </button>
          </div>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={wordWrap === 'on'}
              onChange={(e) => setWordWrap(e.target.checked ? 'on' : 'off')}
              className="rounded border-gray-300"
            />
            <span className="text-muted-foreground">{t('wordWrap')}</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={minimap}
              onChange={(e) => setMinimap(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-muted-foreground">{t('minimap')}</span>
          </label>
        </div>
      )}
      
      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={getLanguage(file)}
          value={code}
          onChange={handleChange}
          onMount={handleEditorDidMount}
          theme={isDarkMode ? 'vs-dark' : 'light'}
          options={editorOptions}
          loading={
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">{t('loadingEditor')}</div>
            </div>
          }
        />
      </div>
      
      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-border bg-muted/30 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>{getLanguage(file).toUpperCase()}</span>
          <span>{code.split('\n').length} {t('lines')}</span>
          <span>{code.length} {t('chars')}</span>
          {!readOnly && (
            <span className={cn(
              isModified ? "text-orange-500" : "text-green-500"
            )}>
              {isSaving ? t('saving') : isModified ? t('modified') : t('saved')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {readOnly && <span className="text-yellow-500">{t('readOnly')}</span>}
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  );
};

export default MonacoEditor;