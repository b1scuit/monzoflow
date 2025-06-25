// Google Analytics 4 configuration and utilities
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export class GoogleAnalytics {
  private static instance: GoogleAnalytics;
  private isInitialized = false;
  private trackingId = process.env.REACT_APP_GA_TRACKING_ID || '';

  private constructor() {}

  public static getInstance(): GoogleAnalytics {
    if (!GoogleAnalytics.instance) {
      GoogleAnalytics.instance = new GoogleAnalytics();
    }
    return GoogleAnalytics.instance;
  }

  public initialize(): void {
    if (this.isInitialized || !this.trackingId) {
      return;
    }

    try {
      // Initialize dataLayer
      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag() {
        window.dataLayer.push(arguments);
      };

      // Configure GA4
      window.gtag('js', new Date());
      window.gtag('config', this.trackingId, {
        cookie_flags: 'SameSite=None;Secure',
        anonymize_ip: true,
        respect_dnt: this.shouldRespectDNT(),
      });

      // Load GA4 script
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.trackingId}`;
      script.onerror = () => {
        console.warn('Failed to load Google Analytics script');
      };
      document.head.appendChild(script);

      this.isInitialized = true;
      console.log('Google Analytics initialized');
    } catch (error) {
      console.error('Failed to initialize Google Analytics:', error);
    }
  }

  public trackEvent(eventName: string, parameters?: Record<string, any>): void {
    if (!this.isInitialized || !window.gtag) {
      return;
    }

    try {
      window.gtag('event', eventName, parameters);
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  public trackPageView(pagePath: string, pageTitle?: string): void {
    if (!this.isInitialized || !window.gtag) {
      return;
    }

    try {
      window.gtag('config', this.trackingId, {
        page_path: pagePath,
        page_title: pageTitle,
      });
    } catch (error) {
      console.error('Failed to track page view:', error);
    }
  }

  public setUserProperties(properties: Record<string, any>): void {
    if (!this.isInitialized || !window.gtag) {
      return;
    }

    try {
      window.gtag('config', this.trackingId, {
        custom_map: properties,
      });
    } catch (error) {
      console.error('Failed to set user properties:', error);
    }
  }

  public disable(): void {
    if (!this.trackingId) return;

    try {
      // Disable GA4 tracking
      (window as any)[`ga-disable-${this.trackingId}`] = true;
      
      // Clear dataLayer
      if (window.dataLayer) {
        window.dataLayer.length = 0;
      }

      console.log('Google Analytics disabled');
    } catch (error) {
      console.error('Failed to disable Google Analytics:', error);
    }
  }

  public isEnabled(): boolean {
    return this.isInitialized && !(window as any)[`ga-disable-${this.trackingId}`];
  }

  private shouldRespectDNT(): boolean {
    // Check if Do Not Track is enabled
    const dnt = navigator.doNotTrack || (window as any).doNotTrack || (navigator as any).msDoNotTrack;
    return dnt === '1' || dnt === 'yes';
  }
}

export default GoogleAnalytics.getInstance();