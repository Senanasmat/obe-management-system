// Faculty Module Professional Theme
export const FACULTY_THEME = {
    colors: {
        primary: '#1e40af',      // Deep blue
        secondary: '#3b82f6',    // Medium blue
        accent: '#06b6d4',       // Cyan
        success: '#10b981',      // Green
        warning: '#f59e0b',      // Amber
        info: '#0ea5e9',         // Sky blue
        error: '#ef4444',        // Red
        light: '#f0f9ff',        // Light blue background
        border: '#cbd5e1',       // Border gray
        dark: '#1e293b',         // Dark slate
        white: '#ffffff',
        muted: '#64748b',
    },

    shadows: {
        sm: '0 1px 2px rgba(30, 64, 175, 0.05)',
        md: '0 1px 3px rgba(30, 64, 175, 0.1)',
        lg: '0 4px 12px rgba(30, 64, 175, 0.15)',
        xl: '0 8px 24px rgba(30, 64, 175, 0.2)',
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

    cards: {
        standard: {
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px rgba(30, 64, 175, 0.1)',
            border: 'none',
            borderRadius: '8px',
        },
        elevated: {
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 12px rgba(30, 64, 175, 0.15)',
            border: 'none',
            borderRadius: '8px',
        },
    },

    buttons: {
        primary: {
            backgroundColor: '#1e40af',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '0.5rem 1rem',
            fontSize: '0.95rem',
            fontWeight: '600',
            transition: 'all 0.2s ease',
        },
        secondary: {
            backgroundColor: '#06b6d4',
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
            color: '#1e40af',
            border: `1px solid #cbd5e1`,
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
            color: '#1e40af',
        },
        heading2: {
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#1e40af',
        },
        heading3: {
            fontSize: '1.1rem',
            fontWeight: 'bold',
            color: '#1e40af',
        },
        body: {
            fontSize: '0.95rem',
            color: '#1e293b',
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

// Faculty Dashboard Stat Card Colors
export const FACULTY_STAT_VARIANTS = {
    courses: {
        bg: '#dbeafe',
        icon: '#1e40af',
        label: 'Courses',
    },
    students: {
        bg: '#cffafe',
        icon: '#06b6d4',
        label: 'Students',
    },
    assessments: {
        bg: '#dcfce7',
        icon: '#10b981',
        label: 'Assessments',
    },
    clos: {
        bg: '#fef3c7',
        icon: '#f59e0b',
        label: 'CLOs',
    },
    plos: {
        bg: '#fce7f3',
        icon: '#ec4899',
        label: 'PLOs',
    },
};

// Header Configuration for Faculty Pages
export const FACULTY_HEADER = {
    backgroundColor: '#1e40af',
    color: 'white',
    padding: '2rem 0',
    borderBottom: 'none',
};

export default FACULTY_THEME;
