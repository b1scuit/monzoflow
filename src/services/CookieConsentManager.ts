import GoogleAnalytics from './GoogleAnalytics';

export interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export type ConsentStatus = 'accepted' | 'rejected' | 'custom' | null;

export class CookieConsentManager {
  private static instance: CookieConsentManager;

  private constructor() {}

  public static getInstance(): CookieConsentManager {
    if (!CookieConsentManager.instance) {
      CookieConsentManager.instance = new CookieConsentManager();
    }
    return CookieConsentManager.instance;
  }

  public getConsentStatus(): ConsentStatus {
    return localStorage.getItem('cookieConsent') as ConsentStatus;
  }

  public getPreferences(): CookiePreferences {
    const savedPreferences = localStorage.getItem('cookiePreferences');
    if (savedPreferences) {
      return JSON.parse(savedPreferences);
    }

    // Default preferences
    return {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    };
  }

  public acceptAll(): void {
    const preferences: CookiePreferences = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    };

    localStorage.setItem('cookieConsent', 'accepted');
    localStorage.setItem('cookiePreferences', JSON.stringify(preferences));
    
    this.applyPreferences(preferences);
  }

  public rejectAll(): void {
    const preferences: CookiePreferences = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    };

    localStorage.setItem('cookieConsent', 'rejected');
    localStorage.setItem('cookiePreferences', JSON.stringify(preferences));
    
    this.applyPreferences(preferences);
  }

  public setCustomPreferences(preferences: CookiePreferences): void {
    localStorage.setItem('cookieConsent', 'custom');
    localStorage.setItem('cookiePreferences', JSON.stringify(preferences));
    
    this.applyPreferences(preferences);
  }

  public revokeConsent(): void {
    localStorage.removeItem('cookieConsent');
    localStorage.removeItem('cookiePreferences');
    
    // Disable all tracking
    GoogleAnalytics.disable();
    
    // Clear existing cookies (non-necessary ones)
    this.clearNonNecessaryCookies();
    
    // Reload page to ensure clean state
    window.location.reload();
  }

  public initializeFromSavedPreferences(): void {
    const consentStatus = this.getConsentStatus();
    
    if (consentStatus) {
      const preferences = this.getPreferences();
      this.applyPreferences(preferences);
    }
  }

  private applyPreferences(preferences: CookiePreferences): void {
    // Handle Analytics cookies
    if (preferences.analytics) {
      GoogleAnalytics.initialize();
    } else {
      GoogleAnalytics.disable();
    }

    // Handle other cookie categories as needed
    // For now, we're primarily focusing on analytics (Google Analytics)
    
    console.log('Cookie preferences applied:', preferences);
  }

  private clearNonNecessaryCookies(): void {
    // Clear Google Analytics cookies
    const cookies = document.cookie.split(';');
    
    cookies.forEach(cookie => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      
      // Clear GA cookies
      if (name.startsWith('_ga') || name.startsWith('_gid') || name.startsWith('_gat')) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
      }
    });
  }

  public shouldRespectDNT(): boolean {
    const dnt = navigator.doNotTrack || (window as any).doNotTrack || (navigator as any).msDoNotTrack;
    return dnt === '1' || dnt === 'yes';
  }
}

export default CookieConsentManager.getInstance();