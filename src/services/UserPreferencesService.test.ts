import { UserPreferencesService } from './UserPreferencesService';
import { MySubClassedDexie } from '../components/DatabaseContext/DatabaseContext';
import { MonthlyCycleConfig, DEFAULT_MONTHLY_CYCLE } from '../types/UserPreferences';

// Mock IndexedDB for testing
const mockDatabase = {
    userPreferences: {
        where: jest.fn(),
        add: jest.fn(),
        put: jest.fn()
    }
} as unknown as MySubClassedDexie;

describe('UserPreferencesService', () => {
    let service: UserPreferencesService;

    beforeEach(() => {
        service = new UserPreferencesService(mockDatabase);
        jest.clearAllMocks();
    });

    describe('getUserPreferences', () => {
        it('should return existing preferences', async () => {
            const mockPreferences = {
                id: '1',
                userId: 'default',
                monthlyCycleType: 'specific_date' as const,
                monthlyCycleDate: 15,
                created: '2024-01-01T00:00:00.000Z',
                updated: '2024-01-01T00:00:00.000Z'
            };

            const mockWhere = {
                equals: jest.fn().mockReturnValue({
                    first: jest.fn().mockResolvedValue(mockPreferences)
                })
            };

            (mockDatabase.userPreferences.where as jest.Mock).mockReturnValue(mockWhere);

            const result = await service.getUserPreferences();
            expect(result).toEqual(mockPreferences);
            expect(mockDatabase.userPreferences.where).toHaveBeenCalledWith('userId');
            expect(mockWhere.equals).toHaveBeenCalledWith('default');
        });

        it('should create default preferences if none exist', async () => {
            const mockWhere = {
                equals: jest.fn().mockReturnValue({
                    first: jest.fn().mockResolvedValue(undefined)
                })
            };

            (mockDatabase.userPreferences.where as jest.Mock).mockReturnValue(mockWhere);
            (mockDatabase.userPreferences.add as jest.Mock).mockResolvedValue('new-id');

            // Mock crypto.randomUUID
            const mockUUID = 'test-uuid';
            const mockCrypto = {
                randomUUID: jest.fn().mockReturnValue(mockUUID)
            };
            (global as any).crypto = mockCrypto;

            const result = await service.getUserPreferences();
            
            expect(result.id).toBe(mockUUID);
            expect(result.userId).toBe('default');
            expect(result.monthlyCycleType).toBe(DEFAULT_MONTHLY_CYCLE.type);
            expect(result.monthlyCycleDate).toBe(DEFAULT_MONTHLY_CYCLE.date);
            expect(mockDatabase.userPreferences.add).toHaveBeenCalled();
        });
    });

    describe('updateMonthlyCycleConfig', () => {
        it('should update monthly cycle configuration', async () => {
            const existingPreferences = {
                id: '1',
                userId: 'default',
                monthlyCycleType: 'specific_date' as const,
                monthlyCycleDate: 1,
                created: '2024-01-01T00:00:00.000Z',
                updated: '2024-01-01T00:00:00.000Z'
            };

            const mockWhere = {
                equals: jest.fn().mockReturnValue({
                    first: jest.fn().mockResolvedValue(existingPreferences)
                })
            };

            (mockDatabase.userPreferences.where as jest.Mock).mockReturnValue(mockWhere);
            (mockDatabase.userPreferences.put as jest.Mock).mockResolvedValue('1');

            const newConfig: MonthlyCycleConfig = {
                type: 'last_working_day'
            };

            const result = await service.updateMonthlyCycleConfig(newConfig);

            expect(result.monthlyCycleType).toBe('last_working_day');
            expect(result.monthlyCycleDate).toBeUndefined();
            expect(mockDatabase.userPreferences.put).toHaveBeenCalled();
        });
    });

    describe('getMonthlyCycleConfig', () => {
        it('should return current monthly cycle config', async () => {
            const mockPreferences = {
                id: '1',
                userId: 'default',
                monthlyCycleType: 'closest_workday' as const,
                monthlyCycleDate: 25,
                created: '2024-01-01T00:00:00.000Z',
                updated: '2024-01-01T00:00:00.000Z'
            };

            const mockWhere = {
                equals: jest.fn().mockReturnValue({
                    first: jest.fn().mockResolvedValue(mockPreferences)
                })
            };

            (mockDatabase.userPreferences.where as jest.Mock).mockReturnValue(mockWhere);

            const result = await service.getMonthlyCycleConfig();

            expect(result).toEqual({
                type: 'closest_workday',
                date: 25
            });
        });

        it('should return default config if preferences not found', async () => {
            const mockWhere = {
                equals: jest.fn().mockReturnValue({
                    first: jest.fn().mockResolvedValue(undefined)
                })
            };

            (mockDatabase.userPreferences.where as jest.Mock).mockReturnValue(mockWhere);
            (mockDatabase.userPreferences.add as jest.Mock).mockResolvedValue('new-id');

            const result = await service.getMonthlyCycleConfig();

            expect(result).toEqual(DEFAULT_MONTHLY_CYCLE);
        });
    });

    describe('resetToDefaults', () => {
        it('should delete existing preferences and create defaults', async () => {
            const mockDelete = jest.fn().mockResolvedValue(1);
            const mockWhere = {
                equals: jest.fn().mockReturnValue({
                    delete: mockDelete
                })
            };

            (mockDatabase.userPreferences.where as jest.Mock).mockReturnValue(mockWhere);
            (mockDatabase.userPreferences.add as jest.Mock).mockResolvedValue('new-id');

            // Mock crypto.randomUUID
            const mockUUID = 'reset-uuid';
            const mockCrypto = {
                randomUUID: jest.fn().mockReturnValue(mockUUID)
            };
            (global as any).crypto = mockCrypto;

            const result = await service.resetToDefaults();

            expect(result.id).toBe(mockUUID);
            expect(result.monthlyCycleType).toBe(DEFAULT_MONTHLY_CYCLE.type);
            expect(result.monthlyCycleDate).toBe(DEFAULT_MONTHLY_CYCLE.date);
            expect(mockDelete).toHaveBeenCalled();
            expect(mockDatabase.userPreferences.add).toHaveBeenCalled();
        });
    });
});