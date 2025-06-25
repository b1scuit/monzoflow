import React, { useEffect, useState } from 'react';
import { CookieConsent } from './CookieConsent';
import { CookiePreferencesModal } from './CookiePreferencesModal';
import CookieConsentManager, { CookiePreferences } from '../../services/CookieConsentManager';

export const CookieConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);

  useEffect(() => {
    // Initialize cookie preferences from localStorage on app start
    CookieConsentManager.initializeFromSavedPreferences();

    // Check for Do Not Track setting
    if (CookieConsentManager.shouldRespectDNT()) {
      CookieConsentManager.rejectAll();
    }
  }, []);

  const handleAcceptAll = () => {
    CookieConsentManager.acceptAll();
  };

  const handleRejectAll = () => {
    CookieConsentManager.rejectAll();
  };

  const handleManagePreferences = () => {
    setShowPreferencesModal(true);
  };

  const handleSavePreferences = (preferences: CookiePreferences) => {
    CookieConsentManager.setCustomPreferences(preferences);
  };

  const handleClosePreferencesModal = () => {
    setShowPreferencesModal(false);
  };

  return (
    <>
      {children}
      <CookieConsent
        onAccept={handleAcceptAll}
        onReject={handleRejectAll}
        onManagePreferences={handleManagePreferences}
      />
      <CookiePreferencesModal
        isOpen={showPreferencesModal}
        onClose={handleClosePreferencesModal}
        onSave={handleSavePreferences}
      />
    </>
  );
};