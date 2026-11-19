import type { ConsoleUser } from '@/services/IdentityController';
import { useModel } from '@umijs/max';

export const clusterKinds = new Set([
  'node',
  'namespace',
  'persistentvolume',
  'storageclass',
  'ingressclass',
]);
export function hasPermission(
  user: ConsoleUser | undefined,
  action: string,
  namespace?: string,
) {
  if (!user?.enabled) return false;
  if (user.role === 'platform_admin') return true;
  if (namespace && !user.namespaces.includes(namespace)) return false;
  return user.permissions?.includes(action) || false;
}
export function usePermissions() {
  const { initialState } = useModel('@@initialState');
  const user = initialState?.currentUser;
  return {
    user,
    admin: user?.role === 'platform_admin',
    can: (action: string, namespace?: string) =>
      hasPermission(user, action, namespace),
  };
}
