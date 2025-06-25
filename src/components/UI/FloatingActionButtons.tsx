import { FC } from 'react';

export interface FloatingActionButton {
    icon: string;
    title: string;
    onClick: () => void;
    bgColor?: string;
    hoverColor?: string;
    disabled?: boolean;
}

interface FloatingActionButtonsProps {
    buttons: FloatingActionButton[];
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    className?: string;
}

export const FloatingActionButtons: FC<FloatingActionButtonsProps> = ({
    buttons,
    position = 'bottom-right',
    className = ''
}) => {
    const getPositionClasses = () => {
        switch (position) {
            case 'bottom-left':
                return 'bottom-6 left-6';
            case 'top-right':
                return 'top-6 right-6';
            case 'top-left':
                return 'top-6 left-6';
            case 'bottom-right':
            default:
                return 'bottom-6 right-6';
        }
    };

    return (
        <div className={`fixed ${getPositionClasses()} ${className}`}>
            <div className="flex flex-col space-y-2">
                {buttons.map((button, index) => (
                    <FABButton
                        key={index}
                        {...button}
                    />
                ))}
            </div>
        </div>
    );
};

const FABButton: FC<FloatingActionButton> = ({
    icon,
    title,
    onClick,
    bgColor = 'bg-blue-500',
    hoverColor = 'hover:bg-blue-600',
    disabled = false
}) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                ${bgColor}
                ${hoverColor}
                text-white 
                p-3 
                rounded-full 
                shadow-lg 
                transition-colors
                disabled:opacity-50 
                disabled:cursor-not-allowed
                ${disabled ? '' : 'hover:shadow-xl transform hover:scale-105'}
            `}
            title={title}
        >
            <span className="text-xl">{icon}</span>
        </button>
    );
};

// Predefined common button configurations
export const CommonFABs = {
    settings: (): FloatingActionButton => ({
        icon: '⚙️',
        title: 'Settings',
        onClick: () => window.location.href = '/settings',
        bgColor: 'bg-gray-500',
        hoverColor: 'hover:bg-gray-600'
    }),

    dashboard: (): FloatingActionButton => ({
        icon: '🏠',
        title: 'Back to Dashboard',
        onClick: () => window.location.href = '/display',
        bgColor: 'bg-blue-500',
        hoverColor: 'hover:bg-blue-600'
    }),

    budget: (): FloatingActionButton => ({
        icon: '📊',
        title: 'Budget',
        onClick: () => window.location.href = '/budget',
        bgColor: 'bg-green-500',
        hoverColor: 'hover:bg-green-600'
    }),

    cards: (): FloatingActionButton => ({
        icon: '💳',
        title: 'Cards',
        onClick: () => {}, // Placeholder - implement as needed
        bgColor: 'bg-blue-500',
        hoverColor: 'hover:bg-blue-600'
    }),

    add: (onClick: () => void): FloatingActionButton => ({
        icon: '➕',
        title: 'Add',
        onClick,
        bgColor: 'bg-green-500',
        hoverColor: 'hover:bg-green-600'
    }),

    refresh: (onClick: () => void): FloatingActionButton => ({
        icon: '🔄',
        title: 'Refresh',
        onClick,
        bgColor: 'bg-purple-500',
        hoverColor: 'hover:bg-purple-600'
    }),

    sync: (onClick: () => void): FloatingActionButton => ({
        icon: '🔄',
        title: 'Sync',
        onClick,
        bgColor: 'bg-indigo-500',
        hoverColor: 'hover:bg-indigo-600'
    }),

    help: (onClick: () => void): FloatingActionButton => ({
        icon: '❓',
        title: 'Help',
        onClick,
        bgColor: 'bg-yellow-500',
        hoverColor: 'hover:bg-yellow-600'
    })
};

// Helper hook for common FAB patterns
export const useFABPresets = () => {
    const navigationFABs = (): FloatingActionButton[] => [
        CommonFABs.settings(),
        CommonFABs.dashboard()
    ];

    const dashboardFABs = (): FloatingActionButton[] => [
        CommonFABs.settings(),
        CommonFABs.cards(),
        CommonFABs.budget()
    ];

    const budgetPageFABs = (): FloatingActionButton[] => [
        CommonFABs.settings(),
        CommonFABs.dashboard()
    ];

    return {
        navigationFABs,
        dashboardFABs,
        budgetPageFABs
    };
};

export default FloatingActionButtons;