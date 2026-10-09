# Agentic Logistics PoC - Overall Plan

## Goal and current decisions

Create an interactive logistics proof of concept for Teoh Capital's Product Management and Engineering assessment.

- Use the existing outbound warehouse fulfillment scope.
- Demonstrate 3 agentic functions with rules that respond to current demo data.
- Use synthetic data and simulated staff roles.
- Require the reviewer to start each agent step.
- Provide a guided demo that takes about 5 minutes.
- Show agent actions prominently and make audit logs accessible.
- Use shared persistent data with a confirmed reset control.
- Target Codex Sites for deployment.
- Create unit and integration tests before app behavior.
- Compare automated test results before and after implementation.
- Use agent-browser for acceptance tests after all automated tests pass.
- Defer the PPT pack to separate work.
- Leave GitHub visibility under Mike's control. Preserve the planned memarin/logistics repository target.

This plan consolidates the decisions in the current conversation. Simulated decisions replace the earlier requirement for real AI calls.
The plan does not claim that implementation or tests are complete.

## Product scope

| Function | Agent behavior | Human boundary |
| --- | --- | --- |
| Order readiness and prioritization | Assess orders against stock and fulfillment state. Rank ready orders by due date. Explain blocked orders. | Escalate shortages and invalid data. |
| Task creation and assignment | Create configured tasks. Respect dependencies. Assign eligible workers by workload. | Staff perform physical work. Authorized staff configure task types. |
| Exception resolution and approval coordination | Explain shortages. Propose corrections after a simulated recount. Prepare approval requests. | Managers approve inventory adjustments, order cancellations, and shipment release. |

Use stable record IDs to resolve equal priorities and workloads. Unknown stock must remain unknown.
Do not create tasks or change stock from a stale decision.

Show this exact label beside every agent result:

> Simulated response - demonstrates intended agent behavior.

Separate proposals, accepted actions, blocked actions, and actions that await human approval.
Do not claim real model reasoning, production readiness, or measured operational savings.

Exclude transport route optimization, billing, payments, customer portals, inbound scenarios, real operational connections, and real customer data.
Exclude separate staff accounts and production multi-tenancy.

## Guided demo

| Time | Reviewer step | Expected result |
| --- | --- | --- |
| 0:00-0:30 | Inspect sample orders, roles, and the simulation notice. | Understand the problem and demo controls. |
| 0:30-1:15 | Run order assessment. | See explained priorities and an order blocked by a shortage. |
| 1:15-2:00 | Run task creation and assignment. | See assigned pick and pack tasks for a ready order. |
| 2:00-3:00 | Complete work as staff. Approve shipment release as manager. | See fulfillment progress, stock changes, and approval history. |
| 3:00-4:15 | Run shortage assessment. Confirm a simulated recount. Approve the correction as manager. | See the stock correction and refreshed readiness. |
| 4:15-5:00 | Run coordination for the corrected order. Inspect the audit log and result summary. | See resumed fulfillment and the agent's contribution. |

Each step must explain the action, active role, agent contribution, human boundary, and expected result.
Only an explicit reviewer action starts an agent step. Data changes invalidate affected decisions but do not trigger agent execution.
Keep guide progress local to each reviewer. Keep operational records shared.
If another reviewer changes or resets the dataset, explain the change and provide a valid next step.

## Interface and data

Provide Orders, Tasks, Exceptions and Approvals, Activity, and Settings views.
Keep the Agent actions panel prominent in the main workflow.
Each action must show its reason, affected records, outcome, and audit link.

Store orders, inventory, workers, task types, dependencies, tasks, exceptions, approvals, demo runs, and audit entries.
Track on-hand, reserved, and available stock with explicit units.
Preserve task configuration details for accepted tasks.

Use warehouse manager, fulfillment staff, and IT as simulated roles.
IT controls agent permissions and access grants. Managers and IT configure tasks within their permissions.
Check permissions on the backend for every mutation. A task name cannot bypass protected approval rules.

Record timestamps, demo run IDs, simulated actors, reasons, outcomes, and applicable before-and-after values.
Link proposals and approval decisions to the resulting actions.
Record denied actions and rejected proposals with their reasons.

Reset requires confirmation that all reviewers share the affected data.
Reset restores sample operational records under a new run ID.
Keep prior audit history accessible. Reject actions from earlier runs.

## Proposed architecture

Use a Sites-compatible web frontend and backend with D1 for shared structured data.
Keep simulation rules separate from mutation execution and approval checks.
Use backend validation, atomic database changes, record versions, and unique task constraints to protect shared state.
Keep browser storage limited to guide progress and interface preferences.
No model API key is required.

Before app implementation, confirm the Sites starter, runtime compatibility, storage binding, and deployment tools.
Define the schema, workflow transitions, endpoint contracts, and test fixtures before tests depend on those interfaces.
Use the project's actual package commands after setup. Do not assume commands or tools are available before checks.

## Implementation and verification sequence

| Phase | Work | Exit condition |
| --- | --- | --- |
| 1. Define contracts | Confirm the runtime. Define data, transitions, simulation rules, and endpoint contracts. | Interfaces and expected outcomes are explicit. |
| 2. Write tests first | Create fixtures, unit tests, and integration tests. Add only the harness and minimal interface scaffolding required to run tests. | Suites execute without setup faults. No app behavior exists yet. |
| 3. Capture baseline | Run both suites before app implementation. Record each test result and failure reason. | Failures identify missing behavior. Baseline evidence is preserved. |
| 4. Implement core workflow | Add shared data, roles, task configuration, inventory, approvals, reset, and audit records. | Core behavior meets the corresponding tests. |
| 5. Implement agents and guide | Add simulated decisions, action explanations, the guide, and interface states. | The complete demo works against shared data. |
| 6. Run post-implementation tests | Run the full unit and integration suites against the same fixtures. Compare results by stable test ID. | All automated tests pass. Changes to tests are explained separately. |
| 7. Run browser acceptance tests | Use agent-browser against the local preview after Phase 6 passes. | Required flows pass with recorded evidence. |
| 8. Fix defects | Fix defects. Rerun affected tests. Repeat failed browser checks. | Final source passes both complete automated suites and required browser checks. |
| 9. Deploy and hand off | Build and publish through Sites. Check the deployed workflow with agent-browser. Prepare source and run instructions. | Deployment succeeds and the final browser smoke test passes. |

Do not weaken expected outcomes to make tests pass.
Do not use skipped tests, unconditional success messages, or mocks of database behavior as acceptance evidence.
Use fixed clocks where time affects rule outcomes.
Record any added, removed, or changed test separately from the baseline comparison.

## Unit test plan

Test pure simulation and workflow rules with fixed fixtures.

| IDs | Coverage | Required assertions |
| --- | --- | --- |
| U01-U04 | Readiness and priority | Enough stock permits readiness. Shortages block orders. Missing stock remains unknown. Due dates and stable IDs determine order. |
| U05-U06 | Invalid orders | Invalid quantities and missing record references block the affected order without blocking valid orders. |
| U07-U10 | Task plans and assignments | Enabled configured tasks appear. Dependencies remain valid. Eligibility and workload determine assignments. No eligible worker causes escalation. |
| U11-U12 | Task configuration | Invalid dependencies and cycles are rejected. Disabled types produce no new tasks. |
| U13-U14 | Exception proposals | Shortage values use current facts. A recount correction remains a proposal until manager approval. |
| U15-U17 | Permissions and transitions | Unauthorized actions fail. Pack requires pick completion. Release requires completed work and manager approval. |
| U18-U20 | Decision validity | Changed records invalidate proposals. Revoked permissions prevent execution. Rejected requests require a nonblank explanation. |

## Integration test plan

Exercise backend endpoints with an isolated database that uses the deployed schema.
Inspect persisted records and audit entries after each scenario.
Use the actual database test runtime for persistence and atomicity checks.

| IDs | Scenario | Required assertions |
| --- | --- | --- |
| I01 | Assess and coordinate a ready order | Decisions, tasks, assignments, stock reservations, and audit links agree. |
| I02 | Recover from a shortage | Proposal changes no stock. Approval applies the exact correction. Reassessment permits resumed coordination. |
| I03 | Complete and release an order | Invalid task sequence fails. Release requires approval. Stock consumption occurs once. |
| I04 | Retry coordination and completion | No duplicate tasks, reservations, or inventory effects occur. |
| I05 | Compete for stock | Concurrent orders cannot reserve more units than exist. |
| I06 | Submit conflicting approval decisions | Only one terminal decision applies. Repeated approval causes no extra mutation. |
| I07 | Use simulated roles | Fulfillment and IT cannot approve protected actions. Revocation blocks the next mutation. |
| I08 | Reject a proposal | A reason is required and recorded. No protected change occurs. |
| I09 | Execute a stale proposal | Changes to source records block stale execution. |
| I10 | Reset with a pending action | Sample records return under a new run ID. Old actions fail. Prior audit entries remain accessible. |
| I11 | Use two sessions and reload | Both sessions read the same accepted records after refresh. |
| I12 | Fail a multi-record write | No partial tasks, stock changes, approvals, or misleading success remain. |
| I13 | Configure custom tasks | A valid extra task participates in coordination. Invalid configuration cannot change accepted records. |

Use these concrete fixtures for the main cases:

- Ready order: 6 units of SKU-A with 12 units on hand.
- Shortage order: 5 units of SKU-B with 2 units on hand.
- Simulated recount: 6 units of SKU-B on hand, subject to manager approval.
- Concurrency case: 2 orders each request 8 units of SKU-A with 12 units on hand.
- Worker case: 2 eligible workers with different workloads and 1 ineligible worker.
- Invalid cases: zero, negative, missing, and non-finite quantities plus cyclic task dependencies.

## Baseline and final comparison

Capture unit and integration results before app behavior and after implementation.
Keep test IDs and fixtures stable across both runs.

| Test ID | Expected outcome | Baseline result and reason | Final result and reason | Test changed? |
| --- | --- | --- | --- | --- |
| Each unit and integration test | Defined before implementation | Record the actual result | Record the actual result | Explain each change |

Save machine-readable results and a human-readable comparison beside this plan in docs.
Include executed counts, passes, failures, skipped tests, environment details, and source revision or content identifier.
Keep test setup faults separate from expected failures for absent behavior.
Do not accept a broken harness as the baseline.

## Agent-browser acceptance test plan

Start browser acceptance tests only after every post-implementation unit and integration test passes.

| IDs | Browser scenario | Pass condition |
| --- | --- | --- |
| B01 | Complete the guided demo | All 3 functions and the correction scenario are clear within about 5 minutes without a presenter. |
| B02 | Inspect simulation labels | Every agent result identifies simulated behavior and separates proposals from accepted actions. |
| B03 | Inspect actions and audit links | The prominent panel shows reasons, outcomes, affected records, and correct audit entries. |
| B04 | Change demo data | Explicit reruns use current data. Stale results cannot mutate records. |
| B05 | Switch roles and make decisions | Approval, rejection, and unauthorized actions produce the expected state and history. |
| B06 | Use two browser sessions | Accepted changes become visible in both sessions. Reset explains shared effects and invalidates old actions. |
| B07 | Use keyboard and small screens | Core controls remain accessible on desktop, tablet, and phone layouts. |
| B08 | Encounter empty, stale, and error states | The interface explains the state and does not claim false success. |

Record pass or fail, screenshots, observed behavior, and defects.
Fix defects before release. Repeat failed browser scenarios after fixes.
Run B01-B03 and the shared-state reset check as the final deployed smoke test.
Use synthetic records for the deployed checks and restore the sample dataset afterward.

## Deployment and deliverables

Target Sites with D1 persistent storage. Check actual deployment access before relying on publication.
Use Sites tools when the execution session exposes them.
If a CLI session lacks Sites tools, publish the compatible project through ChatGPT web or the desktop app.
Confirm reviewer access to the deployed link before submission.

Deliver the interactive prototype, product roadmap, source, run instructions, and test evidence.
Do not create the PPT pack in this implementation phase.
Do not change repository visibility as part of this plan.

## Product roadmap

| Horizon | Outcome | Evidence required before expansion |
| --- | --- | --- |
| Assessment PoC | Demonstrate simulated agent coordination, human authority, and traceable actions. | Automated test comparison, browser acceptance results, and a deployed demo. |
| Workflow validation | Assess value with warehouse staff. | Baselines for coordination effort, assignment corrections, and exception resolution time. |
| Real AI pilot | Replace simulated decisions with model proposals under the same controls. | Accuracy checks, cost limits, service access, and approval compliance. |
| Operational pilot | Connect one real operational system. | Confirmed access, data rules, operator feedback, and reliability checks. |

Future horizons are proposals. Do not treat future horizons as current implementation scope.

## Release gate

- Pass every unit and integration test.
- Complete the baseline-to-final comparison.
- Pass required agent-browser acceptance scenarios.
- Confirm task, stock, approval, reset, and audit integrity.
- Keep simulation labels visible throughout the demo.
- Confirm successful Sites deployment and reviewer access.
- Pass the deployed browser smoke test.
- Record material limitations without claims of real AI or measured operational savings.

## Planning sources

- Original case-study request and subsequent decisions in this conversation.
- Earlier scope, initiative brief, and requirements informed this plan.
- Current conversation decisions replace the earlier real-AI requirement.
- [Official Sites documentation](https://learn.chatgpt.com/docs/sites?surface=app).
