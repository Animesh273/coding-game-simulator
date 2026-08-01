import type { Lesson } from '../../game/types'

/**
 * C++ lessons — the competitive programming track.
 *
 * Everything here is filtered through one question: does this change whether
 * your submission passes? Language features that do not affect a verdict are
 * left out, however interesting they are.
 */
export const CPP_LESSONS: Lesson[] = [
  {
    skillId: 'cpp.basics',
    title: 'Syntax & Fast I/O',
    minutes: 7,
    intro:
      'Before any algorithm matters, two things decide contest submissions: whether your integers overflow, and whether you can read the input fast enough. Both are one-line fixes that people lose hours to.',
    sections: [
      {
        heading: 'Integer overflow is silent',
        body:
          '`int` is 32-bit: its maximum is **2,147,483,647** (about 2.1×10⁹). Exceeding it does not crash — it wraps around, and you get a plausible-looking wrong answer.\n\nThe subtlety is that the multiplication happens in the operands\' type, *before* any assignment. Casting the result is too late.',
        code: 'int a = 100000, b = 100000;\n\ncout << a * b;                  // 1410065408  — overflowed\nlong long c = a * b;            // STILL WRONG — overflow happened first\nlong long d = 1LL * a * b;      // 10000000000 — correct\nlong long e = (long long)a * b; // also correct',
        lang: 'cpp',
        callout: {
          kind: 'trap',
          text: 'Rule of thumb: if any intermediate value can exceed 2×10⁹, make the whole expression long long. Two values near 10⁹ multiply to near 10¹⁸ — that needs long long (max ≈ 9.2×10¹⁸).',
        },
      },
      {
        heading: 'Fast I/O',
        body:
          'By default `cin`/`cout` stay synchronised with C stdio so you can mix them with `scanf`/`printf`. That synchronisation is what makes them slow.\n\nDisabling it, and untying `cin` from `cout` (which otherwise flushes output before every read), typically gives a 3–5× speedup on large input.',
        code: 'int main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    int n; cin >> n;\n    // ...\n}',
        lang: 'cpp',
        callout: {
          kind: 'trap',
          text: 'Once you call this, do NOT mix in scanf/printf — the buffers are no longer in sync and output will interleave wrongly. Also avoid `endl` in loops: it flushes every time. Use "\\n".',
        },
      },
      {
        heading: 'Division truncates toward zero',
        body:
          'Since C++11, integer division truncates toward zero — so `-7 / 2` is `-3`, not `-4`. The remainder then follows `(a/b)*b + a%b == a`, giving `-7 % 2 == -1`.\n\nThis matters constantly in modular arithmetic, where a negative intermediate produces a negative remainder.',
        code: '-7 / 2      // -3   (Python gives -4)\n-7 % 2      // -1   (Python gives 1)\n\n// Safe non-negative modulo:\nint mod(int x, int m) { return ((x % m) + m) % m; }',
        lang: 'cpp',
      },
      {
        heading: 'Reading constraints backwards',
        body:
          'Assume roughly **10⁸ simple operations per second**. The constraint tells you the intended complexity before you write anything.',
        code: '// n <= 10        ->  O(n!)  or O(2^n * n)   brute force / permutations\n// n <= 20        ->  O(2^n)                    bitmask DP\n// n <= 500       ->  O(n^3)                    Floyd-Warshall\n// n <= 5000      ->  O(n^2)                    simple DP\n// n <= 2*10^5    ->  O(n log n)                sort / segment tree / binary search\n// n <= 10^6      ->  O(n)                      sweep / two pointers\n// n <= 10^18     ->  O(log n)                  binary search / fast exponentiation',
        lang: 'text',
        callout: {
          kind: 'interview',
          text: 'Stating this mapping out loud early ("n is 2×10⁵, so I need n log n or better") is one of the strongest signals you can send in a contest-style interview.',
        },
      },
    ],
    keyPoints: [
      'int overflows silently at ~2.1×10⁹ — use `1LL *` at the operand, not on the result',
      '`sync_with_stdio(false)` + `cin.tie(nullptr)` for large input; avoid `endl` in loops',
      'C++ truncates division toward zero, so `%` can return a negative number',
      'Read the constraint first and derive the target complexity from ~10⁸ ops/second',
    ],
    interviewAngle:
      'Overflow and complexity-from-constraints are the two things a contest-style interviewer will probe immediately. Neither is hard; both are fatal if missed.',
  },

  {
    skillId: 'cpp.stl',
    title: 'STL Containers',
    minutes: 8,
    intro:
      'The STL already implements most of the data structures a problem needs. Knowing the complexity of each — and which one silently costs you a log factor — is most of what separates a fast solution from a timeout.',
    sections: [
      {
        heading: 'The complexity table',
        body:
          'Memorise this. It decides your container before you write a line.',
        code: '// vector          push_back O(1) amortised, index O(1), insert-middle O(n)\n// deque           push_front/back O(1), index O(1)\n// set / map       insert/find/erase O(log n), keys SORTED\n// unordered_set/map  O(1) average, O(n) worst, NO order\n// priority_queue  push/pop O(log n), top O(1)\n// string          like vector<char>',
        lang: 'text',
      },
      {
        heading: 'map vs unordered_map',
        body:
          '`map` is a balanced BST: O(log n), keys kept sorted, supports `lower_bound`. `unordered_map` is a hash table: O(1) average but **O(n) worst case** under collisions.\n\nOn Codeforces this is a real hazard — anti-hash tests deliberately collide the default hash and turn your solution into O(n²).',
        code: '#include <bits/stdc++.h>\n\nmap<int,int> ordered;        // sorted, log n, has lower_bound\nunordered_map<int,int> fast; // hashed, ~O(1), no ordering\n\n// Hardened hash for contests:\nstruct Hash {\n    size_t operator()(size_t x) const {\n        static const size_t SEED =\n            chrono::steady_clock::now().time_since_epoch().count();\n        x += 0x9e3779b97f4a7c15 + SEED;\n        x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9;\n        return x ^ (x >> 31);\n    }\n};\nunordered_map<int,int,Hash> safe;',
        lang: 'cpp',
        callout: {
          kind: 'tip',
          text: 'If you need sorted order, predecessor/successor queries, or lower_bound, you need `map` — the log factor is not optional there.',
        },
      },
      {
        heading: 'priority_queue defaults to a max-heap',
        body:
          '`priority_queue<int>` puts the **largest** element on top. Dijkstra and most k-smallest problems want the opposite, which needs the three-argument form.',
        code: 'priority_queue<int> maxHeap;                                  // top() = largest\npriority_queue<int, vector<int>, greater<int>> minHeap;       // top() = smallest\n\n// Dijkstra: (distance, node) pairs, smallest distance first\npriority_queue<pair<long long,int>,\n               vector<pair<long long,int>>,\n               greater<>> pq;\n\n// Quick hack for ints: push negatives into a max-heap\nmaxHeap.push(-x);   // then negate again on pop',
        lang: 'cpp',
      },
      {
        heading: 'vector: reserve, and 2D',
        body:
          '`push_back` is O(1) *amortised* — when capacity runs out it reallocates and copies everything. If you know the size, `reserve` removes those copies.\n\nFor grids, a `vector<vector<int>>` scatters rows across the heap. In a hot inner loop, a single flat vector indexed `i*m + j` is measurably faster.',
        code: 'vector<int> v;\nv.reserve(n);                                  // one allocation, no copies\n\nvector<vector<int>> grid(n, vector<int>(m, 0)); // n x m, zeroed\n\n// Flat alternative — better cache locality\nvector<int> flat(n * m, 0);\n// flat[i * m + j]',
        lang: 'cpp',
      },
    ],
    keyPoints: [
      '`set`/`map` are O(log n) and sorted; `unordered_*` are O(1) average but O(n) worst',
      'Use a custom randomised hash for unordered_map in contests',
      '`priority_queue` is a max-heap — add `vector<T>, greater<T>` for a min-heap',
      '`reserve` when the size is known; consider a flat vector for hot 2D loops',
    ],
    interviewAngle:
      'Expect "what is the complexity of that lookup?" the moment you name a container. Answering `map` when you meant `unordered_map` — or not knowing the difference — is the kind of imprecision that gets flagged.',
  },

  {
    skillId: 'cpp.algos',
    title: 'STL Algorithms',
    minutes: 7,
    intro:
      '`<algorithm>` already contains half of most solutions. The point of this lesson is recognition: knowing that the sub-problem in front of you has a one-line library call.',
    sections: [
      {
        heading: 'Sorting, with comparators',
        body:
          '`sort` is O(n log n) introsort. A custom comparator must be a **strict weak ordering** — return `true` only when `a` must come strictly before `b`.\n\nReturning `<=` is undefined behaviour, and it really does crash rather than merely mis-sorting.',
        code: 'sort(v.begin(), v.end());                          // ascending\nsort(v.rbegin(), v.rend());                        // descending\nsort(v.begin(), v.end(), greater<int>());          // also descending\n\n// By second field, then first:\nsort(v.begin(), v.end(), [](auto& a, auto& b) {\n    if (a.second != b.second) return a.second > b.second;\n    return a.first < b.first;\n});\n\nstable_sort(...);   // preserves ties\n// NEVER: return a <= b;   <- UB, can crash',
        lang: 'cpp',
      },
      {
        heading: 'Binary search: the three forms',
        body:
          'On a **sorted** range: `lower_bound` finds the first element `>= x`, `upper_bound` the first `> x`, and `binary_search` returns a bool.\n\nThe pair gives you the count of equal elements for free.',
        code: 'auto lo = lower_bound(v.begin(), v.end(), x);   // first >= x\nauto hi = upper_bound(v.begin(), v.end(), x);   // first  > x\nint count = hi - lo;                             // occurrences of x\nint index = lo - v.begin();                      // position\n\nbool found = binary_search(v.begin(), v.end(), x);',
        lang: 'cpp',
        callout: {
          kind: 'trap',
          text: 'On a std::set you must use the MEMBER function s.lower_bound(x). The free function degrades to O(n) because set iterators are not random-access.',
        },
      },
      {
        heading: 'The utility belt',
        body: 'These come up constantly and each replaces a hand-written loop.',
        code: '#include <numeric>\n\naccumulate(v.begin(), v.end(), 0LL);   // sum — note the 0LL to avoid overflow\n*max_element(v.begin(), v.end());\nreverse(v.begin(), v.end());\nv.erase(unique(v.begin(), v.end()), v.end());   // dedupe a SORTED vector\ncount(v.begin(), v.end(), x);\n__gcd(a, b);\niota(v.begin(), v.end(), 0);           // fill 0,1,2,3,...\n\n// Enumerate permutations (sort ascending first!)\nsort(v.begin(), v.end());\ndo { /* use v */ } while (next_permutation(v.begin(), v.end()));',
        lang: 'cpp',
        callout: {
          kind: 'trap',
          text: '`accumulate(v.begin(), v.end(), 0)` accumulates in int and overflows. Pass `0LL` to accumulate in long long.',
        },
      },
    ],
    keyPoints: [
      'Comparators must be strict weak orderings — never return `<=`',
      '`upper_bound - lower_bound` counts occurrences in O(log n)',
      'On a `set`, use the member `lower_bound`, not the free function',
      '`accumulate` with `0` overflows — pass `0LL`',
    ],
    interviewAngle:
      'Reaching for the library rather than hand-rolling a binary search reads as fluency — and hand-rolled binary searches are where off-by-one bugs live.',
  },

  {
    skillId: 'cpp.memory',
    title: 'Memory & References',
    minutes: 7,
    intro:
      'Two failure modes live here, and both are invisible in the algorithm: a parameter that copies a whole container, and a reference that outlives the memory it points at. Neither shows up in your complexity analysis, and both decide verdicts.',
    sections: [
      {
        heading: 'The pass-by-value TLE',
        body:
          'A by-value parameter **copies the entire container on every call**. In a recursive DFS that turns an O(V+E) traversal into something far worse.\n\nYour complexity reasoning was right; the parameter list betrayed you.',
        code: '// TLE — copies the whole adjacency list every call\nvoid dfs(int u, vector<vector<int>> adj, vector<bool> vis) { ... }\n\n// Correct — const& to read, & to mutate\nvoid dfs(int u, const vector<vector<int>>& adj, vector<bool>& vis) {\n    vis[u] = true;\n    for (int v : adj[u])\n        if (!vis[v]) dfs(v, adj, vis);\n}',
        lang: 'cpp',
        callout: {
          kind: 'tip',
          text: 'Default habit: `const T&` for anything bigger than a pointer. Pass by value only for small primitives (int, char, double) or when you genuinely want your own copy.',
        },
      },
      {
        heading: 'Iterator invalidation',
        body:
          'When a `vector` exceeds capacity it allocates a new buffer, moves the elements, and frees the old one. **Every existing pointer, reference and iterator into it becomes dangling.**\n\nReading one afterwards is undefined behaviour — it may print the old value on your machine and garbage on the judge.',
        code: 'vector<int> v = {1, 2, 3};\nint& first = v[0];\nv.push_back(4);        // may reallocate\ncout << first;         // UNDEFINED BEHAVIOUR\n\n// Also broken — erase invalidates it, then ++it is UB:\nfor (auto it = v.begin(); it != v.end(); ++it)\n    if (*it == x) v.erase(it);\n\n// Correct: erase returns the next valid iterator\nfor (auto it = v.begin(); it != v.end(); )\n    it = (*it == x) ? v.erase(it) : it + 1;',
        lang: 'cpp',
        callout: {
          kind: 'tip',
          text: 'node-based containers (list, map, set) do NOT invalidate references to other elements on insert — only the erased element itself. vector and deque do.',
        },
      },
      {
        heading: 'References vs pointers',
        body:
          'A reference is an alias: bound at declaration, never rebindable, never null. A pointer is a variable holding an address: nullable and reassignable.\n\nIn contest code prefer references for parameters — there is no null case to handle. Reach for pointers when you genuinely need optional or rebindable indirection, like tree nodes.',
        code: 'int x = 5;\nint& ref = x;      // must bind now, forever refers to x\nref = 10;          // x is now 10\n\nint* ptr = &x;     // may be null, may be reassigned\n*ptr = 20;\nptr = nullptr;     // fine\n\nstruct Node { int val; Node* left = nullptr; Node* right = nullptr; };',
        lang: 'cpp',
      },
    ],
    keyPoints: [
      'Pass containers by `const&` — by-value copies on every call and causes TLE',
      'vector reallocation invalidates all references, pointers and iterators',
      '`erase` returns the next valid iterator; use it rather than `++it`',
      'References cannot be null or rebound; pointers can be both',
    ],
    interviewAngle:
      '"Why is this slow?" pointing at a by-value parameter is a standard debugging prompt. Iterator invalidation is the classic undefined-behaviour question.',
  },

  {
    skillId: 'cpp.modern',
    title: 'Modern C++',
    minutes: 6,
    intro:
      'C++11 onwards removed most of the boilerplate that made contest code slow to write. These four features are the ones worth having in your fingers.',
    sections: [
      {
        heading: 'auto and range-for',
        body:
          'Range-for over a container has three forms, and the difference is not stylistic.\n\n`auto x` **copies** each element. `auto& x` binds a reference so you can modify. `const auto& x` avoids the copy while documenting that you will not.',
        code: 'vector<string> words = {"alpha", "beta"};\n\nfor (auto w : words)        w += "!";   // copies each string; changes discarded\nfor (auto& w : words)       w += "!";   // modifies in place\nfor (const auto& w : words) cout << w;  // no copy, read-only  <- default habit\n\n// Structured bindings (C++17):\nfor (const auto& [key, value] : myMap)\n    cout << key << " -> " << value << "\\n";',
        lang: 'cpp',
        callout: {
          kind: 'trap',
          text: 'On a vector<string> or vector<vector<int>>, `for (auto x : v)` copies every element and can alone be the difference between passing and TLE.',
        },
      },
      {
        heading: 'Lambdas',
        body:
          'A lambda is an inline anonymous function. The capture list controls what it can see: `[&]` captures by reference (live, dangling if it outlives the scope), `[=]` by value (a snapshot).\n\nIn contest code `[&]` is the usual default — lambdas are used immediately and it avoids copying captured containers.',
        code: 'int threshold = 10;\n\nauto isBig = [&](int x) { return x > threshold; };   // sees live threshold\ncount_if(v.begin(), v.end(), isBig);\n\nsort(v.begin(), v.end(), [](auto& a, auto& b) { return a.second < b.second; });\n\n// Recursive lambda (C++14):\nfunction<int(int)> fact = [&](int n) { return n <= 1 ? 1 : n * fact(n - 1); };\n\n// Faster: generic lambda taking itself\nauto dfs = [&](auto&& self, int u) -> void {\n    for (int v : adj[u]) self(self, v);\n};\ndfs(dfs, 0);',
        lang: 'cpp',
      },
      {
        heading: 'Move semantics, briefly',
        body:
          '`std::move` does not move anything — it casts to an rvalue reference, which lets the compiler pick a constructor that *steals* the internals instead of copying them.\n\nYou rarely write this explicitly in contests, but it explains why returning a big vector by value is cheap.',
        code: 'vector<int> build() {\n    vector<int> result(1000000);\n    return result;          // moved (or elided) — not copied\n}\n\nvector<int> a = {1,2,3};\nvector<int> b = std::move(a);   // b steals a\'s buffer\n// a is now valid but unspecified — do not read it',
        lang: 'cpp',
      },
    ],
    keyPoints: [
      '`const auto&` should be your default range-for; `auto` copies every element',
      'Structured bindings (`auto& [k, v]`) make map iteration readable',
      '`[&]` captures live references, `[=]` a snapshot — prefer `[&]` for immediate use',
      '`std::move` is a cast, not an operation; it enables stealing instead of copying',
    ],
    interviewAngle:
      'Being asked the difference between `auto` and `auto&` in a range-for is a quick way to check whether you understand copying — and therefore whether your complexity claims are trustworthy.',
  },

  {
    skillId: 'cpp.cp',
    title: 'Contest Craft',
    minutes: 8,
    intro:
      'The techniques that recur across problems regardless of topic: precomputation, bit tricks, and arithmetic that survives a 10⁹+7 modulus. These are the tools you should reach for before inventing anything.',
    sections: [
      {
        heading: 'Prefix sums',
        body:
          'Precompute cumulative sums once in O(n), then any range sum is a single subtraction — O(1) per query. With q queries that is O(n + q) instead of O(n·q).',
        code: 'vector<long long> pre(n + 1, 0);\nfor (int i = 0; i < n; i++)\n    pre[i + 1] = pre[i] + a[i];\n\n// sum of a[l..r] inclusive:\nlong long s = pre[r + 1] - pre[l];\n\n// 2D version: sum of the rectangle (r1,c1)..(r2,c2)\n// pre[r2+1][c2+1] - pre[r1][c2+1] - pre[r2+1][c1] + pre[r1][c1]',
        lang: 'cpp',
        callout: {
          kind: 'tip',
          text: 'Use long long for the prefix array — sums overflow int long before the individual elements do. If the array also needs updates, prefix sums no longer work: use a Fenwick tree, O(log n) per operation.',
        },
      },
      {
        heading: 'Bit manipulation',
        body:
          'Each integer from 0 to 2ⁿ−1 encodes one subset of an n-element set: bit *i* set means element *i* is included.\n\nThat makes exhaustive subset search a single loop — viable up to about n = 20 (10⁶ subsets), borderline at n = 25.',
        code: 'for (int mask = 0; mask < (1 << n); mask++) {\n    for (int i = 0; i < n; i++)\n        if (mask & (1 << i)) { /* element i is in this subset */ }\n}\n\n__builtin_popcount(mask);      // number of set bits\n__builtin_popcountll(mask);    // for long long\nmask & (mask - 1);             // clears the lowest set bit\nmask & (-mask);                // isolates the lowest set bit\n\n// Enumerate submasks of `mask`:\nfor (int s = mask; s; s = (s - 1) & mask) { /* s is a submask */ }',
        lang: 'cpp',
        callout: {
          kind: 'trap',
          text: '`1 << n` overflows int for n >= 31. Write `1LL << n` once n can exceed 30.',
        },
      },
      {
        heading: 'Modular arithmetic',
        body:
          'Answers "modulo 10⁹+7" are everywhere. Two rules cover most of it: multiply in `long long`, and take the modulus often enough that nothing grows past it.\n\nDivision needs a modular inverse, which for a prime modulus is Fermat\'s little theorem: `a⁻¹ ≡ a^(m−2) mod m`.',
        code: 'const long long MOD = 1e9 + 7;\n\nlong long mul(long long a, long long b) { return a * b % MOD; }\nlong long add(long long a, long long b) { return (a + b) % MOD; }\nlong long sub(long long a, long long b) { return ((a - b) % MOD + MOD) % MOD; }\n\n// Fast exponentiation — O(log e)\nlong long power(long long b, long long e, long long m = MOD) {\n    long long r = 1; b %= m;\n    while (e > 0) {\n        if (e & 1) r = r * b % m;\n        b = b * b % m;\n        e >>= 1;\n    }\n    return r;\n}\n\n// Division by a, modulus prime:\nlong long inv = power(a, MOD - 2);',
        lang: 'cpp',
      },
    ],
    keyPoints: [
      'Prefix sums: O(n) precompute, O(1) queries — use long long for the array',
      'A bitmask enumerates subsets; `1LL << n` once n can exceed 30',
      'Multiply modulo in long long and reduce often; subtraction needs `+ MOD`',
      'Modular division = multiply by `power(a, MOD - 2)` for prime MOD',
    ],
    interviewAngle:
      'These are the building blocks a contest interviewer assumes you have. Recognising "this is a prefix sum" or "this is bitmask DP" quickly matters more than deriving it from scratch.',
  },
]
