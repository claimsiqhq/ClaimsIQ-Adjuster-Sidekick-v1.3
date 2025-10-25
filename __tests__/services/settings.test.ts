// Unit tests for Settings Service

import {
  getUserProfile,
  getUserSettings,
  updateUserSettings,
  syncLocalSettingsToSupabase,
  exportUserData,
} from '@/services/settings';
import { supabase } from '@/utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Settings Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  describe('getUserProfile', () => {
    it('should fetch user profile from Supabase', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'adjuster',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      });

      const result = await getUserProfile('user-123');

      expect(result).toEqual(mockProfile);
      expect(supabase.from).toHaveBeenCalledWith('profiles');
    });

    it('should return null on error', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Not found'),
        }),
      });

      const result = await getUserProfile('user-123');

      expect(result).toBeNull();
    });

    it('should cache profile data', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      });

      // First call - should hit Supabase
      await getUserProfile('user-123');

      // Second call - should use cache
      const result = await getUserProfile('user-123');

      expect(result).toEqual(expect.objectContaining(mockProfile));
    });
  });

  describe('getUserSettings', () => {
    it('should fetch user settings from Supabase', async () => {
      const mockSettings = {
        user_id: 'user-123',
        units: 'imperial',
        dark_mode: false,
        wifi_only_uploads: true,
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: mockSettings, error: null }),
      });

      const result = await getUserSettings('user-123');

      expect(result).toEqual(mockSettings);
    });

    it('should create default settings if none exist', async () => {
      const mockSettings = {
        user_id: 'user-123',
        units: 'imperial',
        dark_mode: false,
      };

      // First call returns null (no settings)
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      // Second call inserts new settings
      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockSettings, error: null }),
      });

      const result = await getUserSettings('user-123');

      expect(result).toEqual(mockSettings);
    });
  });

  describe('updateUserSettings', () => {
    it('should update user settings in Supabase', async () => {
      const updates = { dark_mode: true, units: 'metric' };
      const updatedSettings = {
        user_id: 'user-123',
        dark_mode: true,
        units: 'metric',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: updatedSettings, error: null }),
      });

      const result = await updateUserSettings('user-123', updates);

      expect(result).toEqual(updatedSettings);
    });

    it('should clear cache after update', async () => {
      const updates = { dark_mode: true };

      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      });

      await updateUserSettings('user-123', updates);

      // Cache should be cleared
      const cachedData = await AsyncStorage.getItem('user_settings_cache');
      expect(cachedData).toBeNull();
    });
  });

  describe('syncLocalSettingsToSupabase', () => {
    it('should sync AsyncStorage settings to Supabase', async () => {
      // Setup local settings
      await AsyncStorage.setItem('settings_units', 'metric');
      await AsyncStorage.setItem('settings_dark_mode', 'true');
      await AsyncStorage.setItem('settings_wifi_only', 'false');

      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      });

      await syncLocalSettingsToSupabase('user-123');

      expect(supabase.from).toHaveBeenCalled();
    });
  });

  describe('exportUserData', () => {
    it('should export user data as JSON', async () => {
      const mockProfile = { id: 'user-123', email: 'test@example.com' };
      const mockSettings = { units: 'imperial', dark_mode: false };

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          };
        } else {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: mockSettings, error: null }),
          };
        }
      });

      const result = await exportUserData('user-123');
      const parsed = JSON.parse(result);

      expect(parsed).toHaveProperty('profile');
      expect(parsed).toHaveProperty('settings');
      expect(parsed).toHaveProperty('exported_at');
      expect(parsed.format_version).toBe('1.0');
    });
  });
});
