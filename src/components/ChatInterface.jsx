/*
 * ChatInterface.jsx - Chat Component with Session Protection Integration
 * 
 * SESSION PROTECTION INTEGRATION:
 * ===============================
 * 
 * This component integrates with the Session Protection System to prevent project updates
 * from interrupting active conversations:
 * 
 * Key Integration Points:
 * 1. handleSubmit() - Marks session as active when user sends message (including temp ID for new sessions)
 * 2. session-created handler - Replaces temporary session ID with real WebSocket session ID  
 * 3. claude-complete handler - Marks session as inactive when conversation finishes
 * 4. session-aborted handler - Marks session as inactive when conversation is aborted
 * 
 * This ensures uninterrupted chat experience by coordinating with App.jsx to pause sidebar updates.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import TodoList from './TodoList';

// Memoized message component to prevent unnecessary re-renders
const MessageComponent = memo(({ message, index, prevMessage, createDiff, onFileOpen }) => {
  const isGrouped = prevMessage && prevMessage.type === message.type && 
                   prevMessage.type === 'assistant' && 
                   !prevMessage.isToolUse && !message.isToolUse;
  
  return (
    <div
      className={`chat-message ${message.type} ${isGrouped ? 'grouped' : ''} ${message.type === 'user' ? 'flex justify-end px-3 sm:px-0' : 'px-3 sm:px-0'}`}
    >
      {message.type === 'user' ? (
        /* User message bubble on the right */
        <div className="flex items-end space-x-0 sm:space-x-3 w-full sm:w-auto sm:max-w-[85%] md:max-w-md lg:max-w-lg xl:max-w-xl">
          <div className="bg-blue-600 text-white rounded-2xl rounded-br-md px-3 sm:px-4 py-2 shadow-sm flex-1 sm:flex-initial">
            <div className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </div>
            <div className="text-xs text-blue-100 mt-1 text-right">
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>
          {!isGrouped && (
            <div className="hidden sm:flex w-8 h-8 bg-blue-600 rounded-full items-center justify-center text-white text-sm flex-shrink-0">
              U
            </div>
          )}
        </div>
      ) : (
        /* Claude/Error messages on the left */
        <div className="w-full">
          {!isGrouped && (
            <div className="flex items-center space-x-3 mb-2">
              {message.type === 'error' ? (
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0">
                  !
                </div>
              ) : (
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0">
                  C
                </div>
              )}
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {message.type === 'error' ? 'Error' : 'Claude'}
              </div>
            </div>
          )}
          
          <div className="w-full">
            
            {message.isToolUse ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 sm:p-3 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span className="font-medium text-blue-900 dark:text-blue-100">
                    Using {message.toolName}
                  </span>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                    {message.toolId}
                  </span>
                </div>
                {message.toolInput && message.toolName === 'Edit' && (() => {
                  try {
                    const input = JSON.parse(message.toolInput);
                    if (input.file_path && input.old_string && input.new_string) {
                      return (
                        <details className="mt-2">
                          <summary className="text-sm text-blue-700 dark:text-blue-300 cursor-pointer hover:text-blue-800 dark:hover:text-blue-200 flex items-center gap-2">
                            <svg className="w-4 h-4 transition-transform details-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            📝 View edit diff for 
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onFileOpen && onFileOpen(input.file_path, {
                                  old_string: input.old_string,
                                  new_string: input.new_string
                                });
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline font-mono"
                            >
                              {input.file_path.split('/').pop()}
                            </button>
                          </summary>
                          <div className="mt-3">
                            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                              <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                <button 
                                  onClick={() => onFileOpen && onFileOpen(input.file_path, {
                                    old_string: input.old_string,
                                    new_string: input.new_string
                                  })}
                                  className="text-xs font-mono text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 truncate underline cursor-pointer"
                                >
                                  {input.file_path}
                                </button>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Diff
                                </span>
                              </div>
                              <div className="text-xs font-mono">
                                {createDiff(input.old_string, input.new_string).map((diffLine, i) => (
                                  <div key={i} className="flex">
                                    <span className={`w-8 text-center border-r ${
                                      diffLine.type === 'removed' 
                                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                                        : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
                                    }`}>
                                      {diffLine.type === 'removed' ? '-' : '+'}
                                    </span>
                                    <span className={`px-2 py-0.5 flex-1 whitespace-pre-wrap ${
                                      diffLine.type === 'removed'
                                        ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                                        : 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                                    }`}>
                                      {diffLine.content}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <details className="mt-2">
                              <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:text-blue-700 dark:hover:text-blue-300">
                                View raw parameters
                              </summary>
                              <pre className="mt-2 text-xs bg-blue-100 dark:bg-blue-800/30 p-2 rounded whitespace-pre-wrap break-words overflow-hidden text-blue-900 dark:text-blue-100">
                                {message.toolInput}
                              </pre>
                            </details>
                          </div>
                        </details>
                      );
                    }
                  } catch (e) {
                    // Fall back to raw display if parsing fails
                  }
                  return (
                    <details className="mt-2">
                      <summary className="text-sm text-blue-700 dark:text-blue-300 cursor-pointer hover:text-blue-800 dark:hover:text-blue-200">
                        View input parameters
                      </summary>
                      <pre className="mt-2 text-xs bg-blue-100 dark:bg-blue-800/30 p-2 rounded whitespace-pre-wrap break-words overflow-hidden text-blue-900 dark:text-blue-100">
                        {message.toolInput}
                      </pre>
                    </details>
                  );
                })()}
                {message.toolInput && message.toolName !== 'Edit' && (() => {
                  // Special handling for TodoWrite tool
                  if (message.toolName === 'TodoWrite') {
                    try {
                      const input = JSON.parse(message.toolInput);
                      if (input.todos && Array.isArray(input.todos)) {
                        return (
                          <details className="mt-2">
                            <summary className="text-sm text-blue-700 dark:text-blue-300 cursor-pointer hover:text-blue-800 dark:hover:text-blue-200 flex items-center gap-2">
                              <svg className="w-4 h-4 transition-transform details-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                              Updating Todo List
                            </summary>
                            <div className="mt-3">
                              <TodoList todos={input.todos} />
                              <details className="mt-3">
                                <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:text-blue-700 dark:hover:text-blue-300">
                                  View raw parameters
                                </summary>
                                <pre className="mt-2 text-xs bg-blue-100 dark:bg-blue-800/30 p-2 rounded overflow-x-auto text-blue-900 dark:text-blue-100">
                                  {message.toolInput}
                                </pre>
                              </details>
                            </div>
                          </details>
                        );
                      }
                    } catch (e) {
                      // Fall back to regular display
                    }
                  }
                  
                  // Regular tool input display for other tools
                  return (
                    <details className="mt-2">
                      <summary className="text-sm text-blue-700 dark:text-blue-300 cursor-pointer hover:text-blue-800 dark:hover:text-blue-200 flex items-center gap-2">
                        <svg className="w-4 h-4 transition-transform details-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        View input parameters
                      </summary>
                      <pre className="mt-2 text-xs bg-blue-100 dark:bg-blue-800/30 p-2 rounded whitespace-pre-wrap break-words overflow-hidden text-blue-900 dark:text-blue-100">
                        {message.toolInput}
                      </pre>
                    </details>
                  );
                })()}
                
                {/* Tool Result Section */}
                {message.toolResult && (
                  <div className="mt-3 border-t border-blue-200 dark:border-blue-700 pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-4 h-4 rounded flex items-center justify-center ${
                        message.toolResult.isError 
                          ? 'bg-red-500' 
                          : 'bg-green-500'
                      }`}>
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {message.toolResult.isError ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          )}
                        </svg>
                      </div>
                      <span className={`text-sm font-medium ${
                        message.toolResult.isError 
                          ? 'text-red-700 dark:text-red-300' 
                          : 'text-green-700 dark:text-green-300'
                      }`}>
                        {message.toolResult.isError ? 'Tool Error' : 'Tool Result'}
                      </span>
                    </div>
                    
                    <div className={`text-sm ${
                      message.toolResult.isError 
                        ? 'text-red-800 dark:text-red-200' 
                        : 'text-green-800 dark:text-green-200'
                    }`}>
                      {(() => {
                        const content = String(message.toolResult.content || '');
                        
                        // Special handling for TodoWrite/TodoRead results
                        if ((message.toolName === 'TodoWrite' || message.toolName === 'TodoRead') &&
                            (content.includes('Todos have been modified successfully') || 
                             content.includes('Todo list') || 
                             (content.startsWith('[') && content.includes('"content"') && content.includes('"status"')))) {
                          try {
                            // Try to parse if it looks like todo JSON data
                            let todos = null;
                            if (content.startsWith('[')) {
                              todos = JSON.parse(content);
                            } else if (content.includes('Todos have been modified successfully')) {
                              // For TodoWrite success messages, we don't have the data in the result
                              return (
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-medium">Todo list has been updated successfully</span>
                                  </div>
                                </div>
                              );
                            }
                            
                            if (todos && Array.isArray(todos)) {
                              return (
                                <div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className="font-medium">Current Todo List</span>
                                  </div>
                                  <TodoList todos={todos} isResult={true} />
                                </div>
                              );
                            }
                          } catch (e) {
                            // Fall through to regular handling
                          }
                        }
                        
                        const fileEditMatch = content.match(/The file (.+?) has been updated\./);
                        if (fileEditMatch) {
                          return (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium">File updated successfully</span>
                              </div>
                              <button 
                                onClick={() => onFileOpen && onFileOpen(fileEditMatch[1])}
                                className="text-xs font-mono bg-green-100 dark:bg-green-800/30 px-2 py-1 rounded text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline cursor-pointer"
                              >
                                {fileEditMatch[1]}
                              </button>
                            </div>
                          );
                        }
                        
                        if (content.includes('cat -n') && content.includes('→')) {
                          return (
                            <details>
                              <summary className="text-sm text-green-700 dark:text-green-300 cursor-pointer hover:text-green-800 dark:hover:text-green-200 mb-2 flex items-center gap-2">
                                <svg className="w-4 h-4 transition-transform details-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                View file content
                              </summary>
                              <div className="mt-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                <div className="text-xs font-mono p-3 whitespace-pre-wrap break-words overflow-hidden">
                                  {content}
                                </div>
                              </div>
                            </details>
                          );
                        }
                        
                        if (content.length > 300) {
                          return (
                            <details>
                              <summary className="text-sm text-green-700 dark:text-green-300 cursor-pointer hover:text-green-800 dark:hover:text-green-200 mb-2 flex items-center gap-2">
                                <svg className="w-4 h-4 transition-transform details-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                View full output ({content.length} chars)
                              </summary>
                              <div className="mt-2 prose prose-sm max-w-none prose-green dark:prose-invert">
                                <ReactMarkdown>{content}</ReactMarkdown>
                              </div>
                            </details>
                          );
                        }
                        
                        return (
                          <div className="prose prose-sm max-w-none prose-green dark:prose-invert">
                            <ReactMarkdown>{content}</ReactMarkdown>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {message.type === 'assistant' ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-gray">
                    <ReactMarkdown
                      components={{
                        code: ({node, inline, className, children, ...props}) => {
                          return inline ? (
                            <code className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-1 py-0.5 rounded text-sm font-mono" {...props}>
                              {children}
                            </code>
                          ) : (
                            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-hidden my-2">
                              <code className="text-gray-800 dark:text-gray-200 text-sm font-mono block whitespace-pre-wrap break-words" {...props}>
                                {children}
                              </code>
                            </div>
                          );
                        },
                        blockquote: ({children}) => (
                          <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400 my-2">
                            {children}
                          </blockquote>
                        ),
                        a: ({href, children}) => (
                          <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                            {children}
                          </a>
                        ),
                        p: ({children}) => (
                          <div className="mb-2 last:mb-0">
                            {children}
                          </div>
                        )
                      }}
                    >
                      {String(message.content || '')}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">
                    {message.content}
                  </div>
                )}
              </div>
            )}
            
            <div className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${isGrouped ? 'opacity-0 group-hover:opacity-100 transition-opacity' : ''}`}>
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// ChatInterface: Main chat component with Session Protection System integration
// 
// Session Protection System prevents automatic project updates from interrupting active conversations:
// - onSessionActive: Called when user sends message to mark session as protected
// - onSessionInactive: Called when conversation completes/aborts to re-enable updates
// - onReplaceTemporarySession: Called to replace temporary session ID with real WebSocket session ID
//
// This ensures uninterrupted chat experience by pausing sidebar refreshes during conversations.
function ChatInterface({ selectedProject, selectedSession, ws, sendMessage, messages, onFileOpen, onInputFocusChange, onSessionActive, onSessionInactive, onReplaceTemporarySession, onNavigateToSession }) {
  const [input, setInput] = useState(() => {
    if (typeof window !== 'undefined' && selectedProject) {
      return localStorage.getItem(`draft_input_${selectedProject.name}`) || '';
    }
    return '';
  });
  const [chatMessages, setChatMessages] = useState(() => {
    if (typeof window !== 'undefined' && selectedProject) {
      const saved = localStorage.getItem(`chat_messages_${selectedProject.name}`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(selectedSession?.id || null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [sessionMessages, setSessionMessages] = useState([]);
  const [isLoadingSessionMessages, setIsLoadingSessionMessages] = useState(false);
  const [isSystemSessionChange, setIsSystemSessionChange] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [debouncedInput, setDebouncedInput] = useState('');
  const [showFileDropdown, setShowFileDropdown] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(-1);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [atSymbolPosition, setAtSymbolPosition] = useState(-1);
  const [canAbortSession, setCanAbortSession] = useState(false);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);

  // Memoized diff calculation to prevent recalculating on every render
  const createDiff = useMemo(() => {
    const cache = new Map();
    return (oldStr, newStr) => {
      const key = `${oldStr.length}-${newStr.length}-${oldStr.slice(0, 50)}`;
      if (cache.has(key)) {
        return cache.get(key);
      }
      
      const result = calculateDiff(oldStr, newStr);
      cache.set(key, result);
      if (cache.size > 100) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      return result;
    };
  }, []);

  // Load session messages from API
  const loadSessionMessages = useCallback(async (projectName, sessionId) => {
    if (!projectName || !sessionId) return [];
    
    setIsLoadingSessionMessages(true);
    try {
      const response = await fetch(`/api/projects/${projectName}/sessions/${sessionId}/messages`);
      if (!response.ok) {
        throw new Error('Failed to load session messages');
      }
      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Error loading session messages:', error);
      return [];
    } finally {
      setIsLoadingSessionMessages(false);
    }
  }, []);

  // Actual diff calculation function
  const calculateDiff = (oldStr, newStr) => {
    const oldLines = oldStr.split('\n');
    const newLines = newStr.split('\n');
    
    // Simple diff algorithm - find common lines and differences
    const diffLines = [];
    let oldIndex = 0;
    let newIndex = 0;
    
    while (oldIndex < oldLines.length || newIndex < newLines.length) {
      const oldLine = oldLines[oldIndex];
      const newLine = newLines[newIndex];
      
      if (oldIndex >= oldLines.length) {
        // Only new lines remaining
        diffLines.push({ type: 'added', content: newLine, lineNum: newIndex + 1 });
        newIndex++;
      } else if (newIndex >= newLines.length) {
        // Only old lines remaining
        diffLines.push({ type: 'removed', content: oldLine, lineNum: oldIndex + 1 });
        oldIndex++;
      } else if (oldLine === newLine) {
        // Lines are the same - skip in diff view (or show as context)
        oldIndex++;
        newIndex++;
      } else {
        // Lines are different
        diffLines.push({ type: 'removed', content: oldLine, lineNum: oldIndex + 1 });
        diffLines.push({ type: 'added', content: newLine, lineNum: newIndex + 1 });
        oldIndex++;
        newIndex++;
      }
    }
    
    return diffLines;
  };

  const convertSessionMessages = (rawMessages) => {
    const converted = [];
    const toolResults = new Map(); // Map tool_use_id to tool result
    
    // First pass: collect all tool results
    for (const msg of rawMessages) {
      if (msg.message?.role === 'user' && Array.isArray(msg.message?.content)) {
        for (const part of msg.message.content) {
          if (part.type === 'tool_result') {
            toolResults.set(part.tool_use_id, {
              content: part.content,
              isError: part.is_error,
              timestamp: new Date(msg.timestamp || Date.now())
            });
          }
        }
      }
    }
    
    // Second pass: process messages and attach tool results to tool uses
    for (const msg of rawMessages) {
      // Handle user messages
      if (msg.message?.role === 'user' && msg.message?.content) {
        let content = '';
        let messageType = 'user';
        
        if (Array.isArray(msg.message.content)) {
          // Handle array content, but skip tool results (they're attached to tool uses)
          const textParts = [];
          
          for (const part of msg.message.content) {
            if (part.type === 'text') {
              textParts.push(part.text);
            }
            // Skip tool_result parts - they're handled in the first pass
          }
          
          content = textParts.join('\n');
        } else if (typeof msg.message.content === 'string') {
          content = msg.message.content;
        } else {
          content = String(msg.message.content);
        }
        
        // Skip command messages and empty content
        if (content && !content.startsWith('<command-name>') && !content.startsWith('[Request interrupted')) {
          converted.push({
            type: messageType,
            content: content,
            timestamp: msg.timestamp || new Date().toISOString()
          });
        }
      }
      
      // Handle assistant messages
      else if (msg.message?.role === 'assistant' && msg.message?.content) {
        if (Array.isArray(msg.message.content)) {
          for (const part of msg.message.content) {
            if (part.type === 'text') {
              converted.push({
                type: 'assistant',
                content: part.text,
                timestamp: msg.timestamp || new Date().toISOString()
              });
            } else if (part.type === 'tool_use') {
              // Get the corresponding tool result
              const toolResult = toolResults.get(part.id);
              
              converted.push({
                type: 'assistant',
                content: '',
                timestamp: msg.timestamp || new Date().toISOString(),
                isToolUse: true,
                toolName: part.name,
                toolInput: JSON.stringify(part.input),
                toolResult: toolResult ? (typeof toolResult.content === 'string' ? toolResult.content : JSON.stringify(toolResult.content)) : null,
                toolError: toolResult?.isError || false,
                toolResultTimestamp: toolResult?.timestamp || new Date()
              });
            }
          }
        } else if (typeof msg.message.content === 'string') {
          converted.push({
            type: 'assistant',
            content: msg.message.content,
            timestamp: msg.timestamp || new Date().toISOString()
          });
        }
      }
    }
    
    return converted;
  };

  // Memoize expensive convertSessionMessages operation
  const convertedMessages = useMemo(() => {
    return convertSessionMessages(sessionMessages);
  }, [sessionMessages]);

  // Define scroll functions early to avoid hoisting issues in useEffect dependencies
  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      setIsUserScrolledUp(false);
    }
  }, []);

  // Check if user is near the bottom of the scroll container
  const isNearBottom = useCallback(() => {
    if (!scrollContainerRef.current) return false;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // Consider "near bottom" if within 100px of the bottom
    return scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  // Handle scroll events to detect when user manually scrolls up
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const wasNearBottom = isNearBottom();
      setIsUserScrolledUp(!wasNearBottom);
    }
  }, [isNearBottom]);

  useEffect(() => {
    // Load session messages when session changes
    const loadMessages = async () => {
      if (selectedSession && selectedProject) {
        setCurrentSessionId(selectedSession.id);
        
        // Only load messages from API if this is a user-initiated session change
        // For system-initiated changes, preserve existing messages and rely on WebSocket
        if (!isSystemSessionChange) {
          const messages = await loadSessionMessages(selectedProject.name, selectedSession.id);
          setSessionMessages(messages);
          // convertedMessages will be automatically updated via useMemo
          // Scroll to bottom after loading session messages
          setTimeout(() => scrollToBottom(), 200);
        } else {
          // Reset the flag after handling system session change
          setIsSystemSessionChange(false);
        }
      } else {
        setChatMessages([]);
        setSessionMessages([]);
        setCurrentSessionId(null);
      }
    };
    
    loadMessages();
  }, [selectedSession, selectedProject, loadSessionMessages, scrollToBottom, isSystemSessionChange]);

  // Update chatMessages when convertedMessages changes
  useEffect(() => {
    if (sessionMessages.length > 0) {
      setChatMessages(convertedMessages);
    }
  }, [convertedMessages, sessionMessages]);

  // Notify parent when input focus changes
  useEffect(() => {
    if (onInputFocusChange) {
      onInputFocusChange(isInputFocused);
    }
  }, [isInputFocused, onInputFocusChange]);

  // Persist input draft to localStorage
  useEffect(() => {
    if (selectedProject && input !== '') {
      localStorage.setItem(`draft_input_${selectedProject.name}`, input);
    } else if (selectedProject && input === '') {
      localStorage.removeItem(`draft_input_${selectedProject.name}`);
    }
  }, [input, selectedProject]);

  // Persist chat messages to localStorage
  useEffect(() => {
    if (selectedProject && chatMessages.length > 0) {
      localStorage.setItem(`chat_messages_${selectedProject.name}`, JSON.stringify(chatMessages));
    }
  }, [chatMessages, selectedProject]);

  // Load saved state when project changes (but don't interfere with session loading)
  useEffect(() => {
    if (selectedProject) {
      // Always load saved input draft for the project
      const savedInput = localStorage.getItem(`draft_input_${selectedProject.name}`) || '';
      if (savedInput !== input) {
        setInput(savedInput);
      }
    }
  }, [selectedProject?.name]);


  useEffect(() => {
    // Handle WebSocket messages
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      
      switch (latestMessage.type) {
        case 'session-created':
          // New session created by Claude CLI - we receive the real session ID here
          // Store it temporarily until conversation completes (prevents premature session association)
          if (latestMessage.sessionId && !currentSessionId) {
            sessionStorage.setItem('pendingSessionId', latestMessage.sessionId);
            
            // Session Protection: Replace temporary "new-session-*" identifier with real session ID
            // This maintains protection continuity - no gap between temp ID and real ID
            // The temporary session is removed and real session is marked as active
            if (onReplaceTemporarySession) {
              onReplaceTemporarySession(latestMessage.sessionId);
            }
          }
          break;
          
        case 'claude-response':
          const messageData = latestMessage.data.message || latestMessage.data;
          
          // Handle Claude CLI session duplication bug workaround:
          // When resuming a session, Claude CLI creates a new session instead of resuming.
          // We detect this by checking for system/init messages with session_id that differs
          // from our current session. When found, we need to switch the user to the new session.
          if (latestMessage.data.type === 'system' && 
              latestMessage.data.subtype === 'init' && 
              latestMessage.data.session_id && 
              currentSessionId && 
              latestMessage.data.session_id !== currentSessionId) {
            
            console.log('🔄 Claude CLI session duplication detected:', {
              originalSession: currentSessionId,
              newSession: latestMessage.data.session_id
            });
            
            // Mark this as a system-initiated session change to preserve messages
            setIsSystemSessionChange(true);
            
            // Switch to the new session using React Router navigation
            // This triggers the session loading logic in App.jsx without a page reload
            if (onNavigateToSession) {
              onNavigateToSession(latestMessage.data.session_id);
            }
            return; // Don't process the message further, let the navigation handle it
          }
          
          // Handle system/init for new sessions (when currentSessionId is null)
          if (latestMessage.data.type === 'system' && 
              latestMessage.data.subtype === 'init' && 
              latestMessage.data.session_id && 
              !currentSessionId) {
            
            console.log('🔄 New session init detected:', {
              newSession: latestMessage.data.session_id
            });
            
            // Mark this as a system-initiated session change to preserve messages
            setIsSystemSessionChange(true);
            
            // Switch to the new session
            if (onNavigateToSession) {
              onNavigateToSession(latestMessage.data.session_id);
            }
            return; // Don't process the message further, let the navigation handle it
          }
          
          // For system/init messages that match current session, just ignore them
          if (latestMessage.data.type === 'system' && 
              latestMessage.data.subtype === 'init' && 
              latestMessage.data.session_id && 
              currentSessionId && 
              latestMessage.data.session_id === currentSessionId) {
            console.log('🔄 System init message for current session, ignoring');
            return; // Don't process the message further
          }
          
          // Handle different types of content in the response
          if (Array.isArray(messageData.content)) {
            for (const part of messageData.content) {
              if (part.type === 'tool_use') {
                // Add tool use message
                const toolInput = part.input ? JSON.stringify(part.input, null, 2) : '';
                setChatMessages(prev => [...prev, {
                  type: 'assistant',
                  content: '',
                  timestamp: new Date(),
                  isToolUse: true,
                  toolName: part.name,
                  toolInput: toolInput,
                  toolId: part.id,
                  toolResult: null // Will be updated when result comes in
                }]);
              } else if (part.type === 'text' && part.text?.trim()) {
                // Add regular text message
                setChatMessages(prev => [...prev, {
                  type: 'assistant',
                  content: part.text,
                  timestamp: new Date()
                }]);
              }
            }
          } else if (typeof messageData.content === 'string' && messageData.content.trim()) {
            // Add regular text message
            setChatMessages(prev => [...prev, {
              type: 'assistant',
              content: messageData.content,
              timestamp: new Date()
            }]);
          }
          
          // Handle tool results from user messages (these come separately)
          if (messageData.role === 'user' && Array.isArray(messageData.content)) {
            for (const part of messageData.content) {
              if (part.type === 'tool_result') {
                // Find the corresponding tool use and update it with the result
                setChatMessages(prev => prev.map(msg => {
                  if (msg.isToolUse && msg.toolId === part.tool_use_id) {
                    return {
                      ...msg,
                      toolResult: {
                        content: part.content,
                        isError: part.is_error,
                        timestamp: new Date()
                      }
                    };
                  }
                  return msg;
                }));
              }
            }
          }
          break;
          
        case 'claude-output':
          setChatMessages(prev => [...prev, {
            type: 'assistant',
            content: latestMessage.data,
            timestamp: new Date()
          }]);
          break;
          
        case 'claude-error':
          setChatMessages(prev => [...prev, {
            type: 'error',
            content: `Error: ${latestMessage.error}`,
            timestamp: new Date()
          }]);
          break;
          
        case 'claude-complete':
          setIsLoading(false);
          setCanAbortSession(false);
          
          // Session Protection: Mark session as inactive to re-enable automatic project updates
          // Conversation is complete, safe to allow project updates again
          // Use real session ID if available, otherwise use pending session ID
          const activeSessionId = currentSessionId || sessionStorage.getItem('pendingSessionId');
          if (activeSessionId && onSessionInactive) {
            onSessionInactive(activeSessionId);
          }
          
          // If we have a pending session ID and the conversation completed successfully, use it
          const pendingSessionId = sessionStorage.getItem('pendingSessionId');
          if (pendingSessionId && !currentSessionId && latestMessage.exitCode === 0) {
                setCurrentSessionId(pendingSessionId);
            sessionStorage.removeItem('pendingSessionId');
          }
          break;
          
        case 'session-aborted':
          setIsLoading(false);
          setCanAbortSession(false);
          
          // Session Protection: Mark session as inactive when aborted
          // User or system aborted the conversation, re-enable project updates
          if (currentSessionId && onSessionInactive) {
            onSessionInactive(currentSessionId);
          }
          
          setChatMessages(prev => [...prev, {
            type: 'error',
            content: latestMessage.success ? 
              'Session aborted successfully' : 
              'Failed to abort session - it may have already completed',
            timestamp: new Date()
          }]);
          break;
      }
    }
  }, [messages]);

  // Load file list when project changes
  useEffect(() => {
    if (selectedProject) {
      fetchProjectFiles();
    }
  }, [selectedProject]);

  const fetchProjectFiles = async () => {
    try {
      const response = await fetch(`/api/projects/${selectedProject.name}/files`);
      if (response.ok) {
        const files = await response.json();
        // Flatten the file tree to get all file paths
        const flatFiles = flattenFileTree(files);
        setFileList(flatFiles);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const flattenFileTree = (files, basePath = '') => {
    let result = [];
    for (const file of files) {
      const fullPath = basePath ? `${basePath}/${file.name}` : file.name;
      if (file.type === 'directory' && file.children) {
        result = result.concat(flattenFileTree(file.children, fullPath));
      } else if (file.type === 'file') {
        result.push({
          name: file.name,
          path: fullPath,
          relativePath: file.path
        });
      }
    }
    return result;
  };

  // Handle @ symbol detection and file filtering
  useEffect(() => {
    const textBeforeCursor = input.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Check if there's a space after the @ symbol (which would end the file reference)
      if (!textAfterAt.includes(' ')) {
        setAtSymbolPosition(lastAtIndex);
        setShowFileDropdown(true);
        
        // Filter files based on the text after @
        const filtered = fileList.filter(file => 
          file.name.toLowerCase().includes(textAfterAt.toLowerCase()) ||
          file.path.toLowerCase().includes(textAfterAt.toLowerCase())
        ).slice(0, 10); // Limit to 10 results
        
        setFilteredFiles(filtered);
        setSelectedFileIndex(-1);
      } else {
        setShowFileDropdown(false);
        setAtSymbolPosition(-1);
      }
    } else {
      setShowFileDropdown(false);
      setAtSymbolPosition(-1);
    }
  }, [input, cursorPosition, fileList]);

  // Debounced input handling
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInput(input);
    }, 150); // 150ms debounce
    
    return () => clearTimeout(timer);
  }, [input]);

  // Show only recent messages for better performance (last 100 messages)
  const visibleMessages = useMemo(() => {
    const maxMessages = 100;
    if (chatMessages.length <= maxMessages) {
      return chatMessages;
    }
    return chatMessages.slice(-maxMessages);
  }, [chatMessages]);

  useEffect(() => {
    // Only auto-scroll to bottom when new messages arrive if user hasn't scrolled up
    if (scrollContainerRef.current && chatMessages.length > 0) {
      if (!isUserScrolledUp) {
        setTimeout(() => scrollToBottom(), 0);
      }
    }
  }, [chatMessages.length, isUserScrolledUp, scrollToBottom]);

  // Scroll to bottom when component mounts with existing messages
  useEffect(() => {
    if (scrollContainerRef.current && chatMessages.length > 0) {
      setTimeout(() => scrollToBottom(), 100); // Small delay to ensure rendering
    }
  }, [scrollToBottom]);

  // Add scroll event listener to detect user scrolling
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Initial textarea setup
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, []); // Only run once on mount


  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !selectedProject) return;

    const userMessage = {
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setCanAbortSession(true);
    
    // Always scroll to bottom when user sends a message (they're actively participating)
    setTimeout(() => scrollToBottom(), 0);

    // Session Protection: Mark session as active to prevent automatic project updates during conversation
    // This is crucial for maintaining chat state integrity. We handle two cases:
    // 1. Existing sessions: Use the real currentSessionId
    // 2. New sessions: Generate temporary identifier "new-session-{timestamp}" since real ID comes via WebSocket later
    // This ensures no gap in protection between message send and session creation
    const sessionToActivate = currentSessionId || `new-session-${Date.now()}`;
    if (onSessionActive) {
      onSessionActive(sessionToActivate);
    }

    // Get tools settings from localStorage
    const getToolsSettings = () => {
      try {
        const savedSettings = localStorage.getItem('claude-tools-settings');
        if (savedSettings) {
          return JSON.parse(savedSettings);
        }
      } catch (error) {
        console.error('Error loading tools settings:', error);
      }
      return {
        allowedTools: [],
        disallowedTools: [],
        skipPermissions: false
      };
    };

    const toolsSettings = getToolsSettings();

    // Send command to Claude CLI via WebSocket
    sendMessage({
      type: 'claude-command',
      command: input,
      options: {
        projectPath: selectedProject.path,
        cwd: selectedProject.fullPath,
        sessionId: currentSessionId,
        resume: !!currentSessionId,
        toolsSettings: toolsSettings
      }
    });

    setInput('');
    // Clear the saved draft since message was sent
    if (selectedProject) {
      localStorage.removeItem(`draft_input_${selectedProject.name}`);
    }
  };

  const handleKeyDown = (e) => {
    // Handle file dropdown navigation
    if (showFileDropdown && filteredFiles.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedFileIndex(prev => 
          prev < filteredFiles.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedFileIndex(prev => 
          prev > 0 ? prev - 1 : filteredFiles.length - 1
        );
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        if (selectedFileIndex >= 0) {
          selectFile(filteredFiles[selectedFileIndex]);
        } else if (filteredFiles.length > 0) {
          selectFile(filteredFiles[0]);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowFileDropdown(false);
        return;
      }
    }
    
    // Handle Enter key: Ctrl+Enter (Cmd+Enter on Mac) sends, Shift+Enter creates new line
    if (e.key === 'Enter') {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        // Ctrl+Enter or Cmd+Enter: Send message
        e.preventDefault();
        handleSubmit(e);
      } else if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        // Plain Enter: Also send message (keeping original behavior)
        e.preventDefault();
        handleSubmit(e);
      }
      // Shift+Enter: Allow default behavior (new line)
    }
  };

  const selectFile = (file) => {
    const textBeforeAt = input.slice(0, atSymbolPosition);
    const textAfterAtQuery = input.slice(atSymbolPosition);
    const spaceIndex = textAfterAtQuery.indexOf(' ');
    const textAfterQuery = spaceIndex !== -1 ? textAfterAtQuery.slice(spaceIndex) : '';
    
    const newInput = textBeforeAt + '@' + file.path + textAfterQuery;
    setInput(newInput);
    setShowFileDropdown(false);
    setAtSymbolPosition(-1);
    
    // Focus back to textarea and set cursor position
    if (textareaRef.current) {
      textareaRef.current.focus();
      const newCursorPos = textBeforeAt.length + 1 + file.path.length;
      setTimeout(() => {
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        setCursorPosition(newCursorPos);
      }, 0);
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    setCursorPosition(e.target.selectionStart);
  };

  const handleTextareaClick = (e) => {
    setCursorPosition(e.target.selectionStart);
  };



  const handleNewSession = () => {
    setChatMessages([]);
    setInput('');
    setIsLoading(false);
    setCanAbortSession(false);
  };
  
  // Abort functionality is not yet implemented at the backend

  // Don't render if no project is selected
  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p>Select a project to start chatting with Claude</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          details[open] .details-chevron {
            transform: rotate(180deg);
          }
        `}
      </style>
      <div className="h-full flex flex-col">
        {/* Messages Area - Scrollable Middle Section */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-0 py-3 sm:p-4 space-y-3 sm:space-y-4 relative"
      >
        {isLoadingSessionMessages && chatMessages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
              <p>Loading session messages...</p>
            </div>
          </div>
        ) : chatMessages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <p>Start a conversation with Claude</p>
            <p className="text-sm mt-2">
              Ask questions about your code, request changes, or get help with development tasks
            </p>
          </div>
        ) : (
          <>
            {chatMessages.length > 100 && (
              <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-2 border-b border-gray-200 dark:border-gray-700">
                Showing last 100 messages ({chatMessages.length} total) • 
                <button className="ml-1 text-blue-600 hover:text-blue-700 underline">
                  Load earlier messages
                </button>
              </div>
            )}
            
            {visibleMessages.map((message, index) => {
              const prevMessage = index > 0 ? visibleMessages[index - 1] : null;
              
              return (
                <MessageComponent
                  key={index}
                  message={message}
                  index={index}
                  prevMessage={prevMessage}
                  createDiff={createDiff}
                  onFileOpen={onFileOpen}
                />
              );
            })}
          </>
        )}
        
        {isLoading && (
          <div className="chat-message assistant">
            <div className="w-full">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0">
                  C
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">Claude</div>
                {/* Abort button removed - functionality not yet implemented at backend */}
              </div>
              <div className="w-full text-sm text-gray-500 dark:text-gray-400 pl-3 sm:pl-0">
                <div className="flex items-center space-x-1">
                  <div className="animate-pulse">●</div>
                  <div className="animate-pulse" style={{ animationDelay: '0.2s' }}>●</div>
                  <div className="animate-pulse" style={{ animationDelay: '0.4s' }}>●</div>
                  <span className="ml-2">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
        
        {/* Floating scroll to bottom button */}
        {isUserScrolledUp && chatMessages.length > 0 && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 z-10"
            title="Scroll to bottom"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        )}
      </div>

      {/* Input Area - Fixed Bottom */}
      <div className={`p-2 sm:p-4 md:p-6 flex-shrink-0 ${
        isInputFocused ? 'pb-2 sm:pb-4 md:pb-6' : 'pb-16 sm:pb-4 md:pb-6'
      }`}>
        <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-600 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onClick={handleTextareaClick}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              onInput={(e) => {
                // Immediate resize on input for better UX
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
                setCursorPosition(e.target.selectionStart);
              }}
              placeholder="Ask Claude to help with your code... (@ to reference files)"
              disabled={isLoading}
              rows={1}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 pr-12 sm:pr-16 bg-transparent rounded-2xl focus:outline-none dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 resize-none min-h-[40px] sm:min-h-[56px] max-h-32 overflow-y-auto text-sm sm:text-base"
              style={{ height: 'auto' }}
            />
            {/* Send button */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSubmit(e);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                handleSubmit(e);
              }}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 w-12 h-12 sm:w-12 sm:h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg 
                className="w-4 h-4 sm:w-5 sm:h-5 text-white transform rotate-90" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
                />
              </svg>
            </button>
            
            {/* File dropdown */}
            {showFileDropdown && filteredFiles.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                {filteredFiles.map((file, index) => (
                  <div
                    key={file.path}
                    className={`px-4 py-2 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                      index === selectedFileIndex
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                    onClick={() => selectFile(file)}
                  >
                    <div className="font-medium text-sm">{file.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {file.path}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Hint text */}
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2 hidden sm:block">
            Press Enter to send • Shift+Enter for new line • @ to reference files
          </div>
          <div className={`text-xs text-gray-500 dark:text-gray-400 text-center mt-2 sm:hidden transition-opacity duration-200 ${
            isInputFocused ? 'opacity-100' : 'opacity-0'
          }`}>
            Enter to send • @ for files
          </div>
        </form>
      </div>
    </div>
    </>
  );
}

export default React.memo(ChatInterface);