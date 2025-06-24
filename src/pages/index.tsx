import { FC, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const clientId = process.env.REACT_APP_MONZO_CLIENT_ID
const redirectUri = process.env.REACT_APP_MONZO_REDIRECT_URI
const monzoAuthUri = `https://auth.monzo.com/?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&state=qwertyuyuiiopop`

export const Index: FC = () => {
    const navigate = useNavigate()
    const authData = localStorage.getItem("auth_data")

    useEffect(() => {
        if (authData && authData !== "") {
            navigate("/display")
        }
        
        document.title = "MonzoFlow - Transform Your Financial Insights | Monzo Transaction Analytics";
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute('content', 'MonzoFlow automatically analyzes your Monzo transactions to provide powerful budgeting, debt tracking, and spending insights. Secure, private, and no manual data entry required.');
        }
    }, [authData, navigate])

    const handleLogin = () => {
        console.log(monzoAuthUri)
        window.location.href = monzoAuthUri as string
    }

    const features = [
        {
            icon: "🏦",
            title: "Complete Transaction History",
            description: "Automatically fetch and analyze 5 years of transaction data from all your Monzo accounts",
            details: ["Real-time sync", "Multi-account support", "Smart categorization"]
        },
        {
            icon: "📊",
            title: "Advanced Analytics",
            description: "Comprehensive spending insights with trends, patterns, and detailed breakdowns",
            details: ["Monthly/yearly trends", "Category analysis", "Merchant insights"]
        },
        {
            icon: "💰",
            title: "Smart Budget Management",
            description: "Automatic budget categories based on your actual spending patterns",
            details: ["Auto-category creation", "Progress tracking", "Overspend alerts"]
        },
        {
            icon: "💳",
            title: "Debt Tracking",
            description: "Monitor and track debt reduction automatically from your transactions",
            details: ["Payment tracking", "Progress calculation", "Payoff estimation"]
        },
        {
            icon: "📄",
            title: "Bill Management",
            description: "Smart bill detection and recurring payment tracking",
            details: ["Auto-detection", "Payment reminders", "Frequency analysis"]
        },
        {
            icon: "🔄",
            title: "Money Flow Visualization",
            description: "Interactive Sankey diagrams showing where your money goes",
            details: ["Visual flow charts", "Account-to-merchant mapping", "Spending patterns"]
        }
    ];

    const benefits = [
        "🔒 **Secure**: Your data stays on your device - we don't store anything",
        "⚡ **Fast**: Local IndexedDB storage for instant access",
        "🎯 **Automatic**: No manual data entry required",
        "📱 **Responsive**: Works on all devices",
        "🔄 **Real-time**: Live updates as you spend",
        "🎨 **Visual**: Beautiful charts and insights"
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {/* Hero Section */}
            <div className="relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
                        <header className="pt-6">
                            <nav className="relative flex items-center justify-between sm:h-10">
                                <div className="flex items-center flex-grow flex-shrink-0 lg:flex-grow-0">
                                    <div className="flex items-center justify-between w-full md:w-auto">
                                        <span className="text-2xl font-bold text-gray-900">
                                            💰 MonzoFlow
                                        </span>
                                    </div>
                                </div>
                                <div className="hidden md:block md:ml-10">
                                    <button
                                        onClick={handleLogin}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 shadow-lg"
                                        aria-label="Login with your Monzo account to start analyzing your finances"
                                    >
                                        Login with Monzo
                                    </button>
                                </div>
                            </nav>
                        </header>

                        <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
                            <div className="sm:text-center lg:text-left">
                                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                                    <span className="block xl:inline">Transform your</span>{' '}
                                    <span className="block text-blue-600 xl:inline">financial insights</span>
                                </h1>
                                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                                    MonzoFlow automatically analyzes your Monzo transactions to provide powerful 
                                    budgeting, debt tracking, and spending insights. No manual data entry required.
                                </p>
                                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                                    <div className="rounded-md shadow">
                                        <button
                                            onClick={handleLogin}
                                            className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10 transition-colors duration-200"
                                            aria-label="Get started with MonzoFlow by connecting your Monzo account"
                                        >
                                            🚀 Get Started with Monzo
                                        </button>
                                    </div>
                                    <div className="mt-3 sm:mt-0 sm:ml-3">
                                        <a
                                            href="#features"
                                            className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 md:py-4 md:text-lg md:px-10 transition-colors duration-200"
                                        >
                                            Learn More
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </main>
                    </div>
                </div>
                <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
                    <div className="h-56 w-full bg-gradient-to-r from-blue-400 to-purple-500 sm:h-72 md:h-96 lg:w-full lg:h-full flex items-center justify-center">
                        <div className="text-white text-center">
                            <div className="text-6xl mb-4">📊</div>
                            <div className="text-xl font-semibold">Financial Intelligence</div>
                            <div className="text-lg opacity-90">Powered by Your Data</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div id="features" className="py-12 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="lg:text-center">
                        <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Features</h2>
                        <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                            Everything you need for financial clarity
                        </p>
                        <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
                            MonzoFlow automatically transforms your transaction data into actionable insights
                        </p>
                    </div>

                    <div className="mt-10">
                        <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-x-8 md:gap-y-10">
                            {features.map((feature, index) => (
                                <div key={index} className="relative">
                                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white text-2xl">
                                        {feature.icon}
                                    </div>
                                    <div className="ml-16">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900">{feature.title}</h3>
                                        <p className="mt-2 text-base text-gray-500">{feature.description}</p>
                                        <ul className="mt-3 space-y-1">
                                            {feature.details.map((detail, i) => (
                                                <li key={i} className="text-sm text-gray-400 flex items-center">
                                                    <span className="w-1 h-1 bg-blue-400 rounded-full mr-2"></span>
                                                    {detail}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Benefits Section */}
            <div className="bg-gray-50 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="lg:text-center mb-10">
                        <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Why Choose MonzoFlow</h2>
                        <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                            Built for privacy and performance
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {benefits.map((benefit, index) => (
                            <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                                <div className="text-gray-700" dangerouslySetInnerHTML={{ __html: benefit }} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* How It Works Section */}
            <div className="py-12 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="lg:text-center mb-10">
                        <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">How It Works</h2>
                        <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                            Get started in 3 simple steps
                        </p>
                    </div>
                    <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-blue-600 text-2xl mx-auto mb-4">
                                🔐
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">1. Secure Authentication</h3>
                            <p className="text-gray-500">Connect safely with your Monzo account using official OAuth</p>
                        </div>
                        <div className="text-center">
                            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-blue-600 text-2xl mx-auto mb-4">
                                📥
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">2. Automatic Data Sync</h3>
                            <p className="text-gray-500">We fetch 5 years of transaction history and keep it updated</p>
                        </div>
                        <div className="text-center">
                            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-blue-600 text-2xl mx-auto mb-4">
                                📊
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">3. Instant Insights</h3>
                            <p className="text-gray-500">View budgets, track spending, and analyze your financial patterns</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div className="bg-blue-600">
                <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
                    <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                        <span className="block">Ready to take control?</span>
                        <span className="block text-blue-200">Start analyzing your finances today.</span>
                    </h2>
                    <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
                        <div className="inline-flex rounded-md shadow">
                            <button
                                onClick={handleLogin}
                                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 transition-colors duration-200"
                                aria-label="Connect your Monzo account to transform your financial insights"
                            >
                                Connect Your Monzo Account
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-gray-800">
                <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="flex items-center">
                            <span className="text-2xl font-bold text-white">💰 MonzoFlow</span>
                        </div>
                        <div className="mt-4 md:mt-0">
                            <p className="text-gray-400 text-sm">
                                Not affiliated with Monzo. Your data stays private and secure on your device.
                                <br />
                                <span className="text-gray-500">Open source and transparent financial analytics.</span>
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default Index;