import { createContext, ReactNode, useContext, useState } from 'react';

interface Settings {
  layout?: string;
  theme?: string;
  [key: string]: any;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>({
    layout: 'demo1',
    theme: 'light',
  });

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    // Return default values if provider is not found
    return {
      settings: {
        layout: 'demo1',
        theme: 'light',
      },
      updateSettings: () => {},
    };
  }
  return context;
}
