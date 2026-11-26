import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diff, makeState, describe, lamportsToSol } from '../watch.mjs';

const A = 'AddrA', B = 'AddrB';

test('first sighting only sets a baseline', () => {
  const s = makeState();
  assert.deepEqual(diff(s, { [A]: 5e9 }), []);
});

test('a deposit past the threshold fires once', () => {
  const s = makeState();
  diff(s, { [A]: 5e9 });
  const ev = diff(s, { [A]: 8e9 }, { minSol: 1, cooldownMs: 0, now: 1000 });
  assert.equal(ev.length, 1);
  assert.equal(ev[0].direction, 'in');
  assert.equal(ev[0].deltaSol, 3);
});

test('dust below minSol is ignored but still updates the baseline', () => {
  const s = makeState();
  diff(s, { [A]: 5e9 });
  assert.deepEqual(diff(s, { [A]: 5.01e9 }, { minSol: 1, cooldownMs: 0, now: 1000 }), []);
  const ev = diff(s, { [A]: 9e9 }, { minSol: 1, cooldownMs: 0, now: 2000 });
  assert.equal(ev[0].deltaSol, 3.99);          // measured from the dusted baseline
});

test('cooldown suppresses a second alert inside the window', () => {
  const s = makeState();
  diff(s, { [A]: 5e9 });
  assert.equal(diff(s, { [A]: 7e9 }, { minSol: 1, cooldownMs: 60000, now: 1000 }).length, 1);
  assert.equal(diff(s, { [A]: 12e9 }, { minSol: 1, cooldownMs: 60000, now: 30000 }).length, 0);
  assert.equal(diff(s, { [A]: 13e9 }, { minSol: 1, cooldownMs: 60000, now: 90000 }).length, 1);
});

test('tracks several addresses independently', () => {
  const s = makeState();
  diff(s, { [A]: 1e9, [B]: 1e9 });
  const ev = diff(s, { [A]: 1e9, [B]: 4e9 }, { minSol: 1, cooldownMs: 0, now: 10 });
  assert.equal(ev.length, 1);
  assert.equal(ev[0].address, B);
});

test('describe reads like an alert, with or without a label', () => {
  const ev = { address: 'abcdefghijklmnop', deltaSol: -2, balanceSol: 1, direction: 'out' };
  assert.equal(describe(ev), 'OUT 2 SOL — abcd…mnop (now 1 SOL)');
  assert.equal(describe(ev, 'treasury'), 'OUT 2 SOL — treasury (now 1 SOL)');
});

test('lamports convert to SOL', () => assert.equal(lamportsToSol(2_500_000_000), 2.5));
