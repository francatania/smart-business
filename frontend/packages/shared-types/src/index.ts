export type EntityId = string;
export type IsoDate = string;
export type IsoDateTime = string;

export const platformRoles = [
  'customer',
  'professional',
  'business-admin',
  'platform-admin',
] as const;

export type PlatformRole = (typeof platformRoles)[number];
