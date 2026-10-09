# Relay logistics PoC

Relay demonstrates three simulated agents for outbound warehouse fulfillment. No model API key is required.

## Local setup

Use Node.js 22.13 or later. From the project directory, run:

```sh
npm ci
npm test
npm run typecheck
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_uneven_famine.sql
npm run dev -- --port 5173
```

Apply the SQL only to a new local database. Open the URL from the dev command.

For a compiled Worker preview, run `npm start -- --port 5174` after the build and local migration.
If the machine blocks the default Wrangler config directory, set `XDG_CONFIG_HOME` to a writable directory before the start command.

## Guided demo

Click Start guided demo. Start each step yourself. The guide changes the simulated role when a staff or manager step requires that role.

Release ORD-1042 after pick and pack completion. Propose the synthetic SKU-B recount from 2 to 6. Approve the correction as manager. Reassess ORD-1043 and resume fulfillment.

Inspect Agent actions and its audit link. Reset restores sample data for every reviewer and keeps earlier audit history.

## Tests and evidence

- `npm run test:unit`: 25 unit and browser state tests.
- `npm run test:integration`: 21 endpoint tests against actual Miniflare D1.
- `npm test`: all 46 tests.
- `docs/test-comparison.html`: baseline and final results, with test changes disclosed.
- `docs/browser-acceptance.json`: agent-browser actions and assertions.
- `docs/phase-01-completion.html` through `docs/phase-08-completion.html`: completed phase reports.
- `docs/product-roadmap.html`: product roadmap and proposed pilot gates.

## Structure

`domain/rules.mjs` contains simulated decisions and protected workflow transitions. `domain/api.mjs` saves mutations and audit entries atomically through D1 version checks. `domain/client-state.mjs` prevents stale browser responses and lets the guide use shared results. `app/page.tsx` contains the guided interface.

## Sites deployment

The existing Site ID and D1 binding are in `.openai/hosting.json`. Sites applies the schema migration during publication. The Sites source helper requires a source commit and push before publication. The Site is not deployed.

The app source is maintained in [memarin/logistics](https://github.com/memarin/logistics). The repository is private. Repository visibility remains unchanged.

## Scope limits

All records and roles are synthetic. Role controls demonstrate intended authorization and do not represent real user authentication. The rules respond to current data and do not call an AI model. Shared JSON state suits this small PoC. Production use needs real identity, a normalized schema, and operational controls.

The PPT pack remains separate. The five-minute guide is a target; human completion time remains unmeasured.
