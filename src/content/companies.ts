import type { Company } from '../game/types'

/**
 * Boss interviews. Each company is a locked door with a level requirement —
 * the single strongest pull in the game, because the names are aspirational and
 * the progress bar toward them is always visible.
 */
export const COMPANIES: Company[] = [
  {
    id: 'seedling',
    name: 'Seedling Labs',
    icon: '🌱',
    tier: 'startup',
    unlockLevel: 2,
    focus: ['python', 'aptitude'],
    hp: 5,
    timer: 60,
    persona:
      'A friendly founding engineer at a 12-person startup. Warm, curious, values scrappiness over polish. Asks practical questions and cares more about how you think than whether you memorised syntax.',
    rewardGems: 60,
    rewardXp: 180,
  },
  {
    id: 'infosys',
    name: 'Corevance Systems',
    icon: '🏢',
    tier: 'service',
    unlockLevel: 4,
    focus: ['aptitude', 'python', 'sql'],
    hp: 6,
    timer: 45,
    persona:
      'A campus-hiring panelist at a large IT services firm. Structured, checklist-driven, moves briskly through fundamentals. Rewards clear, textbook-correct answers and good communication.',
    rewardGems: 90,
    rewardXp: 260,
  },
  {
    id: 'fintrust',
    name: 'FinTrust Capital',
    icon: '💹',
    tier: 'product',
    unlockLevel: 7,
    focus: ['dsa', 'sql', 'dbms'],
    hp: 7,
    timer: 40,
    persona:
      'A quant-adjacent backend engineer at a trading firm. Precise, fast, allergic to hand-waving. Will interrupt to ask for the complexity of anything you propose.',
    rewardGems: 130,
    rewardXp: 360,
  },
  {
    id: 'codeclash',
    name: 'CodeClash Global',
    icon: '🏁',
    tier: 'product',
    unlockLevel: 8,
    focus: ['cpp', 'dsa'],
    hp: 8,
    timer: 30,
    persona:
      'A competitive-programming judge running an onsite contest round. Cares about one thing: does your solution fit inside the time limit. Will ask for the complexity before you have finished describing the approach, and considers "it works on the samples" to be no evidence at all.',
    rewardGems: 150,
    rewardXp: 400,
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    icon: '🪟',
    tier: 'faang',
    unlockLevel: 10,
    focus: ['dsa', 'os', 'python', 'cpp'],
    hp: 8,
    timer: 40,
    persona:
      'A senior SDE running a standard loop round. Collaborative and calm — nudges you toward the insight rather than watching you drown, but expects you to reason out loud and handle edge cases unprompted.',
    rewardGems: 180,
    rewardXp: 500,
  },
  {
    id: 'amazon',
    name: 'Amazon',
    icon: '📦',
    tier: 'faang',
    unlockLevel: 14,
    focus: ['dsa', 'dbms', 'hr'],
    hp: 9,
    timer: 35,
    persona:
      'A bar-raiser. Splits time between a hard algorithmic question and Leadership Principles, and will always dig one layer deeper than your first answer with "and what was the result?"',
    rewardGems: 240,
    rewardXp: 650,
  },
  {
    id: 'google',
    name: 'Google',
    icon: '🔷',
    tier: 'faang',
    unlockLevel: 18,
    focus: ['dsa', 'cpp', 'os', 'networking'],
    hp: 10,
    timer: 35,
    persona:
      'An L5 engineer running a coding round. Deeply interested in the optimal solution and its trade-offs. Silence is fine with them; a wrong complexity claim is not.',
    rewardGems: 320,
    rewardXp: 850,
  },
  {
    id: 'netflix',
    name: 'Streamforge',
    icon: '🎬',
    tier: 'faang',
    unlockLevel: 24,
    focus: ['dsa', 'cpp', 'networking', 'dbms', 'os'],
    hp: 12,
    timer: 30,
    persona:
      'A staff engineer at a high-scale streaming company. Asks systems-flavoured questions with no clean answer and evaluates how you reason about trade-offs at scale under real constraints.',
    rewardGems: 450,
    rewardXp: 1200,
  },
]

export const COMPANY_BY_ID = Object.fromEntries(COMPANIES.map((c) => [c.id, c]))

export const TIER_LABEL: Record<Company['tier'], string> = {
  startup: 'Startup',
  service: 'Service Giant',
  product: 'Product Firm',
  faang: 'Tier-1',
}

export const TIER_COLOR: Record<Company['tier'], string> = {
  startup: '#4ade80',
  service: '#7db8ff',
  product: '#c58cff',
  faang: '#ffcc4d',
}
