import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { NavConfig } from '@/crm/config/types';

const SIDEBAR_WIDTH_KEY = 'sidebar-width';
const DEFAULT_SIDEBAR_WIDTH = 250;
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 350;

function getInitialSidebarWidth(): number {
  try {
    const stored = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (stored) {
      const parsed = Number(stored);
      if (!isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) {
        return parsed;
      }
    }
  } catch {
    // localStorage may be unavailable
  }
  return DEFAULT_SIDEBAR_WIDTH;
}

// Define the shape of the layout state
interface LayoutState {
  sidebarCollapse: boolean;
  setSidebarCollapse: (open: boolean) => void;
  sidebarPeeking: boolean;
  setSidebarPeeking: (peeking: boolean) => void;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  isSidebarResizing: boolean;
  setIsSidebarResizing: (resizing: boolean) => void;
  sidebarPinnedNavItems: string[];
  pinSidebarNavItem: (id: string) => void;
  unpinSidebarNavItem: (id: string) => void;
  isSidebarNavItemPinned: (id: string) => boolean;
  getSidebarNavItems: () => NavConfig;
}

// Create the context
const LayoutContext = createContext<LayoutState | undefined>(undefined);

// Provider component
interface LayoutProviderProps {
  children: ReactNode;
  sidebarNavItems: NavConfig;
}

export function LayoutProvider({
  children,
  sidebarNavItems,
}: LayoutProviderProps) {
  const [sidebarCollapse, setSidebarCollapse] = useState(false);
  const [sidebarPeeking, setSidebarPeeking] = useState(false);
  const [sidebarWidth, setSidebarWidthState] = useState(getInitialSidebarWidth);
  const [isSidebarResizing, setIsSidebarResizing] = useState(false);

  const setSidebarWidth = useCallback((width: number) => {
    const clamped = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, width));
    setSidebarWidthState(clamped);
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(clamped));
    } catch {
      // localStorage may be unavailable
    }
  }, []);
  const initialPinned = sidebarNavItems
    .filter((item) => item.pinned)
    .map((item) => item.id);
  const [sidebarPinnedNavItems, setSidebarPinnedNavItems] =
    useState<string[]>(initialPinned);

  const pinSidebarNavItem = (id: string) => {
    setSidebarPinnedNavItems((prev) =>
      prev.includes(id) ? prev : [...prev, id],
    );
  };
  const unpinSidebarNavItem = (id: string) => {
    setSidebarPinnedNavItems((prev) => prev.filter((itemId) => itemId !== id));
  };
  const isSidebarNavItemPinned = (id: string) => {
    return sidebarPinnedNavItems.includes(id);
  };

  // Memoize the processed navigation items to prevent duplicate object creation
  const processedNavItems = useMemo(() => {
    return sidebarNavItems.map((item) => {
      if (item.pinnable) {
        return {
          ...item,
          pinned: sidebarPinnedNavItems.includes(item.id),
        };
      }
      return item;
    });
  }, [sidebarNavItems, sidebarPinnedNavItems]);

  const getSidebarNavItems = () => {
    return processedNavItems;
  };

  return (
    <LayoutContext.Provider
      value={{
        sidebarCollapse,
        setSidebarCollapse,
        sidebarPeeking,
        setSidebarPeeking,
        sidebarWidth,
        setSidebarWidth,
        isSidebarResizing,
        setIsSidebarResizing,
        sidebarPinnedNavItems,
        getSidebarNavItems,
        pinSidebarNavItem,
        unpinSidebarNavItem,
        isSidebarNavItemPinned,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

// Custom hook for consuming the context
export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};
