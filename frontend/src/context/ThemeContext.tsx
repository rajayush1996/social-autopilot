'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('app_theme') as Theme;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
      if (savedTheme === 'light') {
        document.documentElement.classList.add('light', 'theme-light');
        document.documentElement.classList.remove('dark', 'theme-dark');
      } else {
        document.documentElement.classList.add('dark', 'theme-dark');
        document.documentElement.classList.remove('light', 'theme-light');
      }
    } else {
      document.documentElement.classList.add('dark', 'theme-dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('app_theme', nextTheme);

    if (nextTheme === 'light') {
      document.documentElement.classList.add('light', 'theme-light');
      document.documentElement.classList.remove('dark', 'theme-dark');
    } else {
      document.documentElement.classList.add('dark', 'theme-dark');
      document.documentElement.classList.remove('light', 'theme-light');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={theme === 'light' ? 'theme-light' : 'theme-dark'}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
