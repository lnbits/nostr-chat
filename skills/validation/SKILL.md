---
name: validation
description: Use when choosing checks to run after a change, adding tests, debugging failures, or working with the local Playwright and build workflows in this repo.
---

# Validation

## Overview

This skill helps pick and run the required validation plan for a change in this repo. Use it for post-edit quality checks, unit-test targeting, relay-backed Playwright runs, build verification, and failure triage.

## Required Post-Change Loop

After every code change, Codex should treat the following as the default done-state checklist:

1. Run `npm run quality:all`
2. Run `npm run test:unit`
3. Run the closest matching `npm run test:e2e:local:*` smoke test
4. If the change spans multiple areas or has no narrow smoke target, run `npm run test:e2e:local`
5. If any step cannot run, report what was attempted, what remains unverified, and the exact blocker

## Validation Rules Of Thumb

- Default code-change loop: `npm run quality:all`, `npm run test:unit`, then the nearest `npm run test:e2e:local:*` smoke
- If the change affects auth, session restore, contacts, relays, DMs, or groups: always include the nearest `npm run test:e2e:local:*` smoke test
- If the change affects multiple areas at once: prefer `npm run test:e2e:local` over guessing too narrowly
- If the change affects packaging or platform entry points: run the smallest matching build command

## E2E Notes

- Local e2e runs use `scripts/run-e2e-local.cjs`
- That script brings up the relay stack from `docker-compose.e2e.yml`, waits for relay ports `7000` and `7001`, runs Playwright, and tears the stack down again
- `src/testing/e2eBridge.ts` exposes deterministic browser hooks for bootstrap, refresh, logout, group epoch rotation, and scripted message sends
- `playwright.config.ts` starts the app with `npm run dev:e2e`, uses Chromium, and records traces, screenshots, and video

## Typical Workflow

1. Map the changed files to the nearest owning tests.
2. Run `npm run quality:all`.
3. Run `npm run test:unit`.
4. Run the nearest targeted local e2e smoke test, or the full local suite if the change spans multiple areas.
5. If a test fails, check whether the bug belongs in UI state, runtime output, or persistence before broadening the fix.

## Build Targets

- Web build: `npm run build`
- Electron dev build: `npm run dev:electron`
- Electron package directory output: `npm run build:electron:dir`
- Platform packages:
  - `npm run build:electron:mac`
  - `npm run build:electron:win`
  - `npm run build:electron:linux`

## References

- `references/test-matrix.md`
