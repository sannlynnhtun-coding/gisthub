# Implementation Plan: Signed-in Dashboard Analytics

Branch: main. Spec: [spec.md](spec.md).

## Technical Context
Blazor WebAssembly, existing profile state, GitHub HTTP service and GitPulse components. No package or persisted schema change. The checkout lacks setup-plan.ps1 and a plan template, so use the active feature directory recorded in .specify/feature.json.

## Constitution Check
No constitution file is present. Project rules govern. Preserve account isolation, public repository scope, workspace navigation, inspector and export behavior. Design gates pass.

## Phase 0
See [research.md](research.md).

## Phase 1
See [data-model.md](data-model.md), [UI contract](contracts/dashboard.md), and [quickstart.md](quickstart.md). Implement feature in Home and an appended analytics component. Verify account identity, pagination boundaries, accessible navigation and the existing inspector. Design gates still pass.
