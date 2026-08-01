/** Avatar customisation — cosmetics are the main gem sink and chest payout. */

export interface AvatarPart {
  id: string
  label: string
  emoji: string
  cost: number
}

export const AVATAR_BASES: AvatarPart[] = [
  { id: 'rookie', label: 'Rookie', emoji: '🧑‍💻', cost: 0 },
  { id: 'scholar', label: 'Scholar', emoji: '🧑‍🎓', cost: 0 },
  { id: 'ninja', label: 'Code Ninja', emoji: '🥷', cost: 150 },
  { id: 'wizard', label: 'Algorithm Wizard', emoji: '🧙', cost: 300 },
  { id: 'astronaut', label: 'Stack Astronaut', emoji: '🧑‍🚀', cost: 450 },
  { id: 'detective', label: 'Bug Detective', emoji: '🕵️', cost: 600 },
  { id: 'robot', label: 'Sentient Compiler', emoji: '🤖', cost: 900 },
  { id: 'dragon', label: 'Complexity Dragon', emoji: '🐉', cost: 1500 },
]

export const AVATAR_COLORS: AvatarPart[] = [
  { id: 'azure', label: 'Azure', emoji: '🔵', cost: 0 },
  { id: 'ember', label: 'Ember', emoji: '🔴', cost: 100 },
  { id: 'moss', label: 'Moss', emoji: '🟢', cost: 100 },
  { id: 'amethyst', label: 'Amethyst', emoji: '🟣', cost: 250 },
  { id: 'gold', label: 'Gold', emoji: '🟡', cost: 500 },
]

export const COLOR_HEX: Record<string, string> = {
  azure: '#3d7bf7',
  ember: '#f7643d',
  moss: '#22c55e',
  amethyst: '#a855f7',
  gold: '#f5c542',
}

export const AVATAR_AURAS: AvatarPart[] = [
  { id: 'none', label: 'No Aura', emoji: '·', cost: 0 },
  { id: 'ember', label: 'Ember Aura', emoji: '🔥', cost: 400 },
  { id: 'frost', label: 'Frost Aura', emoji: '❄️', cost: 400 },
  { id: 'voltage', label: 'Voltage Aura', emoji: '⚡', cost: 700 },
  { id: 'nebula', label: 'Nebula Aura', emoji: '🌌', cost: 1200 },
]

export const AURA_GLOW: Record<string, string> = {
  none: 'transparent',
  ember: 'rgba(247,100,61,.65)',
  frost: 'rgba(125,211,252,.65)',
  voltage: 'rgba(250,204,21,.7)',
  nebula: 'rgba(168,85,247,.7)',
}

/** Titles unlock from achievements and chests rather than being bought. */
export const TITLES: { id: string; label: string; requires?: string }[] = [
  { id: 'Aspirant', label: 'Aspirant' },
  { id: 'Bug Whisperer', label: 'Bug Whisperer' },
  { id: 'Complexity Slayer', label: 'Complexity Slayer', requires: 'combo-20' },
  { id: 'Query Sommelier', label: 'Query Sommelier' },
  { id: 'Deadlock Breaker', label: 'Deadlock Breaker' },
  { id: 'Offer Magnet', label: 'Offer Magnet', requires: 'boss-5' },
  { id: 'Placement Ready', label: 'Placement Ready', requires: 'all-bosses' },
]

export function partById(list: AvatarPart[], id: string): AvatarPart {
  return list.find((p) => p.id === id) ?? list[0]
}
