# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MonzoFlow is a React-based financial dashboard application that integrates with Monzo banking API to display transaction data and visualizations. It uses Firebase for backend services and local IndexedDB storage via Dexie for offline data management.

## Development Commands

### Frontend (React)
- `npm start` - Start development server at http://localhost:3000
- `npm run build` - Build production bundle
- `npm test` - Run tests in watch mode
- `npm run emulator` - Start Firebase emulators for functions

### Firebase Functions (functions/)
- `cd functions && npm run lint` - Lint TypeScript code
- `cd functions && npm run build` - Compile TypeScript to JavaScript
- `cd functions && npm run serve` - Build and start local emulator
- `cd functions && npm run deploy` - Deploy functions to Firebase

## Architecture

### Core Structure
- **React SPA** with TypeScript, using Create React App
- **Firebase Functions** backend for Monzo API integration
- **Dexie (IndexedDB)** for local transaction storage
- **D3.js** for data visualizations (Sankey charts)
- **Tailwind CSS** for styling
- **React Router** for navigation

### Key Contexts
- `AppContext` (`src/components/AppContext/context.tsx`) - Firebase app and functions initialization
- `DatabaseContext` (`src/components/DatabaseContext/DatabaseContext.tsx`) - Dexie database instance for local storage

### Data Flow
1. Firebase Functions proxy Monzo API calls
2. React components fetch data via `use-http`
3. Data stored locally in IndexedDB via Dexie
4. Components read from local database for offline capability

### Route Structure
- `/` - Landing page
- `/auth` - Monzo OAuth authentication
- `/allow-access` - Permission grant flow
- `/display` - Main dashboard (requires authentication)
- `/privacy-policy` - Privacy policy page

### Database Schema (Dexie)
- `accounts` table - Monzo account information
- `transactions` table - Transaction data with account_id, amount, include_in_spending indexes

### Environment Variables
Firebase configuration expects these environment variables:
- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`
- `REACT_APP_FIREBASE_MEASUREMENT_ID`

## Development Notes

### Testing
- Uses React Testing Library and Jest (standard CRA setup)
- Run single test: `npm test -- --testNamePattern="test name"`
- Test files follow `.test.tsx` convention

### Firebase Functions Development
- Functions automatically connect to local emulator in development
- Emulator starts on localhost:5001
- TypeScript compilation required before serving functions

### Data Visualization
- Uses D3 and d3-sankey for financial flow charts
- Chart component located in `src/components/Chart/Chart.tsx`

### State Management
- No global state library (Redux/Zustand) - uses React Context for Firebase and Database
- Local database serves as primary data store
- API calls fetch fresh data and sync to local storage