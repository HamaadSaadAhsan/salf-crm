// contexts/PortalContainerContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';

interface PortalContainerContextType {
  container?: HTMLElement | null;
}

const PortalContainerContext = createContext<PortalContainerContextType>({
  container: typeof document !== 'undefined' ? document.body : null,
});

export const usePortalContainer = () => {
  const context = useContext(PortalContainerContext);
  return context.container || (typeof document !== 'undefined' ? document.body : null);
};

interface PortalContainerProviderProps {
  children: ReactNode;
  container?: HTMLElement | null;
}

export const PortalContainerProvider: React.FC<PortalContainerProviderProps> = ({
  children,
  container,
}) => {
  return (
    <PortalContainerContext.Provider value={{ container }}>
      {children}
    </PortalContainerContext.Provider>
  );
};
