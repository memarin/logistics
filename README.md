# Relay logistics PoC

Relay demonstrates one simulated exception-resolution agent with three capabilities for outbound warehouse fulfillment. No model API key is required.

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

A first-load notice explains synthetic data and no connected AI service. Start each agent step yourself. Select the required role explicitly. Staff confirm quantity, condition, and physical work. Managers approve exact recovery and shipment proposals.

Investigate ORD-1043. Inspect receipts and shift notes. Confirm usable or damaged stock as staff. Compare recovery options and approve the exact correction or hold as manager. Execute recovery, complete pick and pack as staff, then approve shipment release. Run the final agent check.

Manager, staff, and IT selections change the landing view, navigation, and available actions. IT controls role access, agent grants, and availability. If no eligible staff are available, execution pauses. Restore availability as IT, then explicitly resume as manager. Reject a correction to observe a hold recommendation that uses the rejection reason.

Inspect Agent actions and its audit link. Reset restores sample data for every reviewer and keeps earlier audit history.

## Tests and evidence

- `npm run test:unit`: 50 unit, recovery, guide, and browser state tests.
- `npm run test:integration`: 31 endpoint tests against actual Miniflare D1.
- `npm test`: all 81 tests.
- `docs/recovery-test-report.html`: replacement feature checks and pre/post results.
- `docs/recovery-browser.json`: current browser actions and outcome assertions.
- `docs/test-comparison.html`: baseline and final results, with test changes disclosed.
- `docs/browser-acceptance.json`: agent-browser actions and assertions.
- `docs/phase-01-completion.html` through `docs/phase-08-completion.html`: completed phase reports.
- `docs/product-roadmap.html`: product roadmap and proposed pilot gates.

## Structure

`domain/rules.mjs` contains simulated decisions and protected workflow transitions. `domain/api.mjs` saves mutations and audit entries atomically through D1 version checks. `domain/client-state.mjs` prevents stale browser responses and lets the guide use shared results. `app/page.tsx` contains the guided interface.

## Sites deployment

The existing Site ID and D1 binding are in `.openai/hosting.json`. Sites applies the schema migration during publication. The Sites source helper requires a source commit and push before publication. The source is ready for publication through Sites.

The app source is maintained in [memarin/logistics](https://github.com/memarin/logistics). The repository is private. Repository visibility remains unchanged.

## Scope limits

All records and roles are synthetic. Role controls demonstrate intended authorization and do not represent real user authentication. The rules respond to current data and do not call an AI model. Shared JSON state suits this small PoC. Production use needs real identity, a normalized schema, and operational controls.

The PPT pack remains separate. The five-minute guide is a target; human completion time remains unmeasured.
