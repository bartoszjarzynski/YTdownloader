/**
 * Shared domain types for CollabMe.
 */

export type ActivityCategory =
  | 'gaming'
  | 'sports'
  | 'fitness'
  | 'outdoors'
  | 'social';

export interface User {
  id: string;
  name: string;
  email: string;
  /** Optional avatar URL. */
  avatarUrl?: string;
  /** Short user bio shown on the profile screen. */
  bio?: string;
  /** Activity categories the user is interested in. */
  interests: ActivityCategory[];
  createdAt: string;
}

/** Payload required to register a new account. */
export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

/** Payload required to authenticate. */
export interface LoginInput {
  email: string;
  password: string;
}

/** Result returned by the auth service after a successful auth call. */
export interface AuthSession {
  user: User;
  token: string;
}
