import type { Lesson } from '../../game/types'

/**
 * Python lessons — the development track.
 *
 * Each lesson teaches the concept well enough that the matching questions are
 * winnable *after* reading, not before. The bias is toward the things that
 * actually bite in real code and in interviews, not toward exhaustive syntax
 * coverage a docs page already does better.
 */
export const PYTHON_LESSONS: Lesson[] = [
  {
    skillId: 'py.basics',
    title: 'Core Syntax',
    minutes: 6,
    intro:
      "Python's reputation for readability hides a handful of rules that surprise almost everyone once. This lesson covers the ones that actually cost you marks: how division behaves, what counts as true, and why comparing two things is not one operation but two.",
    sections: [
      {
        heading: 'Division is two different operators',
        body:
          'In Python 3, `/` is **true division** and always produces a float — even when the answer is whole. `//` is **floor division**, which rounds *down* toward negative infinity.\n\nThat second detail matters more than it looks. Flooring is not the same as truncating, and the two disagree on negative numbers.',
        code: 'print(7 / 2)     # 3.5   — always a float\nprint(6 / 2)     # 3.0   — still a float!\nprint(7 // 2)    # 3\nprint(-7 // 2)   # -4    — floors DOWN, not toward zero\nprint(-7 % 2)    # 1     — sign follows the divisor',
        lang: 'python',
        callout: {
          kind: 'trap',
          text: 'C++ and Java truncate toward zero, so -7/2 is -3 there but -4 in Python. If you port an algorithm between them, integer division is the first place to look for an off-by-one.',
        },
      },
      {
        heading: 'Truthiness is about emptiness',
        body:
          'Any object can be used in an `if`. The falsy values are a short, closed list — everything else is true.\n\nFalsy: `False`, `None`, `0`, `0.0`, `""`, `[]`, `{}`, `set()`, `()`.\n\nThat is the whole list. Notably, a non-empty string is truthy **whatever it spells** — including the string `"False"`.',
        code: 'bool("")        # False — empty\nbool("False")   # True  — non-empty string!\nbool([])        # False\nbool([0])       # True  — one element, and the element does not matter\nbool(0.0)       # False\n\n# The idiomatic emptiness check:\nif not items:\n    print("nothing to do")',
        lang: 'python',
        callout: {
          kind: 'tip',
          text: 'Write `if not items:` rather than `if len(items) == 0:`. It reads better and works for any container.',
        },
      },
      {
        heading: '`is` and `==` ask different questions',
        body:
          '`==` asks **"are these equal in value?"**. `is` asks **"are these the same object in memory?"**.\n\nUse `is` only for the singletons: `None`, `True`, `False`. For everything else use `==`.\n\nThe trap is that `is` *appears* to work on small integers and short strings, because CPython caches (interns) them. Then it silently stops working on larger values.',
        code: 'a = 256\nb = 256\nprint(a is b)    # True  — small ints are cached\n\nc = 257\nd = 257\nprint(c is d)    # False — outside the cache range!\nprint(c == d)    # True  — which is what you actually meant\n\n# The one correct use of `is`:\nif value is None:\n    ...',
        lang: 'python',
        callout: {
          kind: 'interview',
          text: 'Being asked why `a is b` differs for 256 and 257 is a standard filter question. The answer is integer interning — and the point is that you should not have been using `is` there at all.',
        },
      },
      {
        heading: 'Floats are approximations',
        body:
          '`0.1` has no exact binary representation, the same way `1/3` has no exact decimal one. So arithmetic on floats accumulates tiny errors.\n\nNever compare floats with `==`. Compare within a tolerance, or use `decimal.Decimal` when exactness matters — money, above all.',
        code: 'print(0.1 + 0.2)            # 0.30000000000000004\nprint(0.1 + 0.2 == 0.3)     # False\n\n# Compare with a tolerance:\nimport math\nmath.isclose(0.1 + 0.2, 0.3)    # True\n\n# Or be exact where it counts:\nfrom decimal import Decimal\nDecimal("0.1") + Decimal("0.2") == Decimal("0.3")   # True',
        lang: 'python',
      },
    ],
    keyPoints: [
      '`/` always returns a float; `//` floors toward negative infinity',
      'Falsy is a closed list — empties, zeros and None. A non-empty string is always truthy',
      '`is` compares identity, `==` compares value. Use `is` only with None/True/False',
      'Never compare floats with `==` — use `math.isclose` or `Decimal`',
    ],
    interviewAngle:
      'These come up as "what does this print" warm-ups in the first five minutes of a screening round. They are not hard, but getting one wrong sets an unhelpful tone — and the follow-up ("why?") is where the actual assessment happens.',
  },

  {
    skillId: 'py.collections',
    title: 'Collections',
    minutes: 7,
    intro:
      'Picking the right container is the single highest-leverage decision in most Python interview answers. It changes your complexity, and interviewers notice immediately. This lesson is about which one to reach for and why.',
    sections: [
      {
        heading: 'The four, and what each is for',
        body:
          '**list** — ordered, mutable, allows duplicates. The default sequence.\n\n**tuple** — ordered, immutable, hashable (if its contents are). Use for fixed records and dict keys.\n\n**set** — unordered, unique, hash-based. O(1) membership.\n\n**dict** — key→value, hash-based, insertion-ordered since 3.7. O(1) lookup.',
        code: 'nums   = [1, 2, 2, 3]      # list  — duplicates kept\npoint  = (3, 4)            # tuple — cannot be changed\nunique = {1, 2, 3}         # set   — duplicates collapse\nages   = {"ana": 31}       # dict  — keyed lookup',
        lang: 'python',
      },
      {
        heading: 'Membership testing is where the complexity is',
        body:
          '`x in some_list` scans element by element — **O(n)**. `x in some_set` hashes once and jumps — **O(1)** on average.\n\nInside a loop this is the difference between O(n·m) and O(n). Converting a list to a set before a membership-heavy loop is a one-line change that often turns a timeout into a pass.',
        code: '# Slow: O(n * m)\nseen = []\nfor item in stream:\n    if item in seen:        # O(n) scan every iteration\n        continue\n    seen.append(item)\n\n# Fast: O(n)\nseen = set()\nfor item in stream:\n    if item in seen:        # O(1) hash lookup\n        continue\n    seen.add(item)',
        lang: 'python',
        callout: {
          kind: 'tip',
          text: 'Set elements must be hashable, which in practice means immutable. You can put a tuple in a set; you cannot put a list.',
        },
      },
      {
        heading: 'Assignment binds names, it does not copy',
        body:
          '`b = a` creates a second **name** for the same object. Mutating through either is visible through both. This is the single most common source of "why did my other list change?".\n\nTo get an independent object you must ask for one — and then decide how deep the copy needs to go.',
        code: 'a = [1, 2, 3]\nb = a\nb.append(4)\nprint(a)          # [1, 2, 3, 4]  — same object!\n\nb = a[:]          # shallow copy — new outer list\nb = list(a)       # same thing\n\nimport copy\nb = copy.deepcopy(a)   # needed when elements are themselves mutable',
        lang: 'python',
        callout: {
          kind: 'trap',
          text: 'A shallow copy of a list of lists copies the outer list only. The inner lists are still shared, so mutating one is still visible through the other.',
        },
      },
      {
        heading: 'Safe dictionary access',
        body:
          '`d[key]` raises `KeyError` on a missing key. Usually you want a default instead.\n\n`d.get(key, default)` returns the default and **does not insert**. `d.setdefault(key, default)` returns it and **does** insert. `collections.defaultdict` inserts automatically on first access.',
        code: 'counts = {}\n\n# Verbose:\nif word in counts:\n    counts[word] += 1\nelse:\n    counts[word] = 1\n\n# Better:\ncounts[word] = counts.get(word, 0) + 1\n\n# Best for this job:\nfrom collections import Counter\ncounts = Counter(words)          # done',
        lang: 'python',
      },
    ],
    keyPoints: [
      'set/dict membership is O(1); list/tuple membership is O(n)',
      '`b = a` shares the object — copy explicitly with `a[:]`, `list(a)` or `deepcopy`',
      '`get` returns a default without inserting; `setdefault` and `defaultdict` insert',
      '`Counter` and `defaultdict` replace most manual counting code',
    ],
    interviewAngle:
      'Roughly half of all easy/medium interview problems are solved by "put it in a hash map". If you propose a nested loop where a set would do, expect "can you do better?" — and that is the answer they are waiting for.',
  },

  {
    skillId: 'py.strings',
    title: 'String Craft',
    minutes: 5,
    intro:
      'Strings are immutable sequences, and both halves of that sentence have consequences. Slicing gives you enormous expressive power; immutability gives you a performance trap that has failed real interviews.',
    sections: [
      {
        heading: 'Slicing: [start:stop:step]',
        body:
          '`start` is inclusive, `stop` is exclusive, `step` defaults to 1. All three are optional. Negative indices count from the end.\n\nA negative `step` walks backwards, which gives the idiomatic reverse.',
        code: 's = "placement"\n\ns[0:5]     # "place"  — indices 0,1,2,3,4 (stop excluded)\ns[2:5]     # "ace"\ns[:4]      # "plac"   — start defaults to 0\ns[4:]      # "ement"  — stop defaults to len(s)\ns[-3:]     # "ent"    — last three\ns[::-1]    # "tnemecalp" — reversed\ns[::2]     # "pae et" — every second character',
        lang: 'python',
        callout: {
          kind: 'tip',
          text: 'Slicing never raises IndexError. `s[5:100]` just gives you whatever exists. That is often what you want, but it also means a bad index fails silently rather than loudly.',
        },
      },
      {
        heading: 'Immutability and the quadratic loop',
        body:
          'Strings cannot be modified in place. Every `+=` builds a **new** string and copies everything accumulated so far.\n\nOver n iterations that is 1 + 2 + … + n character copies — **O(n²)**. The fix is to collect the pieces and join once, which is O(n).',
        code: '# O(n^2) — copies the whole accumulated string every iteration\nresult = ""\nfor chunk in chunks:\n    result += chunk\n\n# O(n) — one allocation at the end\nresult = "".join(chunks)',
        lang: 'python',
        callout: {
          kind: 'interview',
          text: 'CPython has an opportunistic optimisation that sometimes makes the first version fast. Do not rely on it, and do not cite it — interviewers want the join.',
        },
      },
      {
        heading: 'Formatting: use f-strings',
        body:
          'f-strings are the modern default: readable, fast, and they support format specs and expressions inline.',
        code: 'name, score = "Ana", 0.8756\n\nf"{name} scored {score:.1%}"      # \'Ana scored 87.6%\'\nf"{score:.2f}"                     # \'0.88\'\nf"{name:>10}"                      # right-aligned in 10 columns\nf"{name=}"                         # "name=\'Ana\'"  — handy when debugging',
        lang: 'python',
      },
    ],
    keyPoints: [
      'Slice is [start:stop:step] — stop is exclusive, negative step reverses',
      'Slicing out of range is safe; indexing out of range raises',
      'Repeated `+=` on a string is O(n²) — use `"".join(parts)`',
      'f-strings support format specs (`:.2f`, `:>10`) and the debug form `f"{x=}"`',
    ],
    interviewAngle:
      'String questions are a favourite because they are quick to state and reveal complexity instincts fast. If you build a string in a loop without mentioning join, that gets noticed.',
  },

  {
    skillId: 'py.functions',
    title: 'Functions & Scope',
    minutes: 7,
    intro:
      'Two of Python\'s most notorious gotchas live here, and both come from the same root: things you assume happen per-call actually happen once, at definition time. Understanding when Python evaluates what makes both obvious.',
    sections: [
      {
        heading: 'Default arguments are evaluated once',
        body:
          'A default value is computed when the `def` statement runs — **not** on each call. If the default is mutable, every call shares the same object, and it accumulates.',
        code: '# BROKEN\ndef add(item, bucket=[]):\n    bucket.append(item)\n    return bucket\n\nadd(1)    # [1]\nadd(2)    # [1, 2]   <- the same list, still there\n\n# CORRECT\ndef add(item, bucket=None):\n    if bucket is None:\n        bucket = []      # fresh list per call\n    bucket.append(item)\n    return bucket',
        lang: 'python',
        callout: {
          kind: 'trap',
          text: 'This is safe with immutable defaults (`0`, `None`, `""`, tuples) because there is nothing to mutate. The rule is simply: never use a mutable default.',
        },
      },
      {
        heading: 'Closures capture variables, not values',
        body:
          'A closure keeps a reference to the **variable**, and looks it up when the function is *called*. By then the loop has finished and the variable holds its final value.',
        code: 'fns = [lambda: i for i in range(3)]\nprint([f() for f in fns])     # [2, 2, 2]  — not [0, 1, 2]\n\n# Fix 1: bind the value as a default argument\nfns = [lambda i=i: i for i in range(3)]\n\n# Fix 2: a factory that creates a new scope per iteration\ndef make(i):\n    return lambda: i\nfns = [make(i) for i in range(3)]',
        lang: 'python',
      },
      {
        heading: '*args and **kwargs',
        body:
          '`*args` collects extra positional arguments into a **tuple**. `**kwargs` collects extra keyword arguments into a **dict**. The names are convention; the `*` and `**` do the work.\n\nThe same syntax *unpacks* at the call site, which is how wrappers forward arguments unchanged.',
        code: 'def log_call(fn):\n    def wrapper(*args, **kwargs):        # collect anything\n        print(f"calling {fn.__name__}")\n        return fn(*args, **kwargs)       # forward it unchanged\n    return wrapper\n\nvalues = [1, 2, 3]\nprint(*values)                # unpacks to print(1, 2, 3)',
        lang: 'python',
      },
    ],
    keyPoints: [
      'Default arguments are evaluated once at definition — never make them mutable',
      'Closures look up variables at call time, not creation time',
      '`*args` is a tuple, `**kwargs` is a dict; the same syntax unpacks at call sites',
      'Both gotchas share one cause: evaluation happens later (or earlier) than you assumed',
    ],
    interviewAngle:
      'The mutable-default question is close to universal. Being able to explain *why* — defaults evaluated at definition time — separates people who have read the docs from people who memorised "do not do that".',
  },

  {
    skillId: 'py.oop',
    title: 'Objects',
    minutes: 7,
    intro:
      "Python's object model is unusually transparent — attributes live in dictionaries you can inspect, and the special methods that power built-in syntax are just methods you can define. That transparency is also where the surprises come from.",
    sections: [
      {
        heading: 'Class attributes are shared',
        body:
          'An attribute assigned in the class body belongs to the **class**, and every instance sees the same object. Per-instance state belongs in `__init__`.\n\nThe subtle part: *mutating* a shared attribute affects everyone, but *rebinding* it through an instance creates a new instance attribute that shadows the class one.',
        code: 'class Player:\n    tags = []                    # ONE list, shared by all instances\n\na, b = Player(), Player()\na.tags.append("x")           # mutation — shared\nprint(b.tags)                # [\'x\']  !!\n\na.tags = ["y"]               # rebinding — creates an instance attribute\nprint(b.tags)                # [\'x\']  — b still sees the class one\n\nclass Player:\n    def __init__(self):\n        self.tags = []       # correct: one list per instance',
        lang: 'python',
      },
      {
        heading: '`__str__` and `__repr__`',
        body:
          '`__str__` powers `str(obj)` and `print(obj)` — write it for your users.\n\n`__repr__` powers `repr(obj)`, the REPL, and how the object appears **inside a container**. Write it for yourself, debugging at 2am; ideally it looks like code that would recreate the object.\n\nIf you define only one, define `__repr__` — `str()` falls back to it.',
        code: 'class Point:\n    def __init__(self, x, y):\n        self.x, self.y = x, y\n\n    def __repr__(self):\n        return f"Point({self.x}, {self.y})"\n\n    def __str__(self):\n        return f"({self.x}, {self.y})"\n\np = Point(1, 2)\nprint(p)        # (1, 2)              — __str__\nprint([p])      # [Point(1, 2)]       — __repr__, even inside a list',
        lang: 'python',
        callout: {
          kind: 'tip',
          text: 'A list prints its elements with repr, never str. That is why a class with only __str__ looks like <__main__.Point object at 0x...> inside a list.',
        },
      },
      {
        heading: 'Inheritance and `super()`',
        body:
          '`super()` delegates to the next class in the **method resolution order** — which, with multiple inheritance, is not necessarily the parent you wrote down. Python linearises the hierarchy using C3, and `ClassName.__mro__` shows you the result.',
        code: 'class Animal:\n    def __init__(self, name):\n        self.name = name\n\nclass Dog(Animal):\n    def __init__(self, name, breed):\n        super().__init__(name)      # run the parent initialiser\n        self.breed = breed\n\nprint(Dog.__mro__)\n# (Dog, Animal, object)',
        lang: 'python',
      },
    ],
    keyPoints: [
      'Class-body attributes are shared; instance state goes in `__init__`',
      'Mutating a shared attribute affects all instances; rebinding shadows it for one',
      '`__repr__` is for developers and is used inside containers; `__str__` is for users',
      '`super()` follows the MRO, not simply "the parent class"',
    ],
    interviewAngle:
      'Expect "what is the difference between `__str__` and `__repr__`" and a shared-mutable-class-attribute puzzle. Both are checking whether you have debugged real Python rather than only written it.',
  },

  {
    skillId: 'py.advanced',
    title: 'Pythonic Power',
    minutes: 8,
    intro:
      'The features that make Python code look like Python: comprehensions, generators, decorators and context managers. Each exists to remove a specific kind of boilerplate, and knowing which one applies is most of the skill.',
    sections: [
      {
        heading: 'Comprehensions',
        body:
          'A comprehension builds a container from an iterable in one expression. It is faster than an append loop and, when short, clearer.\n\nKeep them to one `for` and at most one `if`. Past that, a plain loop reads better — an interviewer will not be impressed by a comprehension they have to decode.',
        code: 'squares = [x * x for x in range(10)]\nevens   = [x for x in nums if x % 2 == 0]\nlookup  = {word: len(word) for word in words}\nuniques = {w.lower() for w in words}\n\n# Swapping a dict:\ninverted = {v: k for k, v in original.items()}',
        lang: 'python',
      },
      {
        heading: 'Generators: laziness as a memory strategy',
        body:
          'A function containing `yield` returns a **generator**: it produces values one at a time and keeps only its current state. Memory is O(1) rather than O(n), so you can stream a file larger than RAM, or an infinite sequence.\n\nThe cost: you cannot index it, cannot take its length, and it is exhausted after one pass.',
        code: 'def fib():\n    a, b = 0, 1\n    while True:            # infinite — fine, it is lazy\n        yield a\n        a, b = b, a + b\n\nfrom itertools import islice\nprint(list(islice(fib(), 10)))\n\n# Generator expression — same idea, parentheses instead of brackets\ntotal = sum(x * x for x in range(1_000_000))   # no list built',
        lang: 'python',
        callout: {
          kind: 'tip',
          text: 'Swapping [ ] for ( ) inside a call like sum() or max() turns a list comprehension into a generator expression and removes the intermediate list entirely.',
        },
      },
      {
        heading: 'Decorators',
        body:
          'A decorator is a function that takes a function and returns a replacement. `@name` above a `def` is just sugar for `f = name(f)`.\n\nStacked decorators apply **bottom-up**: the one nearest the function wraps first.',
        code: 'import functools\n\ndef timed(fn):\n    @functools.wraps(fn)          # preserves __name__ and docstring\n    def wrapper(*args, **kwargs):\n        import time\n        start = time.perf_counter()\n        result = fn(*args, **kwargs)\n        print(f"{fn.__name__} took {time.perf_counter() - start:.3f}s")\n        return result\n    return wrapper\n\n@timed\ndef work():\n    ...\n\n# @bold + @italic  ==  bold(italic(work))',
        lang: 'python',
      },
      {
        heading: 'Context managers',
        body:
          '`with` guarantees cleanup. `__enter__` runs on entry and `__exit__` runs on exit — whether the block finished, returned early, or raised.\n\nThat guarantee is why `with open(...)` is the only correct way to handle a file: the handle closes even if your parsing blows up halfway through.',
        code: 'with open("data.csv") as fh:\n    process(fh)          # fh.close() runs even if process() raises\n\n# Your own, the easy way:\nfrom contextlib import contextmanager\n\n@contextmanager\ndef timer(label):\n    import time\n    start = time.perf_counter()\n    try:\n        yield\n    finally:\n        print(f"{label}: {time.perf_counter() - start:.3f}s")\n\nwith timer("query"):\n    run_query()',
        lang: 'python',
      },
    ],
    keyPoints: [
      'Comprehensions: one `for`, at most one `if` — beyond that use a loop',
      'Generators trade indexing and reuse for O(1) memory and laziness',
      'Decorators are `f = decorator(f)`; stacked ones apply bottom-up',
      '`with` guarantees `__exit__` runs on the success, exception and early-return paths',
    ],
    interviewAngle:
      '"What is a generator and when would you use one?" is extremely common — the expected answer names memory, not elegance. Decorators usually appear as "have you written one?", so have a real example ready.',
  },

  {
    skillId: 'py.dev',
    title: 'Shipping Code',
    minutes: 8,
    intro:
      'Everything in this node is invisible in coding exercises and unavoidable in a real codebase. It is also how interviewers tell apart candidates who have built something from candidates who have only solved problems.',
    sections: [
      {
        heading: 'Catch narrowly',
        body:
          'A bare `except:` catches `BaseException` — including `KeyboardInterrupt` and `SystemExit`. Ctrl-C stops working and genuine crashes get silently swallowed.\n\nCatch the narrowest exception you can actually handle. If you need a catch-all, use `except Exception:` and log the traceback.',
        code: '# BAD — hides bugs, breaks Ctrl-C\ntry:\n    risky()\nexcept:\n    pass\n\n# GOOD\ntry:\n    risky()\nexcept (ValueError, KeyError) as err:\n    logger.warning("bad input: %s", err)\n    raise                     # re-raise if you cannot actually handle it\n\n# Acceptable catch-all, with the traceback preserved\nexcept Exception:\n    logger.exception("unexpected failure")\n    raise',
        lang: 'python',
        callout: {
          kind: 'trap',
          text: '`except Exception` does not catch KeyboardInterrupt or SystemExit — that is exactly why it is the safe catch-all and a bare `except:` is not.',
        },
      },
      {
        heading: '`finally` always runs',
        body:
          '`finally` executes on every exit path — success, exception, and early return. It runs *before* the function actually returns, even though the return value has already been computed.',
        code: 'def f():\n    try:\n        return "try"\n    finally:\n        print("finally")\n\nprint(f())\n# finally\n# try',
        lang: 'python',
        callout: {
          kind: 'trap',
          text: 'A `return` inside `finally` discards the original return value — including one from an exception path. It is almost always a bug.',
        },
      },
      {
        heading: 'The `__main__` guard and modules',
        body:
          'Python sets `__name__` to `"__main__"` in the file you executed, and to the module name when imported. The guard lets one file be both an importable module and a runnable script.\n\nWithout it, importing your file executes its top-level code as a side effect — which breaks tests, because a test runner imports the module.',
        code: 'def main():\n    ...\n\nif __name__ == "__main__":\n    main()',
        lang: 'python',
      },
      {
        heading: 'Virtual environments',
        body:
          'Two projects can need incompatible versions of the same library. A virtual environment gives each its own `site-packages` so they cannot collide.',
        code: 'python -m venv .venv\nsource .venv/bin/activate      # Windows: .venv\\Scripts\\activate\npip install -r requirements.txt\npip freeze > requirements.txt',
        lang: 'text',
      },
      {
        heading: 'The GIL, briefly',
        body:
          'CPython allows only one thread to execute Python bytecode at a time.\n\nFor **I/O-bound** work — network, disk, database — threads still help, because the GIL is released while waiting. For **CPU-bound** work they do not: four threads doing arithmetic run no faster than one. Use `multiprocessing`, or a library like NumPy that releases the GIL.',
        code: '# I/O-bound: threads are fine\nfrom concurrent.futures import ThreadPoolExecutor\nwith ThreadPoolExecutor() as pool:\n    results = pool.map(fetch_url, urls)\n\n# CPU-bound: use processes\nfrom concurrent.futures import ProcessPoolExecutor\nwith ProcessPoolExecutor() as pool:\n    results = pool.map(crunch, chunks)',
        lang: 'python',
        callout: {
          kind: 'interview',
          text: '"Do you know threading?" is usually a setup. The real question is whether you know threads will not speed up CPU-bound work in CPython, and what you would use instead.',
        },
      },
    ],
    keyPoints: [
      'Never use a bare `except:` — it swallows KeyboardInterrupt and hides bugs',
      '`finally` runs on every exit path; never `return` from inside it',
      '`if __name__ == "__main__":` keeps a file importable *and* runnable',
      'The GIL blocks CPU-bound threading — reach for multiprocessing instead',
    ],
    interviewAngle:
      'This node is where "tell me about a project" gets probed. Knowing why you used a virtualenv, how you handled errors, and what you would do about a CPU-bound bottleneck is what makes a project answer credible.',
  },
]
