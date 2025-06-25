import { CookieConsentManager } from './CookieConsentManager';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock GoogleAnalytics
jest.mock('./GoogleAnalytics', () => ({
  initialize: jest.fn(),
  disable: jest.fn(),
}));

describe('CookieConsentManager', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should return null when no consent is stored', () => {
    const manager = CookieConsentManager.getInstance();
    expect(manager.getConsentStatus()).toBeNull();
  });

  it('should return default preferences when none are stored', () => {
    const manager = CookieConsentManager.getInstance();
    const preferences = manager.getPreferences();
    
    expect(preferences).toEqual({
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    });
  });

  it('should accept all cookies and store preferences', () => {
    const manager = CookieConsentManager.getInstance();
    manager.acceptAll();

    expect(localStorageMock.getItem('cookieConsent')).toBe('accepted');
    
    const storedPreferences = JSON.parse(localStorageMock.getItem('cookiePreferences') || '{}');
    expect(storedPreferences).toEqual({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    });
  });

  it('should reject all cookies and store preferences', () => {
    const manager = CookieConsentManager.getInstance();
    manager.rejectAll();

    expect(localStorageMock.getItem('cookieConsent')).toBe('rejected');
    
    const storedPreferences = JSON.parse(localStorageMock.getItem('cookiePreferences') || '{}');
    expect(storedPreferences).toEqual({
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    });
  });

  it('should set custom preferences', () => {
    const manager = CookieConsentManager.getInstance();
    const customPreferences = {
      necessary: true,
      functional: true,
      analytics: false,
      marketing: false,
    };

    manager.setCustomPreferences(customPreferences);

    expect(localStorageMock.getItem('cookieConsent')).toBe('custom');
    
    const storedPreferences = JSON.parse(localStorageMock.getItem('cookiePreferences') || '{}');
    expect(storedPreferences).toEqual(customPreferences);
  });

  it('should be a singleton', () => {
    const manager1 = CookieConsentManager.getInstance();
    const manager2 = CookieConsentManager.getInstance();
    
    expect(manager1).toBe(manager2);
  });
});