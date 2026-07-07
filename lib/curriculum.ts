// lib/curriculum.ts — the canonical registry of units and the 26 topics.
//
// Single source for sidebar nav, routes, breadcrumbs, and prev/next. Slugs match
// OCW lecture numbers (CLAUDE.md); titles are the OCW-verified lecture titles.
// Owned by the lead; other tracks IMPORT this, they do not edit it.

import type { TopicMeta, Unit } from '@/lib/types';

export const UNITS: Unit[] = [
  { number: 1, title: 'Python Basics', topicSlugs: [
    '01-introduction', '02-strings-io-branching', '03-iteration',
    '04-loops-strings-binary', '05-floats-approximation', '06-bisection-search',
  ] },
  { number: 2, title: 'Functions & Structures', topicSlugs: [
    '07-decomposition-functions', '08-functions-as-objects', '09-lambda-tuples-lists',
    '10-lists-mutability', '11-aliasing-cloning', '12-comprehensions-testing-debugging',
    '13-exceptions-assertions', '14-dictionaries',
  ] },
  { number: 3, title: 'Recursion & OOP', topicSlugs: [
    '15-recursion', '16-recursion-non-numerics', '17-python-classes',
    '18-more-class-methods', '19-inheritance', '20-oop-fitness-tracker',
  ] },
  { number: 4, title: 'Efficiency', topicSlugs: [
    '21-timing-counting-operations', '22-big-o-theta', '23-complexity-classes',
    '24-sorting-algorithms', '25-plotting', '26-list-access-hashing-simulations',
  ] },
];

export const TOPICS: TopicMeta[] = [
  // Unit 1 — Python Basics
  { slug: '01-introduction', number: 1, unit: 1, title: 'Introduction',
    blurb: 'Variables, types, expressions, and how Python evaluates them.', ocw: { lecture: 1 } },
  { slug: '02-strings-io-branching', number: 2, unit: 1, title: 'Strings, Input/Output, Branching',
    blurb: 'Strings, input()/print(), and if/elif/else control flow.', ocw: { lecture: 2 } },
  { slug: '03-iteration', number: 3, unit: 1, title: 'Iteration',
    blurb: 'while and for loops; loop control and accumulation.', ocw: { lecture: 3 } },
  { slug: '04-loops-strings-binary', number: 4, unit: 1, title: 'Loops over Strings, Guess-and-Check, Binary',
    blurb: 'Looping over strings, guess-and-check, and binary representation.', ocw: { lecture: 4 } },
  { slug: '05-floats-approximation', number: 5, unit: 1, title: 'Floats and Approximation Methods',
    blurb: 'Why floats are inexact; approximation by exhaustive and Newton methods.', ocw: { lecture: 5 } },
  { slug: '06-bisection-search', number: 6, unit: 1, title: 'Bisection Search',
    blurb: 'Halving the search space to converge fast on an answer.', ocw: { lecture: 6 } },

  // Unit 2 — Functions & Structures
  { slug: '07-decomposition-functions', number: 7, unit: 2, title: 'Decomposition, Abstraction, Functions',
    blurb: 'Functions, parameters, return vs. print, scope, and decomposition.', ocw: { lecture: 7 } },
  { slug: '08-functions-as-objects', number: 8, unit: 2, title: 'Functions as Objects',
    blurb: 'Functions as first-class values: passing and returning them.', ocw: { lecture: 8 } },
  { slug: '09-lambda-tuples-lists', number: 9, unit: 2, title: 'Lambda Functions, Tuples, and Lists',
    blurb: 'Anonymous functions, immutable tuples, and mutable lists.', ocw: { lecture: 9 } },
  { slug: '10-lists-mutability', number: 10, unit: 2, title: 'Lists, Mutability',
    blurb: 'List methods and the consequences of in-place mutation.', ocw: { lecture: 10 } },
  { slug: '11-aliasing-cloning', number: 11, unit: 2, title: 'Aliasing, Cloning',
    blurb: 'Aliasing vs. cloning; when two names share one list.', ocw: { lecture: 11 } },
  { slug: '12-comprehensions-testing-debugging', number: 12, unit: 2, title: 'List Comprehension, Functions as Objects, Testing, Debugging',
    blurb: 'List comprehensions, plus systematic testing and debugging.', ocw: { lecture: 12 } },
  { slug: '13-exceptions-assertions', number: 13, unit: 2, title: 'Exceptions, Assertions',
    blurb: 'try/except/else/finally and assert for defensive code.', ocw: { lecture: 13 } },
  { slug: '14-dictionaries', number: 14, unit: 2, title: 'Dictionaries',
    blurb: 'Key to value maps: O(1) lookup, keys must be immutable.', ocw: { lecture: 14 } },

  // Unit 3 — Recursion & OOP
  { slug: '15-recursion', number: 15, unit: 3, title: 'Recursion',
    blurb: 'Solving a problem in terms of smaller instances; base + recursive cases.', ocw: { lecture: 15 } },
  { slug: '16-recursion-non-numerics', number: 16, unit: 3, title: 'Recursion on Non-Numerics',
    blurb: 'Recursion over strings and lists, not just numbers.', ocw: { lecture: 16 } },
  { slug: '17-python-classes', number: 17, unit: 3, title: 'Python Classes',
    blurb: 'Defining classes: __init__, self, attributes, and methods.', ocw: { lecture: 17 } },
  { slug: '18-more-class-methods', number: 18, unit: 3, title: 'More Python Class Methods',
    blurb: 'Dunder methods, getters/setters, and object printing.', ocw: { lecture: 18 } },
  { slug: '19-inheritance', number: 19, unit: 3, title: 'Inheritance',
    blurb: 'Subclasses, method overriding, and super().', ocw: { lecture: 19 } },
  { slug: '20-oop-fitness-tracker', number: 20, unit: 3, title: 'Fitness Tracker OOP Example',
    blurb: 'A worked OOP example tying classes and inheritance together.', ocw: { lecture: 20 } },

  // Unit 4 — Efficiency
  { slug: '21-timing-counting-operations', number: 21, unit: 4, title: 'Timing Programs, Counting Operations',
    blurb: 'Measuring cost by timing and by counting operations.', ocw: { lecture: 21 } },
  { slug: '22-big-o-theta', number: 22, unit: 4, title: 'Big Oh and Theta',
    blurb: 'Asymptotic notation: Big-O and Theta for order of growth.', ocw: { lecture: 22 } },
  { slug: '23-complexity-classes', number: 23, unit: 4, title: 'Complexity Classes Examples',
    blurb: 'Constant, log, linear, n log n, quadratic, exponential — with examples.', ocw: { lecture: 23 } },
  { slug: '24-sorting-algorithms', number: 24, unit: 4, title: 'Sorting Algorithms',
    blurb: 'Bubble, selection, and merge sort and their complexities.', ocw: { lecture: 24 } },
  { slug: '25-plotting', number: 25, unit: 4, title: 'Plotting',
    blurb: 'Visualizing data with matplotlib basics.', ocw: { lecture: 25 } },
  { slug: '26-list-access-hashing-simulations', number: 26, unit: 4, title: 'List Access, Hashing, Simulations, Wrap-Up',
    blurb: 'List indexing cost, hashing for O(1) lookup, and simulations.', ocw: { lecture: 26 } },
];

// Fail loud at import time if the registry ever drifts from the 26-topic spec.
if (TOPICS.length !== 26) {
  throw new Error(`curriculum.ts: expected 26 topics, found ${TOPICS.length}`);
}

export const TOPIC_SLUGS: string[] = TOPICS.map((t) => t.slug);

export function getTopic(slug: string): TopicMeta | undefined {
  return TOPICS.find((t) => t.slug === slug);
}

export function getUnit(n: 1 | 2 | 3 | 4): Unit | undefined {
  return UNITS.find((u) => u.number === n);
}

export function topicsInUnit(n: 1 | 2 | 3 | 4): TopicMeta[] {
  return TOPICS.filter((t) => t.unit === n);
}

/** Previous/next topic in curriculum order, for the topic-page footer nav. */
export function topicPrevNext(slug: string): { prev?: TopicMeta; next?: TopicMeta } {
  const i = TOPICS.findIndex((t) => t.slug === slug);
  if (i === -1) return {};
  return { prev: TOPICS[i - 1], next: TOPICS[i + 1] };
}
