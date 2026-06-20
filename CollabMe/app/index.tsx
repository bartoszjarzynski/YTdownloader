import { Redirect } from 'expo-router';

/**
 * Entry route. The guard in the root layout owns the real redirect logic;
 * this just points new launches at a sensible default.
 */
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
