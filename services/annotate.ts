import { supabase } from '@/utils/supabase';
/**
 * Invokes the 'vision-annotate' Supabase Edge Function to process and annotate a media file.
 *
 * This function sends a request to the backend to analyze a media file (image or video)
 * identified by its ID. The analysis can be guided by providing an optional path to the
 * media file and a list of scene tags. The backend function then performs the annotation
 * process, such as identifying objects or generating descriptions.
 *
 * @param {string} mediaId - The unique identifier of the media file to be annotated.
 * @param {string} [path] - Optional. The storage path of the media file. If not provided,
 *                          the backend may use a default or pre-configured path.
 * @param {string[]} [sceneTags] - Optional. An array of tags or keywords that describe the
 *                                 scene, used to guide the annotation process.
 * @returns {Promise<{ ok: boolean; anno_count?: number; error?: string }>}
 *           A promise that resolves to an object indicating the outcome of the annotation.
 *           - `ok`: A boolean that is `true` if the annotation was successful, `false` otherwise.
 *           - `anno_count`: The number of annotations generated.
 *           - `error`: A string containing an error message if the annotation failed.
 * @throws {Error} Throws an error if the Supabase function invocation fails.
 */
export async function invokeAnnotation(mediaId: string, path?: string, sceneTags?: string[]) {
  const { data, error } = await supabase.functions.invoke('vision-annotate', { body: { mediaId, path: path ?? null, sceneTags: sceneTags ?? [] } });
  if (error) throw error;
  return data as { ok: boolean; anno_count?: number; error?: string };
}
