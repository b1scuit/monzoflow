import { FC, useState } from "react";
import { useNavigate } from "react-router";

export const Index: FC = () => {
    const navigate = useNavigate()
    const [isChecking, setIsChecking] = useState(false)

    const handleContinue = () => {
        setIsChecking(true)
        // Simulate a brief checking period for better UX
        setTimeout(() => {
            navigate("/display")
        }, 800)
    }

    const steps = [
        {
            icon: "📱",
            title: "Open your Monzo app",
            description: "Launch the Monzo mobile app on your phone"
        },
        {
            icon: "🔔", 
            title: "Check for notifications",
            description: "Look for a notification about MonzoFlow requesting access"
        },
        {
            icon: "✅",
            title: "Grant permission",
            description: "Tap 'Allow access to MonzoFlow' and then 'Allow'"
        }
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                        <span className="text-3xl">🔐</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Complete Your Setup
                    </h1>
                    <p className="text-lg text-gray-600">
                        One final step to unlock your financial insights
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
                    {/* Alert Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <span className="text-blue-500 text-xl">ℹ️</span>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-blue-800">
                                    Permission Required
                                </h3>
                                <p className="mt-1 text-sm text-blue-700">
                                    MonzoFlow needs additional data access permissions to provide you with comprehensive transaction analysis and budgeting features.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Steps */}
                    <div className="space-y-6 mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Please complete these steps:
                        </h2>
                        
                        {steps.map((step, index) => (
                            <div key={index} className="flex items-start space-x-4">
                                <div className="flex-shrink-0">
                                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                                        <span className="text-lg">{step.icon}</span>
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-base font-medium text-gray-900">
                                        {index + 1}. {step.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {step.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* What This Enables */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <h3 className="text-sm font-medium text-gray-900 mb-2">
                            🚀 This enables access to:
                        </h3>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li className="flex items-center">
                                <span className="w-1 h-1 bg-green-400 rounded-full mr-2"></span>
                                Complete transaction history analysis
                            </li>
                            <li className="flex items-center">
                                <span className="w-1 h-1 bg-green-400 rounded-full mr-2"></span>
                                Automatic budget categorization
                            </li>
                            <li className="flex items-center">
                                <span className="w-1 h-1 bg-green-400 rounded-full mr-2"></span>
                                Real-time spending insights
                            </li>
                            <li className="flex items-center">
                                <span className="w-1 h-1 bg-green-400 rounded-full mr-2"></span>
                                Debt tracking and bill management
                            </li>
                        </ul>
                    </div>

                    {/* Action Button */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={handleContinue}
                            disabled={isChecking}
                            className={`flex-1 flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white transition-all duration-200 ${
                                isChecking 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:scale-105'
                            }`}
                        >
                            {isChecking ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Verifying access...
                                </>
                            ) : (
                                <>
                                    ✅ I've granted permission - Continue
                                </>
                            )}
                        </button>
                        
                        <button
                            onClick={() => window.location.href = '/'}
                            className="px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                        >
                            Need help?
                        </button>
                    </div>
                </div>

                {/* Security Note */}
                <div className="text-center text-sm text-gray-500">
                    <div className="flex items-center justify-center space-x-2">
                        <span>🔒</span>
                        <span>Your data stays private and secure on your device</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Index;