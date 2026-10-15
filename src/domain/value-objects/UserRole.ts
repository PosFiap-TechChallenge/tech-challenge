export const USER_ROLES = ['ADMIN', 'ATTENDANT', 'MECHANIC'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const UserRole = {
  ADMIN: 'ADMIN',
  ATTENDANT: 'ATTENDANT',
  MECHANIC: 'MECHANIC',
} as const satisfies Record<UserRole, UserRole>;

export function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}
