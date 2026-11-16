// SuperAdmin Enterprise Theme
export const ADMIN_THEME = {
    colors: {
        primary: '#0f172a',      // Deep navy
        secondary: '#1e293b',    // Slate
        accent: '#3b82f6',       // Indigo blue
        light: '#f8fafc',        // Light gray background
        border: '#e2e8f0',       // Border gray
        success: '#10b981',      // Green
        warning: '#f59e0b',      // Amber
        info: '#06b6d4',         // Cyan
        error: '#ef4444',        // Red
        white: '#ffffff',
        dark: '#1f2937',
    },

    shadows: {
        sm: '0 1px 2px rgba(15, 23, 42, 0.05)',
        md: '0 1px 3px rgba(15, 23, 42, 0.1)',
        lg: '0 4px 12px rgba(15, 23, 42, 0.15)',
        xl: '0 8px 24px rgba(15, 23, 42, 0.2)',
    },

    spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
    },

    borders: {
        radius: {
            sm: '4px',
            md: '6px',
            lg: '8px',
            xl: '12px',
            full: '9999px',
        },
    },

    // Component styling presets
    cards: {
        standard: {
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.1)',
            border: 'none',
            borderRadius: '8px',
        },
        elevated: {
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
            border: 'none',
            borderRadius: '8px',
        },
    },

    buttons: {
        primary: {
            backgroundColor: '#0f172a',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '0.5rem 1rem',
            fontSize: '0.95rem',
            fontWeight: '600',
            transition: 'all 0.2s ease',
        },
        secondary: {
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '0.5rem 1rem',
            fontSize: '0.95rem',
            fontWeight: '600',
            transition: 'all 0.2s ease',
        },
        outline: {
            backgroundColor: 'transparent',
            color: '#0f172a',
            border: `1px solid #e2e8f0`,
            borderRadius: '6px',
            padding: '0.5rem 1rem',
            fontSize: '0.95rem',
            fontWeight: '600',
            transition: 'all 0.2s ease',
        },
    },

    text: {
        heading1: {
            fontSize: 'clamp(1.8rem, 5vw, 2.2rem)',
            fontWeight: 'bold',
            letterSpacing: '-0.02em',
            color: '#0f172a',
        },
        heading2: {
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#0f172a',
        },
        heading3: {
            fontSize: '1.1rem',
            fontWeight: 'bold',
            color: '#0f172a',
        },
        body: {
            fontSize: '0.95rem',
            color: '#1f2937',
            lineHeight: '1.5',
        },
        small: {
            fontSize: '0.85rem',
            color: '#64748b',
        },
        muted: {
            fontSize: '0.9rem',
            color: '#94a3b8',
        },
    },

    // Animation variants
    animations: {
        fadeIn: {
            hidden: { opacity: 0 },
            visible: { opacity: 1 },
        },
        slideUp: {
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
        },
        slideInLeft: {
            hidden: { opacity: 0, x: -20 },
            visible: { opacity: 1, x: 0 },
        },
    },
};

// Stat card color variants
export const STAT_CARD_VARIANTS = {
    users: {
        bg: '#f0f4ff',
        icon: '#3b82f6',
        label: 'Users',
    },
    courses: {
        bg: '#f0fdf4',
        icon: '#10b981',
        label: 'Courses',
    },
    students: {
        bg: '#f0f9ff',
        icon: '#06b6d4',
        label: 'Students',
    },
    plos: {
        bg: '#fffbeb',
        icon: '#f59e0b',
        label: 'PLOs',
    },
    assessments: {
        bg: '#fef2f2',
        icon: '#ef4444',
        label: 'Assessments',
    },
};

export default ADMIN_THEME;
