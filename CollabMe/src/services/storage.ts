/**
 * Thin wrapper around AsyncStorage with JSON (de)serialization.
 *
 * Centralizing persistence here means we can swap the backing store
 * (e.g. expo-secure-store for tokens) without touching call sites.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageKeys = {
  session: 'collabme.session',
  users: 'collabme.users',
} as const;

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}
