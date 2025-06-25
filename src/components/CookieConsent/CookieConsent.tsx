import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface CookieConsentProps {
  onAccept: () => void;
  onReject: () => void;
  onManagePreferences: () => void;
}

export const CookieConsent: React.FC<CookieConsentProps> = ({
  onAccept,
  onReject,
  onManagePreferences,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setIsVisible(false);
    onAccept();
  };

  const handleReject = () => {
    localStorage.setItem('cookieConsent', 'rejected');
    setIsVisible(false);
    onReject();
  };

  const handleManagePreferences = () => {
    onManagePreferences();
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50"
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-4">
            <h3 id="cookie-consent-title" className="text-lg font-medium text-gray-900 mb-2">
              Cookie Preferences
            </h3>
            <p id="cookie-consent-description" className="text-sm text-gray-600 mb-4">
              We use cookies to enhance your experience and analyze our website traffic. 
              You can choose to accept all cookies, reject non-essential cookies, or manage your preferences.{' '}
              <a 
                href="/privacy-policy" 
                className="text-blue-600 hover:text-blue-800 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                View our Privacy Policy
              </a>
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleAccept}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Accept All
              </button>
              <button
                onClick={handleReject}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Reject All
              </button>
              <button
                onClick={handleManagePreferences}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Manage Preferences
              </button>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            aria-label="Close cookie consent banner"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
};