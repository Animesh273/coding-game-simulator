import type { World } from '../game/types'

/**
 * The eight learning worlds. Each is a small skill tree — nodes unlock left to
 * right as mastery accumulates, so a student always has a visible "next thing".
 *
 * Authored grouped by subject; exported sorted by unlock level (see below).
 */
const WORLD_DEFS: World[] = [
  {
    id: 'python',
    name: 'Python World',
    subtitle: 'The development track',
    icon: '🐍',
    hue: ['#3d7bf7', '#4fd1c5'],
    unlockLevel: 1,
    lore: 'A lush valley of readable code, where software actually ships. The natives speak in list comprehensions and judge you on your indentation.',
    focus: 'development',
    skills: [
      { id: 'py.basics', world: 'python', name: 'Core Syntax', icon: '🌱', blurb: 'Types, truthiness, operators, and the things that trip up every fresher.', requires: [], x: 0, y: 1, tier: 0 },
      { id: 'py.collections', world: 'python', name: 'Collections', icon: '🧺', blurb: 'Lists, dicts, sets, tuples — and knowing which one the interviewer wants.', requires: ['py.basics'], x: 1, y: 0, tier: 1 },
      { id: 'py.strings', world: 'python', name: 'String Craft', icon: '🪢', blurb: 'Slicing, formatting, and the immutability gotchas.', requires: ['py.basics'], x: 1, y: 2, tier: 1 },
      { id: 'py.functions', world: 'python', name: 'Functions & Scope', icon: '⚙️', blurb: 'Default args, closures, *args, and the mutable-default trap.', requires: ['py.collections'], x: 2, y: 0, tier: 2 },
      { id: 'py.oop', world: 'python', name: 'Objects', icon: '🏛️', blurb: 'Classes, dunder methods, inheritance and MRO.', requires: ['py.functions'], x: 3, y: 1, tier: 3 },
      { id: 'py.advanced', world: 'python', name: 'Pythonic Power', icon: '✨', blurb: 'Comprehensions, generators, decorators, context managers.', requires: ['py.functions', 'py.strings'], x: 3, y: 3, tier: 3 },
      { id: 'py.dev', world: 'python', name: 'Shipping Code', icon: '🚢', blurb: 'Exceptions, modules, virtual envs, testing — the parts of Python that only show up in a real codebase.', requires: ['py.oop', 'py.advanced'], x: 4, y: 2, tier: 4 },
    ],
  },
  {
    id: 'cpp',
    name: 'C++ Arena',
    subtitle: 'The competitive programming track',
    icon: '⚡',
    hue: ['#f43f5e', '#f59e0b'],
    unlockLevel: 2,
    lore: 'A floodlit coliseum where the clock is always running and the compiler shows no mercy. Every millisecond of the time limit is contested ground.',
    focus: 'competitive',
    skills: [
      { id: 'cpp.basics', world: 'cpp', name: 'Syntax & Fast I/O', icon: '⌨️', blurb: 'Types, overflow, and reading a million integers before the time limit.', requires: [], x: 0, y: 1, tier: 0 },
      { id: 'cpp.stl', world: 'cpp', name: 'STL Containers', icon: '📦', blurb: 'vector, map, set, priority_queue — and the complexity of each.', requires: ['cpp.basics'], x: 1, y: 0, tier: 1 },
      { id: 'cpp.algos', world: 'cpp', name: 'STL Algorithms', icon: '🧮', blurb: 'sort, lower_bound, next_permutation — the library that writes half your solution.', requires: ['cpp.basics'], x: 1, y: 2, tier: 1 },
      { id: 'cpp.memory', world: 'cpp', name: 'Memory & References', icon: '🧷', blurb: 'Pointers, references, iterator invalidation, and the pass-by-value trap that TLEs you.', requires: ['cpp.stl'], x: 2, y: 0, tier: 2 },
      { id: 'cpp.modern', world: 'cpp', name: 'Modern C++', icon: '🛠️', blurb: 'auto, range-for, lambdas, move semantics.', requires: ['cpp.algos'], x: 2, y: 2, tier: 2 },
      { id: 'cpp.cp', world: 'cpp', name: 'Contest Craft', icon: '🏁', blurb: 'Bitmasks, modular arithmetic, prefix sums, and knowing what fits in the time limit.', requires: ['cpp.memory', 'cpp.modern'], x: 3, y: 1, tier: 3 },
    ],
  },
  {
    id: 'dsa',
    name: 'DSA Kingdom',
    subtitle: 'The realm every offer runs through',
    icon: '⚔️',
    hue: ['#f7643d', '#ffb03d'],
    unlockLevel: 2,
    lore: 'A fortress of nested loops. Its gatekeepers ask only one question: can you do better than O(n²)?',
    focus: 'fundamentals',
    skills: [
      { id: 'dsa.complexity', world: 'dsa', name: 'Big-O Sight', icon: '📈', blurb: 'Read a loop and name its cost without flinching.', requires: [], x: 0, y: 1, tier: 0 },
      { id: 'dsa.arrays', world: 'dsa', name: 'Arrays & Two Pointers', icon: '📊', blurb: 'Sliding windows, prefix sums, in-place tricks.', requires: ['dsa.complexity'], x: 1, y: 0, tier: 1 },
      { id: 'dsa.hashing', world: 'dsa', name: 'Hashing', icon: '🔑', blurb: 'The O(1) lookup that rescues half of all interview questions.', requires: ['dsa.complexity'], x: 1, y: 2, tier: 1 },
      { id: 'dsa.linked', world: 'dsa', name: 'Linked Structures', icon: '🔗', blurb: 'Lists, stacks, queues, and pointer surgery.', requires: ['dsa.arrays'], x: 2, y: 0, tier: 2 },
      { id: 'dsa.trees', world: 'dsa', name: 'Trees & Heaps', icon: '🌳', blurb: 'Traversals, BSTs, priority queues.', requires: ['dsa.linked', 'dsa.hashing'], x: 3, y: 1, tier: 3 },
      { id: 'dsa.graphs', world: 'dsa', name: 'Graphs', icon: '🕸️', blurb: 'BFS, DFS, topological order, shortest paths.', requires: ['dsa.trees'], x: 4, y: 0, tier: 4 },
      { id: 'dsa.dp', world: 'dsa', name: 'Dynamic Programming', icon: '🧩', blurb: 'Overlapping subproblems, memoisation, tabulation.', requires: ['dsa.trees'], x: 4, y: 2, tier: 4 },
    ],
  },
  {
    id: 'sql',
    name: 'SQL City',
    subtitle: 'Every answer is a query away',
    icon: '🗄️',
    hue: ['#8b5cf6', '#e879f9'],
    unlockLevel: 3,
    lore: 'A neon metropolis of tables. Rumour says the mayor was appointed by a subquery nobody has been able to read since.',
    focus: 'fundamentals',
    skills: [
      { id: 'sql.select', world: 'sql', name: 'SELECT Fundamentals', icon: '🔍', blurb: 'Filtering, ordering, NULL semantics, DISTINCT.', requires: [], x: 0, y: 1, tier: 0 },
      { id: 'sql.joins', world: 'sql', name: 'Joins', icon: '🔀', blurb: 'INNER, LEFT, SELF and the cartesian disasters between them.', requires: ['sql.select'], x: 1, y: 0, tier: 1 },
      { id: 'sql.aggregate', world: 'sql', name: 'Aggregation', icon: '∑', blurb: 'GROUP BY, HAVING, and why WHERE cannot see your COUNT.', requires: ['sql.select'], x: 1, y: 2, tier: 1 },
      { id: 'sql.subquery', world: 'sql', name: 'Subqueries & CTEs', icon: '🪆', blurb: 'Correlated subqueries, WITH clauses, EXISTS.', requires: ['sql.joins', 'sql.aggregate'], x: 2, y: 1, tier: 2 },
      { id: 'sql.window', world: 'sql', name: 'Window Functions', icon: '🪟', blurb: 'ROW_NUMBER, RANK, running totals — the Nth-highest-salary killer.', requires: ['sql.subquery'], x: 3, y: 1, tier: 3 },
    ],
  },
  {
    id: 'os',
    name: 'OS Mountain',
    subtitle: 'Climb into the kernel',
    icon: '🏔️',
    hue: ['#0ea5e9', '#a5f3fc'],
    unlockLevel: 4,
    lore: 'Cold, thin air and processes everywhere. Deadlock is not a metaphor here — climbers really do wait forever.',
    focus: 'fundamentals',
    skills: [
      { id: 'os.process', world: 'os', name: 'Processes & Threads', icon: '🧵', blurb: 'PCB, context switches, process vs thread.', requires: [], x: 0, y: 1, tier: 0 },
      { id: 'os.sched', world: 'os', name: 'Scheduling', icon: '⏱️', blurb: 'FCFS, SJF, Round Robin, priority inversion.', requires: ['os.process'], x: 1, y: 0, tier: 1 },
      { id: 'os.sync', world: 'os', name: 'Synchronisation', icon: '🔒', blurb: 'Race conditions, mutexes, semaphores, deadlock conditions.', requires: ['os.process'], x: 1, y: 2, tier: 1 },
      { id: 'os.memory', world: 'os', name: 'Memory', icon: '🧠', blurb: 'Paging, segmentation, virtual memory, page replacement.', requires: ['os.sched'], x: 2, y: 1, tier: 2 },
      { id: 'os.filesys', world: 'os', name: 'File Systems', icon: '📁', blurb: 'Inodes, allocation strategies, disk scheduling.', requires: ['os.memory', 'os.sync'], x: 3, y: 1, tier: 3 },
    ],
  },
  {
    id: 'networking',
    name: 'Networking Island',
    subtitle: 'Packets in paradise',
    icon: '🌐',
    hue: ['#22c55e', '#a3e635'],
    unlockLevel: 5,
    lore: 'An archipelago connected by undersea cable. Every bridge is a protocol, and one of them keeps retransmitting.',
    focus: 'fundamentals',
    skills: [
      { id: 'net.model', world: 'networking', name: 'OSI & TCP/IP', icon: '🗼', blurb: 'Layers, encapsulation, who does what.', requires: [], x: 0, y: 1, tier: 0 },
      { id: 'net.transport', world: 'networking', name: 'TCP vs UDP', icon: '🚚', blurb: 'Handshakes, reliability, flow and congestion control.', requires: ['net.model'], x: 1, y: 0, tier: 1 },
      { id: 'net.ip', world: 'networking', name: 'IP & Routing', icon: '🧭', blurb: 'Addressing, subnets, NAT, ARP.', requires: ['net.model'], x: 1, y: 2, tier: 1 },
      { id: 'net.http', world: 'networking', name: 'HTTP & DNS', icon: '📡', blurb: 'Request lifecycle, status codes, caching, resolution.', requires: ['net.transport'], x: 2, y: 1, tier: 2 },
      { id: 'net.security', world: 'networking', name: 'Security Basics', icon: '🛡️', blurb: 'TLS, symmetric vs asymmetric, common attacks.', requires: ['net.http', 'net.ip'], x: 3, y: 1, tier: 3 },
    ],
  },
  {
    id: 'dbms',
    name: 'DBMS Depths',
    subtitle: 'Below SQL City lies the engine',
    icon: '💎',
    hue: ['#ec4899', '#fb7185'],
    unlockLevel: 6,
    lore: 'Caverns where transactions are carved into stone tablets. ACID is not a warning — it is the law.',
    focus: 'fundamentals',
    skills: [
      { id: 'db.model', world: 'dbms', name: 'Data Modelling', icon: '📐', blurb: 'ER diagrams, keys, cardinality.', requires: [], x: 0, y: 1, tier: 0 },
      { id: 'db.normal', world: 'dbms', name: 'Normalisation', icon: '🧮', blurb: '1NF through BCNF and when to deliberately break them.', requires: ['db.model'], x: 1, y: 0, tier: 1 },
      { id: 'db.txn', world: 'dbms', name: 'Transactions', icon: '🔁', blurb: 'ACID, isolation levels, the anomalies each one permits.', requires: ['db.model'], x: 1, y: 2, tier: 1 },
      { id: 'db.index', world: 'dbms', name: 'Indexing', icon: '🗂️', blurb: 'B-trees, clustered vs non-clustered, when an index hurts.', requires: ['db.normal', 'db.txn'], x: 2, y: 1, tier: 2 },
    ],
  },
  {
    id: 'aptitude',
    name: 'Aptitude Arena',
    subtitle: 'The gate before the gate',
    icon: '🎯',
    hue: ['#f59e0b', '#fcd34d'],
    unlockLevel: 1,
    lore: 'A colosseum where the clock is the real opponent. Most candidates fall here before they ever open an editor.',
    focus: 'interview',
    skills: [
      { id: 'apt.quant', world: 'aptitude', name: 'Quantitative', icon: '🔢', blurb: 'Percentages, ratios, time-speed-distance, profit and loss.', requires: [], x: 0, y: 0, tier: 0 },
      { id: 'apt.logical', world: 'aptitude', name: 'Logical Reasoning', icon: '🧠', blurb: 'Series, syllogisms, seating arrangements, puzzles.', requires: [], x: 0, y: 2, tier: 0 },
      { id: 'apt.verbal', world: 'aptitude', name: 'Verbal', icon: '📖', blurb: 'Reading comprehension, error spotting, vocabulary in context.', requires: ['apt.quant'], x: 1, y: 1, tier: 1 },
      { id: 'apt.data', world: 'aptitude', name: 'Data Interpretation', icon: '📉', blurb: 'Tables, charts, and extracting a number under time pressure.', requires: ['apt.logical', 'apt.quant'], x: 2, y: 1, tier: 2 },
    ],
  },
  {
    id: 'hr',
    name: 'The HR Hall',
    subtitle: 'Where the offer is actually decided',
    icon: '🎙️',
    hue: ['#14b8a6', '#7dd3fc'],
    unlockLevel: 3,
    lore: 'Warm lighting, comfortable chairs, and questions with no right answer — only better ones.',
    focus: 'interview',
    skills: [
      { id: 'hr.story', world: 'hr', name: 'Your Story', icon: '📜', blurb: 'Tell me about yourself — in ninety seconds, without rambling.', requires: [], x: 0, y: 1, tier: 0 },
      { id: 'hr.behaviour', world: 'hr', name: 'Behavioural (STAR)', icon: '⭐', blurb: 'Structure a conflict, a failure, a leadership moment.', requires: ['hr.story'], x: 1, y: 0, tier: 1 },
      { id: 'hr.company', world: 'hr', name: 'Company Fit', icon: '🏢', blurb: 'Why us, why this role, what you actually researched.', requires: ['hr.story'], x: 1, y: 2, tier: 1 },
      { id: 'hr.negotiate', world: 'hr', name: 'Closing & Questions', icon: '🤝', blurb: 'The questions you ask them, and handling the salary moment.', requires: ['hr.behaviour', 'hr.company'], x: 2, y: 1, tier: 2 },
    ],
  },
]

/**
 * Ordered by unlock level, so the map always leads with what the player can
 * actually play. Authoring order buried Aptitude Arena — unlocked at level 1 —
 * beneath five locked worlds, which made a brand-new account look like a wall
 * of padlocks.
 */
export const WORLDS: World[] = [...WORLD_DEFS].sort((a, b) => a.unlockLevel - b.unlockLevel)

export const WORLD_BY_ID = Object.fromEntries(WORLDS.map((w) => [w.id, w])) as Record<string, World>

export const ALL_SKILLS = WORLDS.flatMap((w) => w.skills)
export const SKILL_BY_ID = Object.fromEntries(ALL_SKILLS.map((s) => [s.id, s]))

/** Mastery a prerequisite must reach before dependent nodes light up. */
export const UNLOCK_THRESHOLD = 0.35
