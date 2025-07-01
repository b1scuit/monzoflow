# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Workflow

- Should always start from a clean, just pulled main branch
- Create tickets in git worktree folders for feature development

## Essential Commands

### Development
- `npm start` - Start development server on http://localhost:3000
- `npm test` - Run tests in interactive watch mode
- `npm test -- --testPathPattern="ServiceName" --verbose --watchAll=false` - Run specific test files
- `npm run build` - Build production app (required before committing)
- `npx tsc --noEmit` - TypeScript type checking without output

### Firebase Functions
- `cd functions && npm run build` - Compile TypeScript functions
- `npm run emulator` - Start Firebase emulators (from root)
- `cd functions && npm run deploy` - Deploy functions to Firebase

## Architecture Overview

### Core Technology Stack
- **Frontend**: React 18 + TypeScript with Tailwind CSS and Headless UI
- **Database**: Dexie (IndexedDB wrapper) for client-side storage with versioned schema
- **Backend**: Firebase Functions (Node.js 18) for OAuth token exchange
- **External API**: Monzo API integration for banking data
- **Routing**: React Router DOM v6
- **State Management**: React Context API + Dexie live queries via `dexie-react-hooks`

### Database Architecture
The app uses Dexie v4 with a versioned schema (currently v4). The database name is `monzoflow` and contains:

**Core Tables**:
- `accounts` - Monzo account information
- `transactions` - Financial transactions with rich metadata
- `budgets`, `budgetCategories`, `budgetTargets` - Budget management
- `debts`, `debtPayments`, `debtPaymentHistory` - Debt tracking
- `bills`, `billPayments` - Bill management
- `userPreferences` - User configuration and monthly cycle settings

**Advanced Features**:
- `creditorMatchingRules` - Automatic transaction-to-debt matching rules
- `debtTransactionMatches` - Matched transactions to debts

### Service Layer Pattern
Business logic is encapsulated in service classes that take the Dexie database instance as a constructor parameter:

```typescript
export class ServiceName {
    private db: MySubClassedDexie;
    
    constructor(database: MySubClassedDexie) {
        this.db = database;
    }
}
```

**Key Services**:
- `UserPreferencesService` - User settings and monthly cycle configuration
- `BudgetCalculationService` - Complex budget calculations and categorization
- `DebtBalanceCalculationService` - Debt tracking calculations
- `DebtMatchingService` - Automatic transaction-to-debt matching
- `DataExportService` - Data export functionality (JSON/CSV)
- `DataImportService` - Data import with validation and conflict resolution

### Component Architecture
- **Pages**: Route-based components in `src/pages/`
- **Layouts**: `Default.tsx` and `LoggedIn.tsx` provide page structure
- **Components**: Organized by feature (Budget, Analytics, Settings, etc.)
- **Hooks**: Custom hooks for business logic (`useBudgetCalculation`, `useDebtBalances`, etc.)

### Data Flow
1. **External Data**: Monzo API via Firebase Functions (`tokenExchange`)
2. **Data Ingestion**: Custom hooks (`useTransactions`, `useAccounts`) 
3. **Local Storage**: Dexie database with live queries
4. **Business Logic**: Service classes for calculations
5. **UI**: React components with `useLiveQuery` for reactive data

### Authentication & External Integration
- OAuth flow with Monzo API handled by Firebase Functions
- Token storage in localStorage with staleness detection
- Automatic transaction syncing with pagination and deduplication
- Rate limiting and retry logic for API calls

### Type System
TypeScript interfaces are well-defined in `src/types/`:
- `Account.tsx` - Monzo account structure
- `Transactions.tsx` - Transaction data with rich Monzo metadata
- `Budget.tsx` - Budget, debt, and bill management types
- `UserPreferences.tsx` - User configuration

### Testing Patterns
- Unit tests use Jest with manual mocks for database operations
- Mock Dexie database operations using chained method mocking:
```typescript
const mockDatabase = {
    tableName: {
        where: jest.fn().mockReturnValue({
            equals: jest.fn().mockReturnValue({
                first: jest.fn().mockResolvedValue(mockData)
            })
        })
    }
} as unknown as MySubClassedDexie;
```

### UI Patterns
- Functional components with hooks
- Tailwind CSS with mobile-first responsive design
- Headless UI for accessible components
- Loading states with skeleton loaders
- Error boundaries and user feedback

## Important Implementation Notes

### Database Context Usage
Always access the database through the `useDatabase()` hook:
```typescript
const db = useDatabase();
const service = new ServiceName(db);
```

### Live Queries
Use `useLiveQuery` from `dexie-react-hooks` for reactive database queries:
```typescript
const data = useLiveQuery(() => db.tableName.toArray());
```

### Service Instantiation
Service classes should be instantiated within components/hooks, not as singletons.

### Error Handling
Follow existing patterns with try-catch blocks and user-friendly error messages. Console errors are acceptable for development debugging.

### Monthly Cycle Configuration
The app supports flexible monthly cycles (specific date, last working day, closest workday) configurable per user via `UserPreferencesService`.