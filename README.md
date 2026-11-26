# wallet-watch

Watch one or more Solana addresses for balance changes and fire a webhook when money moves. Read-only, no keys, zero dependencies, tested.

```
node cli.mjs --rpc https://api.mainnet-beta.solana.com --webhook https://example.com/hook \
  --min 0.5 --cooldown 120 Trezorr9abc...:hot-wallet 7xKX...:team
```

Every change over `--min` SOL fires once, then the same address is muted for `--cooldown` seconds so a churning wallet can't flood your endpoint. The first poll only sets a baseline. `SIGINT` stops it cleanly.

| flag | default | meaning |
|---|---|---|
| `--rpc` | required | Solana RPC (use your own; the public one rate-limits) |
| `--webhook` | required | POSTed `{"text": "...", "address", "deltaSol", "balanceSol", "direction"}` |
| `--min` | 0.1 | ignore smaller moves (dust) |
| `--cooldown` | 60 | seconds before the same address may alert again |
| `--interval` | 20 | seconds between polls |

`npm test` covers the delta maths, dust filtering, cooldown, multi-wallet tracking and message format.

Useful for treasury monitoring, team-wallet watching, or a first warning that a hot wallet is being drained. Point the webhook at Telegram, Discord or Slack.
