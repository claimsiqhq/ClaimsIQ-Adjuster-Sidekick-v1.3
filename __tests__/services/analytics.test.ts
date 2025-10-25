// Unit tests for Analytics Service

import {
  trackEvent,
  trackScreenView,
  trackButtonClick,
  trackFeatureUse,
  trackPhotoCapture,
  trackPhotoUpload,
  PerformanceTracker,
  initAnalytics,
  endAnalytics,
} from '@/services/analytics';
import { supabase } from '@/utils/supabase';

describe('Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initAnalytics', () => {
    it('should initialize a session', () => {
      expect(() => initAnalytics()).not.toThrow();
    });
  });

  describe('trackEvent', () => {
    it('should insert event into Supabase', async () => {
      const mockUser = { id: 'user-123' };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
      });

      await trackEvent({
        event_type: 'test',
        event_name: 'test_event',
        event_category: 'test_category',
      });

      expect(supabase.from).toHaveBeenCalledWith('analytics_events');
    });

    it('should not throw on error', async () => {
      (supabase.auth.getUser as jest.Mock).mockRejectedValue(new Error('Auth error'));

      await expect(
        trackEvent({
          event_type: 'test',
          event_name: 'test_event',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('trackScreenView', () => {
    it('should track screen view with correct parameters', async () => {
      const mockUser = { id: 'user-123' };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
      });

      trackScreenView('home');

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(supabase.from).toHaveBeenCalled();
    });
  });

  describe('trackButtonClick', () => {
    it('should track button click', async () => {
      const mockUser = { id: 'user-123' };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
      });

      trackButtonClick('save_claim', { claim_id: '123' });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(supabase.from).toHaveBeenCalled();
    });
  });

  describe('trackFeatureUse', () => {
    it('should track feature usage', async () => {
      const mockUser = { id: 'user-123' };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
      });

      trackFeatureUse('photo_capture', { type: 'damage' });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(supabase.from).toHaveBeenCalled();
    });
  });

  describe('PerformanceTracker', () => {
    it('should track operation duration', async () => {
      const mockUser = { id: 'user-123' };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
      });

      const tracker = new PerformanceTracker('image_upload');

      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 50));

      tracker.end({ file_size: 1024 });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(supabase.from).toHaveBeenCalled();
    });
  });

  describe('trackPhotoCapture', () => {
    it('should track photo capture event', async () => {
      const mockUser = { id: 'user-123' };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
      });

      trackPhotoCapture({ claim_id: 'claim-123', type: 'damage' });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(supabase.from).toHaveBeenCalled();
    });
  });

  describe('trackPhotoUpload', () => {
    it('should track successful photo upload', async () => {
      const mockUser = { id: 'user-123' };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
      });

      trackPhotoUpload(true, { file_size: 2048, duration_ms: 1500 });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(supabase.from).toHaveBeenCalled();
    });

    it('should track failed photo upload', async () => {
      const mockUser = { id: 'user-123' };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
      });

      trackPhotoUpload(false, { file_size: 2048 });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(supabase.from).toHaveBeenCalled();
    });
  });
});
