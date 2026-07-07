// lib/py/harness.mjs — the SINGLE source of truth for the Python test harness.
//
// Imported by BOTH lib/pyodide-worker.ts (the in-browser runner) and
// scripts/validate-tests.mjs (the Node-hosted Pyodide validator), so a reference
// solution that passes validate-tests grades identically in the app. Plain .mjs
// (not .ts) so Node can import it directly with no build step, and webpack can
// still bundle it into the worker.
//
// Given the user's code and a list of tests (Python list of dicts), it exec's the
// user code in a FRESH namespace per test (isolation so aliasing/mutation tests
// are sound), seeds randomness, installs stdin, evaluates expression -> actual and
// expected -> expected, and compares by mode. Returns a JSON string of outcomes.
//
//  MUST-FIX #1: `float` compare recurses over scalars, lists, tuples, AND dicts.
//  MUST-FIX #2: `unordered` uses sorted(); restricted to lists of mutually-
//               comparable scalars (author contract) — mixed/unhashable elements
//               raise, which is caught per-test and reported as an error.
//
// String.raw is REQUIRED: the harness contains split('\n'), which must reach
// Python as a backslash-n escape, not an actual newline.

export const HARNESS_PY = String.raw`
import json, io, sys, random, builtins, numbers

def __ase_isclose(a, b, tol):
    return abs(a - b) <= tol

def __ase_float_eq(actual, expected, tol):
    # Recursive tolerance comparison. Structure must match exactly; only the
    # leaf numbers are compared with a tolerance.
    # bool is a subclass of int -> treat bools as exact, not as numbers.
    if isinstance(expected, bool) or isinstance(actual, bool):
        return actual == expected
    if isinstance(expected, numbers.Number) and isinstance(actual, numbers.Number):
        try:
            return __ase_isclose(actual, expected, tol)
        except TypeError:
            return actual == expected
    if isinstance(expected, dict):
        # dict: keys matched EXACTLY, values recursively (ps3 TF-IDF: dict[str,float]).
        if not isinstance(actual, dict):
            return False
        if set(actual.keys()) != set(expected.keys()):
            return False
        return all(__ase_float_eq(actual[k], expected[k], tol) for k in expected)
    if isinstance(expected, (list, tuple)):
        # list vs tuple are NOT interchangeable (Python semantics preserved).
        if type(actual) != type(expected):
            return False
        if len(actual) != len(expected):
            return False
        return all(__ase_float_eq(a, e, tol) for a, e in zip(actual, expected))
    # Fallback for non-numeric leaves (str, None, etc.).
    return actual == expected

def __ase_compare(actual, expected, mode, tol, strict_type):
    if mode == 'float':
        return __ase_float_eq(actual, expected, tol)
    if mode == 'unordered':
        # RESTRICTION (author contract): lists of mutually-comparable scalars
        # only. sorted() raises TypeError on unhashable/mixed elements; that
        # propagates to the per-test try/except and is reported as an error, so
        # authors know to switch to 'exact' on a pre-sorted expression.
        return sorted(actual) == sorted(expected)
    # exact
    if strict_type and type(actual) != type(expected):
        return False
    return actual == expected

class __AseInput:
    # Replacement for input(): pops the next queued stdin line. Mirrors CPython:
    # input() strips the trailing newline; EOF raises EOFError.
    def __init__(self, lines):
        self._lines = list(lines)
        self._i = 0
    def __call__(self, prompt=''):
        if prompt:
            print(prompt, end='')
        if self._i >= len(self._lines):
            raise EOFError('EOF when reading a line')
        line = self._lines[self._i]
        self._i += 1
        return line

def __ase_run_tests(user_code, tests_json):
    tests = json.loads(tests_json)
    results = []
    for t in tests:
        name = t.get('name') or t.get('expression')
        mode = t.get('compare') or 'exact'
        tol = t.get('tolerance')
        if tol is None:
            tol = 1e-6
        strict_type = bool(t.get('strictType'))
        stdin_text = t.get('stdin')
        hidden = bool(t.get('hidden'))

        expected_repr = ''
        actual_repr = ''
        error = None
        passed = False
        try:
            # Fresh namespace per test -> no leakage between tests.
            ns = {}
            random.seed(0)
            # Install the per-test stdin queue for input().
            lines = stdin_text.split('\n') if stdin_text is not None else []
            # A trailing newline yields a spurious empty final entry; drop it.
            if lines and lines[-1] == '':
                lines = lines[:-1]
            builtins.input = __AseInput(lines)
            # Exec the user's code, then evaluate expected + expression against it.
            exec(user_code, ns)
            expected_val = eval(t['expected'], ns)
            expected_repr = repr(expected_val)
            actual_val = eval(t['expression'], ns)
            actual_repr = repr(actual_val)
            passed = bool(__ase_compare(actual_val, expected_val, mode, tol, strict_type))
        except Exception as e:
            # One raising test must not abort the batch.
            error = f'{type(e).__name__}: {e}'
            passed = False
        finally:
            # Restore the real input() so a later 'run' request isn't affected.
            builtins.input = __ase_original_input
        results.append({
            'name': name,
            'pass': passed,
            'expectedRepr': expected_repr,
            'actualRepr': actual_repr,
            'error': error,
            'hidden': hidden,
        })
    return json.dumps(results)

# Snapshot the genuine input() so the harness can restore it after each batch.
__ase_original_input = builtins.input
`;
