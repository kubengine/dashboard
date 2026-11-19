import type { ConsoleUser } from '@/services/IdentityController';

export default (initialState: { currentUser?: ConsoleUser } | undefined) => ({
  admin: initialState?.currentUser?.role === 'platform_admin',
});
