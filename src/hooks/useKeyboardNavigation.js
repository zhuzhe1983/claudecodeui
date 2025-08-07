import { useEffect, useCallback } from 'react';

/**
 * Global keyboard navigation hook for improved accessibility
 */
export const useKeyboardNavigation = ({
  onEscape,
  onEnter,
  onCtrlEnter,
  onCtrlS,
  onCtrlN,
  onCtrlR,
  onCtrlK,
  onCtrlSlash,
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
  onTab,
  enabled = true
}) => {
  const handleKeyDown = useCallback((e) => {
    if (!enabled) return;

    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    const isAlt = e.altKey;

    // Check if we're in an input field
    const isInInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);

    switch (e.key) {
      case 'Escape':
        if (onEscape) {
          e.preventDefault();
          onEscape();
        }
        break;

      case 'Enter':
        if (isCtrlOrCmd && onCtrlEnter) {
          e.preventDefault();
          onCtrlEnter();
        } else if (!isInInput && onEnter) {
          e.preventDefault();
          onEnter();
        }
        break;

      case 's':
      case 'S':
        if (isCtrlOrCmd && onCtrlS) {
          e.preventDefault();
          onCtrlS();
        }
        break;

      case 'n':
      case 'N':
        if (isCtrlOrCmd && onCtrlN) {
          e.preventDefault();
          onCtrlN();
        }
        break;

      case 'r':
      case 'R':
        if (isCtrlOrCmd && onCtrlR) {
          e.preventDefault();
          onCtrlR();
        }
        break;

      case 'k':
      case 'K':
        if (isCtrlOrCmd && onCtrlK) {
          e.preventDefault();
          onCtrlK();
        }
        break;

      case '/':
        if (isCtrlOrCmd && onCtrlSlash) {
          e.preventDefault();
          onCtrlSlash();
        }
        break;

      case 'ArrowUp':
        if (!isInInput && onArrowUp) {
          e.preventDefault();
          onArrowUp();
        }
        break;

      case 'ArrowDown':
        if (!isInInput && onArrowDown) {
          e.preventDefault();
          onArrowDown();
        }
        break;

      case 'ArrowLeft':
        if (!isInInput && onArrowLeft) {
          e.preventDefault();
          onArrowLeft();
        }
        break;

      case 'ArrowRight':
        if (!isInInput && onArrowRight) {
          e.preventDefault();
          onArrowRight();
        }
        break;

      case 'Tab':
        if (onTab) {
          // Don't prevent default for Tab to maintain focus navigation
          onTab(e);
        }
        break;
    }
  }, [
    enabled,
    onEscape,
    onEnter,
    onCtrlEnter,
    onCtrlS,
    onCtrlN,
    onCtrlR,
    onCtrlK,
    onCtrlSlash,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onTab
  ]);

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enabled]);
};

/**
 * Focus trap hook for modals and dialogs
 */
export const useFocusTrap = (containerRef, isActive = true) => {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus first element when trap becomes active
    firstElement?.focus();

    container.addEventListener('keydown', handleTabKey);
    return () => container.removeEventListener('keydown', handleTabKey);
  }, [containerRef, isActive]);
};

/**
 * Arrow key navigation for lists
 */
export const useListNavigation = (items, onSelect, enabled = true) => {
  const handleKeyDown = useCallback((e) => {
    if (!enabled || items.length === 0) return;

    const currentIndex = items.findIndex(item => item.id === document.activeElement?.dataset.itemId);
    let nextIndex = currentIndex;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        break;

      case 'ArrowDown':
        e.preventDefault();
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (currentIndex >= 0 && onSelect) {
          onSelect(items[currentIndex]);
        }
        break;

      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;

      case 'End':
        e.preventDefault();
        nextIndex = items.length - 1;
        break;

      default:
        return;
    }

    // Focus the next item
    const nextElement = document.querySelector(`[data-item-id="${items[nextIndex]?.id}"]`);
    nextElement?.focus();
  }, [items, onSelect, enabled]);

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enabled]);
};

export default useKeyboardNavigation;