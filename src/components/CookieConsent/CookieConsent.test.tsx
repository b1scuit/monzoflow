import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CookieConsent } from './CookieConsent';

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

describe('CookieConsent', () => {
  const mockOnAccept = jest.fn();
  const mockOnReject = jest.fn();
  const mockOnManagePreferences = jest.fn();

  beforeEach(() => {
    localStorageMock.clear();
    mockOnAccept.mockClear();
    mockOnReject.mockClear();
    mockOnManagePreferences.mockClear();
  });

  it('should render when no consent is stored', () => {
    render(
      <CookieConsent
        onAccept={mockOnAccept}
        onReject={mockOnReject}
        onManagePreferences={mockOnManagePreferences}
      />
    );

    expect(screen.getByText('Cookie Preferences')).toBeInTheDocument();
    expect(screen.getByText('Accept All')).toBeInTheDocument();
    expect(screen.getByText('Reject All')).toBeInTheDocument();
    expect(screen.getByText('Manage Preferences')).toBeInTheDocument();
  });

  it('should not render when consent is already stored', () => {
    localStorageMock.setItem('cookieConsent', 'accepted');

    render(
      <CookieConsent
        onAccept={mockOnAccept}
        onReject={mockOnReject}
        onManagePreferences={mockOnManagePreferences}
      />
    );

    expect(screen.queryByText('Cookie Preferences')).not.toBeInTheDocument();
  });

  it('should call onAccept and store consent when Accept All is clicked', () => {
    render(
      <CookieConsent
        onAccept={mockOnAccept}
        onReject={mockOnReject}
        onManagePreferences={mockOnManagePreferences}
      />
    );

    fireEvent.click(screen.getByText('Accept All'));

    expect(mockOnAccept).toHaveBeenCalled();
    expect(localStorageMock.getItem('cookieConsent')).toBe('accepted');
  });

  it('should call onReject and store consent when Reject All is clicked', () => {
    render(
      <CookieConsent
        onAccept={mockOnAccept}
        onReject={mockOnReject}
        onManagePreferences={mockOnManagePreferences}
      />
    );

    fireEvent.click(screen.getByText('Reject All'));

    expect(mockOnReject).toHaveBeenCalled();
    expect(localStorageMock.getItem('cookieConsent')).toBe('rejected');
  });

  it('should call onManagePreferences when Manage Preferences is clicked', () => {
    render(
      <CookieConsent
        onAccept={mockOnAccept}
        onReject={mockOnReject}
        onManagePreferences={mockOnManagePreferences}
      />
    );

    fireEvent.click(screen.getByText('Manage Preferences'));

    expect(mockOnManagePreferences).toHaveBeenCalled();
  });

  it('should have proper accessibility attributes', () => {
    render(
      <CookieConsent
        onAccept={mockOnAccept}
        onReject={mockOnReject}
        onManagePreferences={mockOnManagePreferences}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'cookie-consent-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'cookie-consent-description');
  });
});