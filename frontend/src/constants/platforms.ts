export const SOCIAL_PLATFORMS = {
  LINKEDIN: 'LINKEDIN',
  INSTAGRAM: 'INSTAGRAM',
  X: 'X',
  FACEBOOK: 'FACEBOOK',
} as const;

export type PlatformKey = (typeof SOCIAL_PLATFORMS)[keyof typeof SOCIAL_PLATFORMS];

export const ALL_PLATFORMS: PlatformKey[] = [
  SOCIAL_PLATFORMS.LINKEDIN,
  SOCIAL_PLATFORMS.INSTAGRAM,
  SOCIAL_PLATFORMS.X,
  SOCIAL_PLATFORMS.FACEBOOK,
];

export const DEFAULT_ALLOWED_PLATFORMS: PlatformKey[] = [
  SOCIAL_PLATFORMS.LINKEDIN,
];

export const SUPER_ADMIN_PLATFORMS: PlatformKey[] = ALL_PLATFORMS;

export interface PlatformMetadata {
  id: PlatformKey;
  name: string;
  label: string;
  shortLabel: string;
  badge: string;
  color: string;
  desc: string;
}

export const PLATFORM_REGISTRY: Record<PlatformKey, PlatformMetadata> = {
  [SOCIAL_PLATFORMS.LINKEDIN]: {
    id: SOCIAL_PLATFORMS.LINKEDIN,
    name: 'LinkedIn',
    label: 'LinkedIn (Profile & Pages)',
    shortLabel: 'LinkedIn',
    badge: '¯  LinkedIn',
    color: 'from-sky-600 to-blue-700 shadow-blue-900/30',
    desc: 'Publish text, carousel decks, and native image assets to your personal profile or company pages.',
  },
  [SOCIAL_PLATFORMS.INSTAGRAM]: {
    id: SOCIAL_PLATFORMS.INSTAGRAM,
    name: 'Instagram',
    label: 'Instagram (Business)',
    shortLabel: 'Instagram',
    badge: '📾 Instagram',
    color: 'from-pink-500 via-rose-500 to-amber-500 shadow-rose-900/30',
    desc: 'Auto-publish single images, carousels, and reels with engagement hashtags.',
  },
  [SOCIAL_PLATFORMS.X]: {
    id: SOCIAL_PLATFORMS.X,
    name: 'X (Twitter)',
    label: 'X (Twitter)',
    shortLabel: 'X',
    badge: '🐦 X (Twitter)',
    color: 'from-zinc-800 to-black shadow-zinc-900/30',
    desc: 'Broadcast real-time concise thoughts, trends, and hashtags under 280 characters.',
  },
  [SOCIAL_PLATFORMS.FACEBOOK]: {
    id: SOCIAL_PLATFORMS.FACEBOOK,
    name: 'Facebook Page',
    label: 'Facebook Business Page',
    shortLabel: 'Facebook',
    badge: '📘 Facebook',
    color: 'from-blue-600 to-blue-800 shadow-blue-900/30',
    desc: 'Publish posts, photos, and video updates directly to your managed Facebook Pages.',
  },
};
