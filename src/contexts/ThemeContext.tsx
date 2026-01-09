import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { settingsAPI } from '../api/client';

interface ThemeContextType {
  themeColor: string;
  setThemeColor: (color: string) => void;
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_THEME = '#c53032'; // Default red color

// Helper function to generate hover color (darker shade)
const getHoverColor = (color: string): string => {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Darken by 15%
  const darken = (value: number) => Math.max(0, Math.floor(value * 0.85));
  
  // Convert back to hex
  const toHex = (value: number) => {
    const hex = value.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(darken(r))}${toHex(darken(g))}${toHex(darken(b))}`;
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeColor, setThemeColorState] = useState<string>(DEFAULT_THEME);

  const refreshTheme = async () => {
    try {
      const response = await settingsAPI.get();
      if (response.success && response.data?.workshop?.themeColor) {
        setThemeColorState(response.data.workshop.themeColor);
        // Update CSS variables
        document.documentElement.style.setProperty('--theme-color', response.data.workshop.themeColor);
        document.documentElement.style.setProperty('--theme-hover', getHoverColor(response.data.workshop.themeColor));
      } else {
        setThemeColorState(DEFAULT_THEME);
        document.documentElement.style.setProperty('--theme-color', DEFAULT_THEME);
        document.documentElement.style.setProperty('--theme-hover', getHoverColor(DEFAULT_THEME));
      }
    } catch (error) {
      console.error('Error loading theme:', error);
      setThemeColorState(DEFAULT_THEME);
      document.documentElement.style.setProperty('--theme-color', DEFAULT_THEME);
      document.documentElement.style.setProperty('--theme-hover', getHoverColor(DEFAULT_THEME));
    }
  };

  const setThemeColor = (color: string) => {
    setThemeColorState(color);
    document.documentElement.style.setProperty('--theme-color', color);
    document.documentElement.style.setProperty('--theme-hover', getHoverColor(color));
  };

  // Load theme on mount
  useEffect(() => {
    refreshTheme();
  }, []);

  return (
    <ThemeContext.Provider value={{ themeColor, setThemeColor, refreshTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Export helper function
export { getHoverColor };


