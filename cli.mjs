#!/usr/bin/env node
// Usage: node cli.mjs --rpc <url> --webhook <url> [--min 0.1] [--cooldown 60] [--interval 20] <address[:label>]...
import { diff, makeState, describe, getBalance } from './watch.mjs';

function take(name) { const i = process.argv.indexOf('--' + name); if (i === -1) return undefined; const v = process.argv[i + 1]; process.argv.splice(i, 2); return v; }
const rpc = take('rpc');
const webhook = take('webhook');
const minSol = Number(take('min') ?? 0.1);
const cooldownMs = Number(take('cooldown') ?? 60) * 1000;
const intervalMs = Number(take('interval') ?? 20) * 1000;
const targets = process.argv.slice(2).map((a) => { const [address, label] = a.split(':'); return { address, label }; });

if (!rpc || !webhook || targets.length === 0) {
  console.error('usage: node cli.mjs --rpc <url> --webhook <url> [--min 0.1] [--cooldown 60] [--interval 20] <address[:label>]...');
  process.exit(2);
}

const state = makeState();
const labels = new Map(targets.map((t) => [t.address, t.label]));

async function fire(text, ev) {
  await fetch(webhook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, ...ev }) });
}

async function tick() {
  const balances = {};
  for (const t of targets) {
    try { balances[t.address] = await getBalance(rpc, t.address); } catch (e) { console.error(`balance ${t.address}: ${e.message}`); }
  }
  for (const ev of diff(state, balances, { minSol, cooldownMs })) {
    const text = describe(ev, labels.get(ev.address));
    console.log(new Date().toISOString(), text);
    await fire(text, ev).catch((e) => console.error('webhook:', e.message));
  }
}

let stopping = false;
process.on('SIGINT', () => { stopping = true; });
await tick();
while (!stopping) { await new Promise((r) => setTimeout(r, intervalMs)); if (!stopping) await tick(); }
