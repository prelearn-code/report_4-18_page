# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

D-Storage Sandbox — a pure frontend interactive visualization playground that demonstrates a blockchain-enabled cloud data deduplication and hybrid auditing protocol. It accompanies the paper *"Blockchain-Enabled Efficient Deduplication and Mixed Auditing for Dynamic Cloud Data"*. All "cryptographic computation" is simulated via `setTimeout` + CSS animations; no real crypto runs in the browser.

## Commands

```bash
npm run dev      # Start dev server (Vite, with --host)
npm run build    # Production build to dist/
npm run preview  # Preview production build
```

## Architecture

**Stack:** React 18, Vite 5, Tailwind CSS 3, Framer Motion 11, Lucide React

**Entry point:** `src/main.jsx` mounts `<App />` wrapped in `<StoreProvider>`.

**State management:** `src/store.jsx` — React Context + `useReducer`. Single global store holds:
- `activeTab` — which of 5 modules is shown
- `currentFile` — simulated file object (blocks, owner, status, cryptographic identifiers)
- `contract` — simulated on-chain state (fees, deposits, challenge, result)
- `protocol.availableStages` — the full state machine enum

**Layout:** `src/App.jsx` — dark-themed shell with collapsible left sidebar (Node State Agent showing file/params), center area (tab-switched module), and right sidebar (protocol state machine track). Tabs switch via `SET_TAB` dispatch with `AnimatePresence` transitions.

**5 modules in `src/modules/`:**

| Module | File | What it visualizes |
|---|---|---|
| Deduplication | `Deduplication.jsx` | Client-side block splitting, off-chain dedup check, unique-block authenticator generation, upload + on-chain registration |
| Retrieve | `Retrieve.jsx` | Identity verification, CSP download of C + Key_i, local decryption of private blocks, file reassembly |
| HVT Update | `HVTUpdate.jsx` | Hash Version Tree topology — Modify/Delete/Insert scenarios with animated tree nodes showing (hash, weight, index) |
| Hybrid Audit | `Audit.jsx` | Smart contract challenge-proof cycle: request → challenge → proof → verify → settlement (with tamper toggle for the failure branch) |
| Data Market | `Market.jsx` | Ownership transfer: buyer/seller deposits, CSP owner record update, sk transfer, buyer verification, escrow settlement |

**Styling:** Tailwind utility classes with custom glass-morphism components (`glass-panel`, `glass-card` in `src/index.css`). Each module uses a consistent left-panel (steps + state) / right-panel (visual diagram + summary cards) layout.

**Simulation pattern used across all modules:**
- Steps defined as arrays of `{ id, title, summary, formula }` objects
- `runCurrentStep()` async function chains `setTimeout` delays between state updates
- `flowObject` state drives animated overlays (flying packets, verification badges) via Framer Motion `AnimatePresence`
- Each module has its own local state + a `reset*()` function, and syncs to global store via `dispatch`

**Key design decisions from `plan.md`:**
- No real cryptography — visual simulation only
- State visualization replaces data persistence (no IndexedDB)
- Every action logs human-readable descriptions to the global terminal
- The state machine in `protocol.availableStages` is the canonical list of phases a file can be in
