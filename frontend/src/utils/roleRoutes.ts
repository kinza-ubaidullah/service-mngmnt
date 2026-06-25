export type AppRole = 'ADMIN' | 'CALL_CENTER' | 'TECHNICIAN' | 'WORKSHOP_MANAGER';

export function homePathForRole(role: string | undefined | null): string {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'CALL_CENTER':
      return '/callcenter';
    case 'TECHNICIAN':
      return '/tech';
    case 'WORKSHOP_MANAGER':
      return '/workshop';
    default:
      return '/login';
  }
}

export function canAccessRoute(role: string | undefined | null, allowedRoles: string[]): boolean {
  if (!role) return false;
  return allowedRoles.includes(role);
}
