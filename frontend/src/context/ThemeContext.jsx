import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('theme');
    // Default to 'light' unless explicitly saved as 'dark'
    return saved === 'dark' ? 'dark' : 'light';
  });

  const isDarkMode = theme === 'dark';

  const applyThemeClasses = (currentTheme) => {
    const isDark = currentTheme === 'dark';
    const root = document.documentElement;
    const body = document.body;

    if (isDark) {
      root.classList.add('dark', 'dark-theme');
      root.classList.remove('light-theme');
      root.setAttribute('data-theme', 'dark');

      body.classList.add('dark', 'dark-theme', 'dark-mode');
      body.classList.remove('light-theme', 'light-mode');
      body.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark', 'dark-theme');
      root.classList.add('light-theme');
      root.setAttribute('data-theme', 'light');

      body.classList.remove('dark', 'dark-theme', 'dark-mode');
      body.classList.add('light-theme', 'light-mode');
      body.setAttribute('data-theme', 'light');
    }
  };

  useEffect(() => {
    applyThemeClasses(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme) => {
    const normalized = newTheme === 'dark' ? 'dark' : 'light';
    setThemeState(normalized);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback if rendered outside provider
    const isDark = document.body.classList.contains('dark-theme') || localStorage.getItem('theme') === 'dark';
    return {
      theme: isDark ? 'dark' : 'light',
      isDarkMode: isDark,
      toggleTheme: () => {},
      setTheme: () => {}
    };
  }
  return context;
};

export default ThemeContext;
