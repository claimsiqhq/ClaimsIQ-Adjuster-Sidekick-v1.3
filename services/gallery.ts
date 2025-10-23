// services/gallery.ts
import { assignMediaToClaim, listMedia, MediaFilters, MediaItem } from '@/services/media';

/**
 * Loads a collection of media items for the gallery, with optional filtering.
 * This function serves as a wrapper around `listMedia`, providing a simple interface for fetching
 * gallery content. It supports pagination through the `limit` parameter and allows for
 * refining the results using various filters.
 *
 * @param {number} [limit=100] - The maximum number of media items to return.
 * @param {MediaFilters} [filters] - An object containing filter criteria, such as media type or claim ID.
 * @returns {Promise<MediaItem[]>} A promise that resolves to an array of media items.
 */
export async function loadGallery(limit = 100, filters?: MediaFilters): Promise<MediaItem[]> {
  return listMedia(limit, filters);
}

/**
 * Assigns a batch of media items to a specific claim.
 * This function is used for bulk operations, allowing multiple photos or videos to be associated
 * with a claim in a single action. Setting `claimId` to `null` can be used to unassign media.
 *
 * @param {string[]} ids - An array of media item IDs to be assigned.
 * @param {string | null} claimId - The ID of the claim to which the media will be assigned, or `null` to unassign.
 * @returns {Promise<void>} A promise that resolves when the assignment is complete.
 */
export async function batchAssign(ids: string[], claimId: string | null) {
  await assignMediaToClaim(ids, claimId);
}
