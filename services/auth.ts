// services/auth.ts
import { supabase } from '@/utils/supabase';
import * as SecureStore from 'expo-secure-store';

const DEV_EMAIL = 'john@claimsiq.ai';
const DEV_PASS = 'admin123';

const KEY_EMAIL = 'dev_email';
const KEY_PASS = 'dev_pass';
const KEY_REMEMBER = 'dev_remember';

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

export async function getUserIdByEmail(email: string) {
  const { data, error } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
  if (error) return null;
  return (data?.id as string) ?? null;
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
  const r = await SecureStore.getItemAsync(KEY_REMEMBER);
  if (r !== '1') return { email: DEV_EMAIL, password: DEV_PASS, remember: false };
  const email = (await SecureStore.getItemAsync(KEY_EMAIL)) ?? DEV_EMAIL;
  const password = (await SecureStore.getItemAsync(KEY_PASS)) ?? DEV_PASS;
  return { email, password, remember: true };
}

export async function setDevCreds(email: string, password: string, remember: boolean) {
  if (remember) {
    await SecureStore.setItemAsync(KEY_EMAIL, email);
    await SecureStore.setItemAsync(KEY_PASS, password);
    await SecureStore.setItemAsync(KEY_REMEMBER, '1');
  } else {
    await SecureStore.deleteItemAsync(KEY_EMAIL);
    await SecureStore.deleteItemAsync(KEY_PASS);
    await SecureStore.deleteItemAsync(KEY_REMEMBER);
  }
}
