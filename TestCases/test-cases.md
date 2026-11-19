# Test Plan & Results — ε-NFA → DFA Simulator

Every test states the machine, the input, the expected outcome (worked out by hand from the language definition) and the observed outcome. "Actual" shows **NFA result / DFA result**: a test passes only when both match the expected value.

## A. Automated unit tests (`npm test`)

| ID | Category | What it checks | Status |
|---|---|---|---|
| T01 | Normal | DFA accepts `101` (strings ending in 01) | Pass |
| T02 | Normal | DFA rejects `110` | Pass |
| T03 | Invalid input | Unknown symbol in input string → validation error | Pass |
| T04 | Boundary | Empty string ε decided by ε-closure of start state | Pass |
| T05 | Invalid definition | Missing/unknown start, bad symbol, unknown target, malformed line, multi-char symbol, reserved ε name | Pass |
| T06 | Correctness | ε-closure({0}) = {0,1,2,4,7}, ε-closure({5}) = {1,2,4,5,6,7} | Pass |
| T07 | Correctness | (a\|b)*abb ε-NFA → exactly the 5-state DFA A–E of Aho et al. (all 10 transitions checked) | Pass |
| T08 | Correctness | "3rd symbol from end is 1" → 2³ = 8 DFA states | Pass |
| T09 | Edge | Dead state ∅ created explicitly, DFA complete | Pass |
| T10 | Correctness | NFA ≡ DFA on all strings of length ≤ 8, every example | Pass |
| T11 | Edge | No final states → empty language (warning) | Pass |
| T12 | Edge | One state, no transitions, start = final | Pass |
| T13 | Edge | ε-cycle q0 ⇄ q1 terminates | Pass |
| T14 | Edge | Unreachable state warned and excluded from DFA | Pass |
| T15 | Input format | ε aliases `eps`, `#`, `epsilon`, `ε` | Pass |
| T16 | Correctness | Step log starts with ε-closure, has one step per DFA transition (5 × 2 = 10), ends with done | Pass |
| T17 | Correctness | "Ending in 01" NFA → exact 3-state DFA table | Pass |
| T18 | Input format | serialise → parse round-trip gives the same automaton (all examples) | Pass |
| T19 | Input format | Duplicate states merged with warning; comments/blank lines ignored | Pass |

Result: **19 / 19 passed** (Node.js v22, `npm test`). Files: `parser.test.js` (T05, T06, T18, T19), `subset.test.js` (T07, T08, T14, T16, T17), `simulate.test.js` (T01–T04, T09, T11–T13, T15), `equivalence.test.js` (T10).

## B. String simulation test cases (built-in examples)

| ID | Machine | Input | Expected | Actual (NFA / DFA) | Status |
|---|---|---|---|---|---|
| S01 | ε-NFA: (a\|b)*abb (textbook) | `abb` | Accept | Accept / Accept | Pass |
| S02 | ε-NFA: (a\|b)*abb (textbook) | `aabb` | Accept | Accept / Accept | Pass |
| S03 | ε-NFA: (a\|b)*abb (textbook) | `babb` | Accept | Accept / Accept | Pass |
| S04 | ε-NFA: (a\|b)*abb (textbook) | `abbabb` | Accept | Accept / Accept | Pass |
| S05 | ε-NFA: (a\|b)*abb (textbook) | `ab` | Reject | Reject / Reject | Pass |
| S06 | ε-NFA: (a\|b)*abb (textbook) | `abba` | Reject | Reject / Reject | Pass |
| S07 | ε-NFA: (a\|b)*abb (textbook) | `ε` | Reject | Reject / Reject | Pass |
| S08 | ε-NFA: (a\|b)*abb (textbook) | `abc` | Error (symbol) | Error: Symbol "c" is not in the alphabet {a, b}. | Pass |
| S09 | NFA: strings ending in 01 | `01` | Accept | Accept / Accept | Pass |
| S10 | NFA: strings ending in 01 | `101` | Accept | Accept / Accept | Pass |
| S11 | NFA: strings ending in 01 | `110` | Reject | Reject / Reject | Pass |
| S12 | NFA: strings ending in 01 | `ε` | Reject | Reject / Reject | Pass |
| S13 | NFA: strings ending in 01 | `2` | Error (symbol) | Error: Symbol "2" is not in the alphabet {0, 1}. | Pass |
| S14 | ε-NFA: a*b* | `ε` | Accept | Accept / Accept | Pass |
| S15 | ε-NFA: a*b* | `aabbb` | Accept | Accept / Accept | Pass |
| S16 | ε-NFA: a*b* | `b` | Accept | Accept / Accept | Pass |
| S17 | ε-NFA: a*b* | `ba` | Reject | Reject / Reject | Pass |
| S18 | ε-NFA: a*b* | `aba` | Reject | Reject / Reject | Pass |
| S19 | NFA: 3rd symbol from end is 1 | `100` | Accept | Accept / Accept | Pass |
| S20 | NFA: 3rd symbol from end is 1 | `0101` | Accept | Accept / Accept | Pass |
| S21 | NFA: 3rd symbol from end is 1 | `011` | Reject | Reject / Reject | Pass |
| S22 | NFA: 3rd symbol from end is 1 | `1` | Reject | Reject / Reject | Pass |
| S23 | ε-NFA: contains "ab" or "ba" | `ab` | Accept | Accept / Accept | Pass |
| S24 | ε-NFA: contains "ab" or "ba" | `ba` | Accept | Accept / Accept | Pass |
| S25 | ε-NFA: contains "ab" or "ba" | `aaa` | Reject | Reject / Reject | Pass |
| S26 | ε-NFA: contains "ab" or "ba" | `bbb` | Reject | Reject / Reject | Pass |
| S27 | ε-NFA: contains "ab" or "ba" | `ε` | Reject | Reject / Reject | Pass |

Result: **27 / 27 passed**.

## C. Exhaustive equivalence check

| Machine | NFA states | DFA states | Strings tested | Mismatches | Status |
|---|---|---|---|---|---|
| ε-NFA: (a\|b)*abb (textbook) | 11 | 5 | 2047 (length 0–10) | 0 | Pass |
| NFA: strings ending in 01 | 3 | 3 | 2047 (length 0–10) | 0 | Pass |
| ε-NFA: a*b* | 2 | 3 | 2047 (length 0–10) | 0 | Pass |
| NFA: 3rd symbol from end is 1 | 4 | 8 | 2047 (length 0–10) | 0 | Pass |
| ε-NFA: contains "ab" or "ba" | 7 | 7 | 2047 (length 0–10) | 0 | Pass |

## D. Malformed definition handling (UI)

| ID | Input problem | Expected | Actual |
|---|---|---|---|
| M01 | `start: q5` (not a state) | Error naming q5 | `Start state "q5" is not in the list of states.` |
| M02 | `q0 c q1` with alphabet {a,b} | Error with line number | `Line 5: symbol "c" is not in the alphabet {a, b}.` |
| M03 | `q0 a q9` (unknown target) | Error with line number | `Line 6: unknown target state "q9".` |

Evidence: `Screenshots/07-validation.png`, `08-invalid-symbol.png`, `09-malformed-definition.png`.
