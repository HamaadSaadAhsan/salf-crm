'use client';

import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { SidebarContent } from './sidebar-content';
import { useLayout } from './layout-context';
import { useIsTablet } from '@/hooks/use-mobile';

export function Sidebar() {
  const { sidebarCollapse, sidebarPeeking, setSidebarPeeking, sidebarWidth, setSidebarWidth, isSidebarResizing, setIsSidebarResizing } = useLayout();
  const isTablet = useIsTablet();
  const sidebarRef = useRef<HTMLElement>(null);
  const peekTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const rafRef = useRef<number>(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsSidebarResizing(true);
  }, [setIsSidebarResizing]);

  useEffect(() => {
    if (!isSidebarResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setSidebarWidth(e.clientX);
      });
    };

    const handleMouseUp = () => {
      cancelAnimationFrame(rafRef.current);
      setIsSidebarResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(rafRef.current);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isSidebarResizing, setSidebarWidth, setIsSidebarResizing]);

  const handlePeekEnter = useCallback(() => {
    if (peekTimeoutRef.current) {
      clearTimeout(peekTimeoutRef.current);
      peekTimeoutRef.current = null;
    }
    setSidebarPeeking(true);
  }, [setSidebarPeeking]);

  const handlePeekLeave = useCallback(() => {
    peekTimeoutRef.current = setTimeout(() => {
      setSidebarPeeking(false);
    }, 200);
  }, [setSidebarPeeking]);

  useEffect(() => {
    return () => {
      if (peekTimeoutRef.current) {
        clearTimeout(peekTimeoutRef.current);
      }
    };
  }, []);

  // Collapsed or mobile: floating peek sidebar with inset padding (Attio-style)
  if (sidebarCollapse || isTablet) {
    return (
      <>
        {/* Invisible hover trigger zone on left edge */}
        {!sidebarPeeking && (
          <div
            className="fixed z-[11] top-0 bottom-0 start-0 w-[14px]"
            onMouseEnter={handlePeekEnter}
          />
        )}

        {/* Outer wrapper: fixed, full height, handles transform + inset padding */}
        <div
          className={cn(
            'fixed z-[11] left-0 top-0 bottom-0',
            'pt-2 pl-2 pb-2',
            'transition-transform duration-[140ms] ease-in-out',
            sidebarPeeking ? 'translate-x-0' : '-translate-x-full',
          )}
          style={{ width: `${sidebarWidth}px` }}
          onMouseEnter={handlePeekEnter}
          onMouseLeave={handlePeekLeave}
        >
          {/* Inner card: dark bg, rounded corners, shadow */}
          <aside
            ref={sidebarRef}
            className={cn(
              'flex flex-col h-full bg-sidebar rounded-xl border border-border',
              '[--sidebar-space-x:calc(var(--spacing)*2.5)]',
              'shadow-2xl shadow-black/50',
              'overflow-hidden',
            )}
          >
            <SidebarContent />
          </aside>
        </div>

        {/* Scrim overlay behind peeking sidebar */}
        {sidebarPeeking && (
          <div
            className="fixed inset-0 z-[10] bg-black/20 transition-opacity duration-200"
            onMouseEnter={handlePeekLeave}
            onClick={() => setSidebarPeeking(false)}
          />
        )}
      </>
    );
  }

  // Expanded (pinned) state: normal flex child in layout
  return (
    <div
      className={cn(
        'relative shrink-0 hidden lg:block',
        !isSidebarResizing && 'transition-[width] duration-200 ease-in-out',
      )}
      style={{ width: `${sidebarWidth}px` }}
    >
      <aside
        ref={sidebarRef}
        className={cn(
          'flex flex-col h-full bg-sidebar',
          '[--sidebar-space-x:calc(var(--spacing)*2.5)]',
        )}
      >
        <SidebarContent />
      </aside>

      {/* Resize drag handle */}
      <div
        onMouseDown={handleMouseDown}
        data-dragging={isSidebarResizing || undefined}
        className={cn(
          'absolute top-0 -right-[3px] h-full w-[7px] cursor-col-resize z-[2]',
          'before:absolute before:left-1/2 before:-translate-x-1/2 before:h-full before:w-px before:block',
          'before:transition-[background-color,width] before:duration-[160ms]',
          'hover:before:bg-[rgb(78,140,252)] hover:before:w-[2px]',
          'data-[dragging]:before:bg-[rgb(78,140,252)] data-[dragging]:before:w-[2px]',
        )}
      />
    </div>
  );
}
