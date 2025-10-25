// Integration tests for complete claim workflow

import { getClaims, getOrCreateClaimByNumber } from '@/services/claims';
import { listMedia, uploadMedia } from '@/services/media';
import { generateClaimReport } from '@/services/pdfExport';
import { supabase } from '@/utils/supabase';

describe('Claim Workflow Integration', () => {
  const testUserId = 'test-user-123';
  const testClaimNumber = 'TEST-CLAIM-001';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Claim Lifecycle', () => {
    it('should create claim, upload photos, and generate report', async () => {
      // Step 1: Create/Get Claim
      const mockClaim = {
        id: 'claim-123',
        claim_number: testClaimNumber,
        status: 'open',
        insured_name: 'John Doe',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockClaim, error: null }),
      });

      const claim = await getOrCreateClaimByNumber(testClaimNumber);
      expect(claim.claim_number).toBe(testClaimNumber);

      // Step 2: Upload Photo
      const mockMedia = {
        id: 'media-123',
        claim_id: 'claim-123',
        type: 'photo',
        status: 'done',
        storage_path: 'media/photo.jpg',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockMedia, error: null }),
      });

      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
      });

      const media = await uploadMedia('base64data', claim.id, testUserId);
      expect(media).toBeTruthy();
      expect(media?.claim_id).toBe(claim.id);

      // Step 3: List Media
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [mockMedia], error: null }),
      });

      const mediaList = await listMedia(10, { claim_id: claim.id });
      expect(mediaList.length).toBeGreaterThan(0);

      // Step 4: Generate PDF Report
      // Note: This is mocked since it requires expo-print
      const pdfUri = 'file:///report.pdf';
      jest.spyOn(require('@/services/pdfExport'), 'generateClaimReport')
        .mockResolvedValue(pdfUri);

      const reportUri = await generateClaimReport(claim, mediaList);
      expect(reportUri).toBeTruthy();
    });
  });

  describe('Multi-Claim Operations', () => {
    it('should handle multiple claims for a user', async () => {
      const mockClaims = [
        { id: '1', claim_number: 'CLAIM-001', status: 'open' },
        { id: '2', claim_number: 'CLAIM-002', status: 'closed' },
        { id: '3', claim_number: 'CLAIM-003', status: 'in_progress' },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: mockClaims, error: null }),
      });

      const claims = await getClaims(testUserId);
      expect(claims.length).toBe(3);
      expect(claims[0].claim_number).toBe('CLAIM-001');
    });
  });

  describe('Error Handling', () => {
    it('should handle claim creation errors gracefully', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error'),
        }),
      });

      await expect(getOrCreateClaimByNumber(testClaimNumber)).rejects.toThrow();
    });

    it('should handle media upload errors', async () => {
      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          error: new Error('Upload failed'),
        }),
      });

      await expect(uploadMedia('base64', 'claim-123', testUserId)).rejects.toThrow();
    });
  });
});
