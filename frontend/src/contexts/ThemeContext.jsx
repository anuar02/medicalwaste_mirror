// contexts/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// Create the theme context
const ThemeContext = createContext(null);

// Custom hook for using the theme context
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

// Available themes
export const themes = {
    light: 'light',
    dark: 'dark',
    system: 'system',
};

export const ThemeProvider = ({ children }) => {
    // State to store the current theme
    const [theme, setTheme] = useState(
        () => localStorage.getItem('theme') || themes.system
    );

    // State to store the actual theme being applied (light or dark)
    const [activeTheme, setActiveTheme] = useState(themes.light);

    // Set initial theme on mount and handle system preference changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        // Function to update the theme based on the current preference
        const updateTheme = () => {
            if (theme === themes.system) {
                setActiveTheme(mediaQuery.matches ? themes.dark : themes.light);
            } else {
                setActiveTheme(theme);
            }
        };

        // Initial update
        updateTheme();

        // Listen for changes in system preference
        const listener = (e) => {
            if (theme === themes.system) {
                setActiveTheme(e.matches ? themes.dark : themes.light);
            }
        };

        try {
            // Modern browsers
            mediaQuery.addEventListener('change', listener);
        } catch (err) {
            // Safari and older browsers
            mediaQuery.addListener(listener);
        }

        return () => {
            try {
                mediaQuery.removeEventListener('change', listener);
            } catch (err) {
                mediaQuery.removeListener(listener);
            }
        };
    }, [theme]);

    // Apply the theme to the document
    useEffect(() => {
        const root = window.document.documentElement;

        // Remove previous theme
        root.classList.remove(themes.light, themes.dark);

        // Add current theme
        root.classList.add(activeTheme);

        // Store the user's theme preference
        localStorage.setItem('theme', theme);
    }, [theme, activeTheme]);

    // Change theme function
    const changeTheme = (newTheme) => {
        if (Object.values(themes).includes(newTheme)) {
            setTheme(newTheme);
        }
    };

    // Value to be provided by the context
    const contextValue = {
        theme,
        activeTheme,
        changeTheme,
        themes,
    };

    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
        </ThemeContext.Provider>
    );
};

ThemeProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

export default ThemeContext;