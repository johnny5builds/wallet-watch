// wallet-watch: poll a Solana address (or list) for balance deltas, fire a webhook once per change.
// Read-only. No keys. Dedupe + cooldown so a busy wallet can't flood your endpoint.
export const lamportsToSol = (l) => l / 1e9;

export function makeState() {
  return { last: new Map(), lastFired: new Map() };
}

// Returns the events that should fire given current balances.
export function diff(state, balances, { minSol = 0, cooldownMs = 60000, now = Date.now() } = {}) {
  const out = [];
  for (const [addr, lamports] of Object.entries(balances)) {
    const sol = lamportsToSol(lamports);
    const prev = state.last.get(addr);
    state.last.set(addr, lamports);
    if (prev === undefined) continue;                      // first sighting is the baseline
    const delta = sol - lamportsToSol(prev);
    if (Math.abs(delta) < minSol) continue;
    const fired = state.lastFired.get(addr);
    if (fired !== undefined && now - fired < cooldownMs) continue;
    state.lastFired.set(addr, now);
    out.push({ address: addr, deltaSol: Number(delta.toFixed(9)), balanceSol: Number(sol.toFixed(9)), direction: delta > 0 ? 'in' : 'out' });
  }
  return out;
}

export function describe(ev, label) {
  const who = label || ev.address.slice(0, 4) + '…' + ev.address.slice(-4);
  return `${ev.direction === 'in' ? 'IN ' : 'OUT'} ${Math.abs(ev.deltaSol)} SOL — ${who} (now ${ev.balanceSol} SOL)`;
}

export async function getBalance(rpc, address) {
  const r = await fetch(rpc, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address] }),
    signal: AbortSignal.timeout(15000),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j.result.value;
}
