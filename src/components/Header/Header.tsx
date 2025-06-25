import { FC, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import EnvironmentFlag from '../EnvironmentFlag/EnvironmentFlag';

interface HeaderProps {
    title?: string;
    subtitle?: string;
    showNavigation?: boolean;
    customActions?: React.ReactNode;
    className?: string;
}

export const Header: FC<HeaderProps> = ({ 
    title, 
    subtitle, 
    showNavigation = false, 
    customActions,
    className = ""
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('auth_data');
        localStorage.removeItem('tokenTimestamp');
        navigate('/');
    };

    const navigationItems = [
        { 
            path: '/display', 
            label: 'Dashboard', 
            icon: '📊',
            description: 'Financial overview and insights'
        },
        { 
            path: '/budget', 
            label: 'Budget', 
            icon: '💰',
            description: 'Budget management and tracking'
        },
        { 
            path: '/settings', 
            label: 'Settings', 
            icon: '⚙️',
            description: 'App settings and preferences'
        }
    ];

    const currentPath = location.pathname;
    const isActive = (path: string) => currentPath === path;

    if (!showNavigation) {
        // Simple header for unauthenticated pages
        return (
            <header className={`bg-white shadow-sm border-b border-gray-200 ${className}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center space-x-3">
                            <div className="text-2xl">💰</div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    MonzoFlow
                                </h1>
                                {title && (
                                    <p className="text-sm text-gray-600">{title}</p>
                                )}
                            </div>
                        </div>
                        {customActions}
                    </div>
                </div>
            </header>
        );
    }

    // Full navigation header for authenticated pages
    return (
        <header className={`bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50 ${className}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Main Header */}
                <div className="flex justify-between items-center py-4">
                    {/* Logo and Branding */}
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => navigate('/display')}
                            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
                        >
                            <div className="text-2xl">💰</div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">MonzoFlow</h1>
                                <p className="text-xs text-gray-500 hidden sm:block">Financial Intelligence</p>
                            </div>
                        </button>

                        {/* Desktop Navigation */}
                        <nav className="hidden lg:flex ml-8 space-x-1">
                            {navigationItems.map((item) => (
                                <button
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    className={`
                                        flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                                        ${isActive(item.path)
                                            ? 'bg-blue-100 text-blue-700 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                        }
                                    `}
                                    title={item.description}
                                >
                                    <span className="text-base">{item.icon}</span>
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Right Side Actions */}
                    <div className="flex items-center space-x-4">
                        {/* Environment Flag */}
                        <div className="hidden sm:block">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                <EnvironmentFlag />
                            </span>
                        </div>

                        {/* User Menu */}
                        <div className="relative">
                            <button
                                onClick={handleLogout}
                                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200"
                                title="Sign out"
                            >
                                <span className="text-base">👤</span>
                                <span className="hidden sm:inline">Sign Out</span>
                            </button>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Toggle mobile menu"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {isMobileMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>

                        {customActions}
                    </div>
                </div>

                {/* Page Title Section */}
                {(title || subtitle) && (
                    <div className="pb-4 border-t border-gray-100 pt-4 mt-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                {title && (
                                    <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                                )}
                                {subtitle && (
                                    <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Mobile Navigation Menu */}
                {isMobileMenuOpen && (
                    <div className="lg:hidden border-t border-gray-200 pt-4 pb-4">
                        <nav className="space-y-1">
                            {navigationItems.map((item) => (
                                <button
                                    key={item.path}
                                    onClick={() => {
                                        navigate(item.path);
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className={`
                                        w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-all duration-200
                                        ${isActive(item.path)
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                        }
                                    `}
                                >
                                    <span className="text-lg">{item.icon}</span>
                                    <div>
                                        <div className="font-medium">{item.label}</div>
                                        <div className="text-xs opacity-75">{item.description}</div>
                                    </div>
                                </button>
                            ))}
                        </nav>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;