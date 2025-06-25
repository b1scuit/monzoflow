import { FC } from "react";

export const Index: FC = () => (
    <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-lg max-w-none">
            <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Cookie Policy</h2>
                <p className="text-gray-600 mb-4">
                    We use cookies to enhance your experience on our website. This policy explains what cookies are, 
                    how we use them, and how you can manage your preferences.
                </p>
                
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Types of Cookies We Use</h3>
                
                <div className="space-y-4">
                    <div>
                        <h4 className="text-lg font-medium text-gray-800">Necessary Cookies</h4>
                        <p className="text-gray-600">
                            These cookies are essential for the website to function properly. They enable basic 
                            functionality such as page navigation and access to secure areas.
                        </p>
                    </div>
                    
                    <div>
                        <h4 className="text-lg font-medium text-gray-800">Analytics Cookies</h4>
                        <p className="text-gray-600">
                            We use Google Analytics to understand how visitors interact with our website. 
                            These cookies help us improve our services by providing insights into website usage.
                        </p>
                    </div>
                    
                    <div>
                        <h4 className="text-lg font-medium text-gray-800">Functional Cookies</h4>
                        <p className="text-gray-600">
                            These cookies allow the website to remember choices you make and provide enhanced features.
                        </p>
                    </div>
                    
                    <div>
                        <h4 className="text-lg font-medium text-gray-800">Marketing Cookies</h4>
                        <p className="text-gray-600">
                            These cookies may be used to deliver advertisements that are relevant to you and your interests.
                        </p>
                    </div>
                </div>
            </section>
            
            <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Managing Your Cookie Preferences</h2>
                <p className="text-gray-600 mb-4">
                    You can manage your cookie preferences at any time through our cookie consent banner or 
                    by adjusting your browser settings. You also have the right to withdraw your consent at any time.
                </p>
                
                <button
                    onClick={() => {
                        localStorage.removeItem('cookieConsent');
                        localStorage.removeItem('cookiePreferences');
                        window.location.reload();
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    Manage Cookie Preferences
                </button>
            </section>
            
            <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Contact Information</h2>
                <p className="text-gray-600">
                    If you have any questions about this Privacy Policy or our cookie practices, 
                    please contact us through our website.
                </p>
            </section>
            
            <section>
                <p className="text-sm text-gray-500">
                    Last updated: {new Date().toLocaleDateString()}
                </p>
            </section>
        </div>
    </div>
)

export default Index