export type PlatformId = string;

export interface PlatformDefinition {
  id: PlatformId;
  label: string;
  shortLabel: string;
  description: string;
  accentClass: string;
  badgeClass: string;
  characterLimit?: number;
  requiresMedia?: boolean;
}

export const PLATFORM_REGISTRY: PlatformDefinition[] = [
  {
    id: 'LINKEDIN',
    label: 'LinkedIn',
    shortLabel: 'in',
    description: 'Professional updates, thought leadership, and B2B conversations.',
    accentClass: 'text-blue-400',
    badgeClass: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
  },
  {
    id: 'X',
    label: 'X',
    shortLabel: 'X',
    description: 'Fast, concise updates built for timely conversations and trends.',
    accentClass: 'text-slate-200',
    badgeClass: 'bg-slate-700/30 text-slate-300 border-slate-600/40',
    characterLimit: 280,
  },
  {
    id: 'INSTAGRAM',
    label: 'Instagram',
    shortLabel: 'IG',
    description: 'Visual-first feed posts and reels with engaging captions.',
    accentClass: 'text-pink-400',
    badgeClass: 'bg-pink-600/20 text-pink-400 border-pink-500/30',
    requiresMedia: true,
  },
  {
    id: 'FACEBOOK',
    label: 'Facebook Page',
    shortLabel: 'f',
    description: 'Community-focused Page updates, photos, and video posts.',
    accentClass: 'text-blue-300',
    badgeClass: 'bg-blue-600/20 text-blue-300 border-blue-500/30',
  },
];

export const DEFAULT_COMPOSER_PLATFORMS: PlatformId[] = ['LINKEDIN'];
export const DEFAULT_SCHEDULE_PLATFORMS: PlatformId[] = ['LINKEDIN'];

const platformById = new Map(
  PLATFORM_REGISTRY.map((platform) => [platform.id, platform])
);

function humanizePlatformId(platformId: PlatformId) {
  return platformId
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function getPlatformDefinition(platformId: PlatformId): PlatformDefinition {
  const normalizedId = platformId.toUpperCase();
  const configuredPlatform = platformById.get(normalizedId);

  if (configuredPlatform) {
    return configuredPlatform;
  }

  return {
    id: normalizedId,
    label: humanizePlatformId(normalizedId),
    shortLabel: normalizedId.slice(0, 2),
    description: 'A connected publishing channel.',
    accentClass: 'text-violet-300',
    badgeClass: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
  };
}

export function getPlatformDefinitions(platformIds?: PlatformId[]) {
  const ids = platformIds?.length
    ? platformIds.map((platformId) => platformId.toUpperCase())
    : PLATFORM_REGISTRY.map((platform) => platform.id);

  return ids.map(getPlatformDefinition);
}
