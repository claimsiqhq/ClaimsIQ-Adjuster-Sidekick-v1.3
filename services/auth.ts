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

// Fallback storage for web platform
const webStorage = {
  getItemAsync: async (key: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  },
  setItemAsync: async (key: string, value: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  },
  deleteItemAsync: async (key: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  }
};

const storage = Platform.OS === 'web' ? webStorage : SecureStore;

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session ?? null;
}

export async function signUpAdmin(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error && !String(error.message).includes('already registered')) throw error;

  const uid = data.user?.id ?? (await getUserIdByEmail(email));
  if (uid) {
    await upsertProfile(uid, { email, display_name: 'Admin', is_admin: true });
  }
  return uid;
}

export async function getUserIdByEmail(email: string): Promise<string | null> {
  const { data, error } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
  if (error) return null;
  return data?.id ?? null;
}

export async function getProfile(uid: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
  if (error) return null;
  return data;
}

export async function upsertProfile(id: string, fields: { email: string; display_name?: string; is_admin?: boolean }) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id, email: fields.email, display_name: fields.display_name ?? null, is_admin: !!fields.is_admin }, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export function onAuthStateChange(cb: () => void) {
  const { data: sub } = supabase.auth.onAuthStateChange((_e, _s) => cb());
  return () => sub.subscription.unsubscribe();
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getDevCreds() {
  const r = await storage.getItemAsync(KEY_REMEMBER);
  if (r !== '1') return { email: DEV_EMAIL, password: DEV_PASS, remember: false };
  const email = (await storage.getItemAsync(KEY_EMAIL)) ?? DEV_EMAIL;
  const password = (await storage.getItemAsync(KEY_PASS)) ?? DEV_PASS;
  return { email, password, remember: true };
}

export async function setDevCreds(email: string, password: string, remember: boolean) {
  if (remember) {
    await storage.setItemAsync(KEY_EMAIL, email);
    await storage.setItemAsync(KEY_PASS, password);
    await storage.setItemAsync(KEY_REMEMBER, '1');
  } else {
    await storage.deleteItemAsync(KEY_EMAIL);
    await storage.deleteItemAsync(KEY_PASS);
    await storage.deleteItemAsync(KEY_REMEMBER);
  }
}
