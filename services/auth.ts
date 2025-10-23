// services/auth.ts
import { Platform } from 'react-native';
import { supabase } from '@/utils/supabase';
import * as SecureStore from 'expo-secure-store';

// Use environment variables for dev credentials (never commit actual credentials to repo)
const DEV_EMAIL = process.env.EXPO_PUBLIC_DEV_EMAIL || '';
const DEV_PASS = process.env.EXPO_PUBLIC_DEV_PASSWORD || '';

const KEY_EMAIL = 'dev_email';
const KEY_PASS = 'dev_pass';
const KEY_REMEMBER = 'dev_remember';

/**
 * Signs in a user with their email and password.
 * @param {string} email - The user's email address.
 * @param {string} password - The user's password.
 * @returns {Promise<Session | null>} A promise that resolves with the user's session if successful, otherwise null.
 * @throws {Error} Throws an error if the sign-in attempt fails.
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session ?? null;
}

/**
 * Signs up a new admin user and creates a corresponding profile.
 * If the user is already registered, it retrieves the user's ID and ensures the profile is set to admin.
 * @param {string} email - The new admin's email address.
 * @param {string} password - The new admin's password.
 * @returns {Promise<string | undefined>} A promise that resolves with the new user's ID.
 * @throws {Error} Throws an error if the sign-up fails for reasons other than the user already being registered.
 */
export async function signUpAdmin(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error && !String(error.message).includes('already registered')) throw error;

  const uid = data.user?.id ?? (await getUserIdByEmail(email));
  if (uid) {
    await upsertProfile(uid, { email, display_name: 'Admin', is_admin: true });
  }
  return uid;
}

/**
 * Retrieves a user's ID based on their email address.
 * @param {string} email - The email address to look up.
 * @returns {Promise<string | null>} A promise that resolves with the user's ID, or null if not found or an error occurs.
 */
export async function getUserIdByEmail(email: string): Promise<string | null> {
  const { data, error } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
  if (error) return null;
  return data?.id ?? null;
}

/**
 * Retrieves a user's profile data.
 * @param {string} uid - The unique identifier of the user.
 * @returns {Promise<any | null>} A promise that resolves with the user's profile data, or null if not found or an error occurs.
 */
export async function getProfile(uid: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
  if (error) return null;
  return data;
}

/**
 * Creates or updates a user's profile.
 * @param {string} id - The user's unique identifier.
 * @param {object} fields - The profile fields to update.
 * @param {string} fields.email - The user's email address.
 * @param {string} [fields.display_name] - The user's display name.
 * @param {boolean} [fields.is_admin] - Whether the user has admin privileges.
 * @returns {Promise<any>} A promise that resolves with the updated profile data.
 * @throws {Error} Throws an error if the upsert operation fails.
 */
export async function upsertProfile(id: string, fields: { email: string; display_name?: string; is_admin?: boolean }) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id, email: fields.email, display_name: fields.display_name ?? null, is_admin: !!fields.is_admin }, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Retrieves the current user's session.
 * @returns {Promise<Session | null>} A promise that resolves with the current session, or null if no active session exists.
 */
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

/**
 * Subscribes to authentication state changes.
 * @param {() => void} cb - The callback function to execute when the auth state changes.
 * @returns {() => void} A function that can be called to unsubscribe from the auth state changes.
 */
export function onAuthStateChange(cb: () => void) {
  const { data: sub } = supabase.auth.onAuthStateChange((_e, _s) => cb());
  return () => sub.subscription.unsubscribe();
}

/**
 * Signs out the currently authenticated user.
 * @returns {Promise<void>}
 */
export async function signOut() {
  await supabase.auth.signOut();
}

/**
 * Retrieves development credentials.
 * In development builds on iOS, it attempts to retrieve credentials from SecureStore.
 * If SecureStore is unavailable or no credentials are saved, it falls back to environment variables.
 * @returns {Promise<{email: string, password: string, remember: boolean}>} A promise that resolves with the development credentials.
 */
export async function getDevCreds() {
  try {
    // SecureStore may not be available in development builds
    if (Platform.OS === 'ios') {
      const r = await SecureStore.getItemAsync(KEY_REMEMBER).catch(() => null);
      if (r !== '1') return { email: DEV_EMAIL, password: DEV_PASS, remember: false };
      const email = (await SecureStore.getItemAsync(KEY_EMAIL).catch(() => null)) ?? DEV_EMAIL;
      const password = (await SecureStore.getItemAsync(KEY_PASS).catch(() => null)) ?? DEV_PASS;
      return { email, password, remember: true };
    }
  } catch (error) {
    console.log('SecureStore not available, using defaults');
  }
  return { email: DEV_EMAIL, password: DEV_PASS, remember: false };
}

/**
 * Sets or clears development credentials in SecureStore on iOS.
 * @param {string} email - The developer's email address.
 * @param {string} password - The developer's password.
 * @param {boolean} remember - Whether to store the credentials for future sessions.
 * @returns {Promise<void>}
 */
export async function setDevCreds(email: string, password: string, remember: boolean) {
  try {
    if (Platform.OS === 'ios') {
      if (remember) {
        await SecureStore.setItemAsync(KEY_EMAIL, email).catch(() => {});
        await SecureStore.setItemAsync(KEY_PASS, password).catch(() => {});
        await SecureStore.setItemAsync(KEY_REMEMBER, '1').catch(() => {});
      } else {
        await SecureStore.deleteItemAsync(KEY_EMAIL).catch(() => {});
        await SecureStore.deleteItemAsync(KEY_PASS).catch(() => {});
        await SecureStore.deleteItemAsync(KEY_REMEMBER).catch(() => {});
      }
    }
  } catch (error) {
    console.log('SecureStore not available for saving credentials');
  }
}
