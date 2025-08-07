import React from 'react';
import { cn } from '../../lib/utils';

export const LoadingSpinner = ({ 
  size = 'default', 
  text = 'Loading...', 
  className = '',
  showText = true 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    default: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    default: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <div 
        className={cn(
          "border-2 border-blue-600 border-t-transparent rounded-full animate-spin",
          sizeClasses[size]
        )}
        role="status"
        aria-label={text}
      />
      {showText && (
        <span className={cn("text-muted-foreground", textSizeClasses[size])}>
          {text}
        </span>
      )}
      <span className="sr-only">{text}</span>
    </div>
  );
};

export const LoadingSkeleton = ({ lines = 3, className = '' }) => {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
          style={{
            width: `${Math.random() * 40 + 60}%`,
            animationDelay: `${i * 100}ms`
          }}
        />
      ))}
    </div>
  );
};

export const LoadingDots = ({ className = '' }) => {
  return (
    <div className={cn("flex gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
};

export default LoadingSpinner;