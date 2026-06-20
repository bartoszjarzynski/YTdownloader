/**
 * Authentication service.
 *
 * This is the single seam between the app and "the backend". Today it is
 * implemented on top of local device storage so the app is fully runnable
 * with zero external setup. When you are ready for a real backend, replace
 * the body of these functions with calls to Supabase / Firebase / your API
 * — the rest of the app (AuthContext, screens) never needs to change.
 */
import type {
  AuthSession,
  LoginInput,
  RegisterInput,
  User,
} from '@/types';
import { StorageKeys, getItem, removeItem, setItem } from './storage';

/** Internal record shape — includes the password, which never leaves storage. */
interface StoredUser extends User {
  password: string;
}

/** Simulated network latency so loading states are visible during dev. */
const FAKE_LATENCY_MS = 600;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeId(): string {
  return `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeToken(userId: string): string {
  return `tok_${userId}_${Math.random().toString(36).slice(2)}`;
}

/** Strip the password before exposing a user to the rest of the app. */
function toPublicUser(stored: StoredUser): User {
  const { password: _password, ...user } = stored;
  return user;
}

async function readUsers(): Promise<StoredUser[]> {
  return (await getItem<StoredUser[]>(StorageKeys.users)) ?? [];
}

async function writeUsers(users: StoredUser[]): Promise<void> {
  await setItem(StorageKeys.users, users);
}

export const authService = {
  /** Register a new account and start a session. */
  async register(input: RegisterInput): Promise<AuthSession> {
    await delay(FAKE_LATENCY_MS);

    const email = input.email.trim().toLowerCase();
    const users = await readUsers();

    if (users.some((u) => u.email === email)) {
      throw new Error('An account with this email already exists.');
    }

    const stored: StoredUser = {
      id: makeId(),
      name: input.name.trim(),
      email,
      password: input.password,
      interests: [],
      createdAt: new Date().toISOString(),
    };

    await writeUsers([...users, stored]);

    const session: AuthSession = {
      user: toPublicUser(stored),
      token: makeToken(stored.id),
    };
    await setItem(StorageKeys.session, session);
    return session;
  },

  /** Authenticate an existing account and start a session. */
  async login(input: LoginInput): Promise<AuthSession> {
    await delay(FAKE_LATENCY_MS);

    const email = input.email.trim().toLowerCase();
    const users = await readUsers();
    const match = users.find((u) => u.email === email);

    if (!match || match.password !== input.password) {
      throw new Error('Incorrect email or password.');
    }

    const session: AuthSession = {
      user: toPublicUser(match),
      token: makeToken(match.id),
    };
    await setItem(StorageKeys.session, session);
    return session;
  },

  /** Clear the active session. */
  async logout(): Promise<void> {
    await removeItem(StorageKeys.session);
  },

  /** Restore a persisted session on app launch, if any. */
  async getSession(): Promise<AuthSession | null> {
    return getItem<AuthSession>(StorageKeys.session);
  },
};
