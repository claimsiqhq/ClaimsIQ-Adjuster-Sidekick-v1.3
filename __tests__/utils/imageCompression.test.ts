// Unit tests for Image Compression Utility

import {
  compressImage,
  createThumbnail,
  getOptimalCompressionSettings,
  smartCompress,
} from '@/utils/imageCompression';
import { manipulateAsync } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

jest.mock('expo-image-manipulator');
jest.mock('expo-file-system/legacy');

describe('Image Compression Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('compressImage', () => {
    it('should compress image with default settings', async () => {
      const mockUri = 'file:///path/to/image.jpg';

      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({
        size: 5000000, // 5MB
      });

      (manipulateAsync as jest.Mock).mockResolvedValue({
        uri: 'file:///compressed.jpg',
        width: 1920,
        height: 1080,
      });

      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({
        size: 1500000, // 1.5MB
      });

      const result = await compressImage(mockUri);

      expect(result.uri).toBe('file:///compressed.jpg');
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
      expect(result.originalSize).toBe(5000000);
      expect(result.compressedSize).toBe(1500000);
      expect(result.compressionRatio).toBe(70); // 70% reduction
    });

    it('should apply custom compression settings', async () => {
      const mockUri = 'file:///path/to/image.jpg';

      (FileSystem.getInfoAsync as jest.Mock)
        .mockResolvedValueOnce({ size: 3000000 })
        .mockResolvedValueOnce({ size: 1000000 });

      (manipulateAsync as jest.Mock).mockResolvedValue({
        uri: 'file:///compressed.jpg',
        width: 1280,
        height: 720,
      });

      const result = await compressImage(mockUri, {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.7,
      });

      expect(manipulateAsync).toHaveBeenCalledWith(
        mockUri,
        expect.arrayContaining([
          expect.objectContaining({
            resize: expect.objectContaining({
              width: 1280,
              height: 1280,
            }),
          }),
        ]),
        expect.objectContaining({
          compress: 0.7,
        })
      );
    });

    it('should handle compression errors', async () => {
      const mockUri = 'file:///path/to/image.jpg';

      (FileSystem.getInfoAsync as jest.Mock).mockRejectedValue(
        new Error('File not found')
      );

      await expect(compressImage(mockUri)).rejects.toThrow();
    });
  });

  describe('createThumbnail', () => {
    it('should create thumbnail with small dimensions', async () => {
      const mockUri = 'file:///path/to/image.jpg';

      (FileSystem.getInfoAsync as jest.Mock)
        .mockResolvedValueOnce({ size: 2000000 })
        .mockResolvedValueOnce({ size: 150000 });

      (manipulateAsync as jest.Mock).mockResolvedValue({
        uri: 'file:///thumbnail.jpg',
        width: 400,
        height: 400,
      });

      const result = await createThumbnail(mockUri);

      expect(result.width).toBe(400);
      expect(result.height).toBe(400);
      expect(manipulateAsync).toHaveBeenCalledWith(
        mockUri,
        expect.anything(),
        expect.objectContaining({
          compress: 0.7,
        })
      );
    });
  });

  describe('getOptimalCompressionSettings', () => {
    it('should use aggressive compression for large files (>5MB)', async () => {
      const mockUri = 'file:///large.jpg';

      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        size: 6 * 1024 * 1024, // 6MB
      });

      const settings = await getOptimalCompressionSettings(mockUri);

      expect(settings.maxWidth).toBe(1280);
      expect(settings.maxHeight).toBe(1280);
      expect(settings.quality).toBe(0.7);
    });

    it('should use moderate compression for medium files (2-5MB)', async () => {
      const mockUri = 'file:///medium.jpg';

      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        size: 3 * 1024 * 1024, // 3MB
      });

      const settings = await getOptimalCompressionSettings(mockUri);

      expect(settings.maxWidth).toBe(1920);
      expect(settings.maxHeight).toBe(1920);
      expect(settings.quality).toBe(0.75);
    });

    it('should use light compression for small files (<2MB)', async () => {
      const mockUri = 'file:///small.jpg';

      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        size: 1 * 1024 * 1024, // 1MB
      });

      const settings = await getOptimalCompressionSettings(mockUri);

      expect(settings.maxWidth).toBe(2560);
      expect(settings.maxHeight).toBe(2560);
      expect(settings.quality).toBe(0.85);
    });

    it('should handle errors with default settings', async () => {
      const mockUri = 'file:///error.jpg';

      (FileSystem.getInfoAsync as jest.Mock).mockRejectedValue(
        new Error('File error')
      );

      const settings = await getOptimalCompressionSettings(mockUri);

      // Should return default moderate settings
      expect(settings.maxWidth).toBe(1920);
      expect(settings.maxHeight).toBe(1920);
      expect(settings.quality).toBe(0.8);
    });
  });

  describe('smartCompress', () => {
    it('should automatically determine and apply optimal compression', async () => {
      const mockUri = 'file:///auto.jpg';

      (FileSystem.getInfoAsync as jest.Mock)
        .mockResolvedValueOnce({ size: 4 * 1024 * 1024 }) // getOptimalSettings
        .mockResolvedValueOnce({ size: 4 * 1024 * 1024 }) // Original
        .mockResolvedValueOnce({ size: 1.2 * 1024 * 1024 }); // Compressed

      (manipulateAsync as jest.Mock).mockResolvedValue({
        uri: 'file:///smart-compressed.jpg',
        width: 1920,
        height: 1080,
      });

      const result = await smartCompress(mockUri);

      expect(result.compressionRatio).toBeGreaterThan(0);
      expect(result.compressedSize).toBeLessThan(result.originalSize);
    });
  });
});
