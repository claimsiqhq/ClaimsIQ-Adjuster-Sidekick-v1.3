// Image compression utility for optimizing photo uploads

import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png';
}

export interface CompressionResult {
  uri: string;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * Compresses an image to reduce file size while maintaining quality.
 * Uses expo-image-manipulator for resizing and quality adjustment.
 *
 * @param uri - The local URI of the image to compress
 * @param options - Compression options (maxWidth, maxHeight, quality, format)
 * @returns Compression result including new URI and size statistics
 *
 * @example
 * ```typescript
 * const result = await compressImage(photoUri, {
 *   maxWidth: 1920,
 *   maxHeight: 1920,
 *   quality: 0.8
 * });
 * console.log(`Reduced size by ${result.compressionRatio}%`);
 * ```
 */
export async function compressImage(
  uri: string,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    format = 'jpeg',
  } = options;

  try {
    // Get original file size
    const fileInfo = await FileSystem.getInfoAsync(uri);
    const originalSize = fileInfo.size || 0;

    // Manipulate image (resize + compress)
    const manipulateResult = await manipulateAsync(
      uri,
      [
        {
          resize: {
            width: maxWidth,
            height: maxHeight,
          },
        },
      ],
      {
        compress: quality,
        format: format === 'jpeg' ? SaveFormat.JPEG : SaveFormat.PNG,
      }
    );

    // Get compressed file size
    const compressedInfo = await FileSystem.getInfoAsync(manipulateResult.uri);
    const compressedSize = compressedInfo.size || 0;

    // Calculate compression ratio
    const compressionRatio =
      originalSize > 0
        ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
        : 0;

    return {
      uri: manipulateResult.uri,
      width: manipulateResult.width,
      height: manipulateResult.height,
      originalSize,
      compressedSize,
      compressionRatio,
    };
  } catch (error) {
    console.error('Image compression failed:', error);
    throw error;
  }
}

/**
 * Compresses an image specifically for thumbnail generation.
 * Uses smaller dimensions and lower quality for faster loading.
 *
 * @param uri - The local URI of the image
 * @returns Compression result with thumbnail URI
 */
export async function createThumbnail(uri: string): Promise<CompressionResult> {
  return compressImage(uri, {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.7,
    format: 'jpeg',
  });
}

/**
 * Determines the optimal compression settings based on file size.
 * Larger files get more aggressive compression.
 *
 * @param uri - The local URI of the image
 * @returns Recommended compression options
 */
export async function getOptimalCompressionSettings(
  uri: string
): Promise<CompressionOptions> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    const size = fileInfo.size || 0;
    const sizeMB = size / (1024 * 1024);

    // Aggressive compression for files > 5MB
    if (sizeMB > 5) {
      return {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.7,
        format: 'jpeg',
      };
    }

    // Moderate compression for files 2-5MB
    if (sizeMB > 2) {
      return {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.75,
        format: 'jpeg',
      };
    }

    // Light compression for files < 2MB
    return {
      maxWidth: 2560,
      maxHeight: 2560,
      quality: 0.85,
      format: 'jpeg',
    };
  } catch (error) {
    console.error('Failed to determine compression settings:', error);
    // Default to moderate compression
    return {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.8,
      format: 'jpeg',
    };
  }
}

/**
 * Batch compresses multiple images.
 *
 * @param uris - Array of image URIs to compress
 * @param options - Compression options
 * @returns Array of compression results
 */
export async function compressImages(
  uris: string[],
  options: CompressionOptions = {}
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = [];

  for (const uri of uris) {
    try {
      const result = await compressImage(uri, options);
      results.push(result);
    } catch (error) {
      console.error(`Failed to compress image: ${uri}`, error);
      // Skip failed images
    }
  }

  return results;
}

/**
 * Smart compression that automatically chooses optimal settings.
 *
 * @param uri - The local URI of the image
 * @returns Compression result
 */
export async function smartCompress(uri: string): Promise<CompressionResult> {
  const settings = await getOptimalCompressionSettings(uri);
  return compressImage(uri, settings);
}
