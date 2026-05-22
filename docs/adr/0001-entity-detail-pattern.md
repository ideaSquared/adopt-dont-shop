# ADR 0001 — Entity-Detail Pattern

- Status: Accepted
- Date: 2026-05-22
- Linear: ADS-654 (foundation for ADS-650 split-pane refactor)

## Context

The three React apps (`app.admin`, `app.rescue`, `app.client`) each implement
entity-detail views differently:

- `app.admin` opens stacked modals on top of list pages (`PetDetailModal`,
  `RescueDetailModal`, `SendEmailModal`, verification modals, …). With several
  modals visible at once, users lose their place in the underlying list and
  deep-linking is awkward.
- `app.rescue` and `app.client` mix modal flows with full-page navigation,
  inconsistently from screen to screen.

We want a single preferred pattern shared across apps so engineers don't
re-litigate the choice on every list-and-detail screen, and so future work
(deep-linking, keyboard shortcuts, layout density) can move forward without
auditing each surface.

## Decision

**The preferred pattern for entity-detail views is a split-pane layout: a list
of entities on the left, the selected entity's detail on the right.**

Concretely:

- A reusable `SplitPaneDetail` component ships from `@adopt-dont-shop/lib.components`.
- The list keeps its filters, search, and pagination — nothing moves into the
  detail pane.
- Selecting a row updates the detail pane in place. Selection is driven by an
  `id` that lives in the URL (e.g. `/rescues/:rescueId`), so deep links and
  back/forward navigation work.
- The empty state (no selection) is part of the detail pane, not a placeholder
  page.
- On narrow viewports the layout collapses: the list is shown when no entity is
  selected, and the detail replaces the list when one is.

This is a layout pattern, not a data pattern. Pages still own their queries,
mutations, filters, and toolbars.

## When modals are still appropriate

Split-pane is the default. Modals remain the right choice for:

- **Confirmations** — destructive actions, bulk-action recap, "are you sure?"
  prompts.
- **Single-field or single-question edits** — renaming an item, picking a date,
  resetting a password.
- **Step-by-step flows** that are clearly orthogonal to the list, where the
  user must finish or cancel before continuing (e.g. verification wizard,
  invitation flow).
- **Quick previews launched from a non-list surface** — e.g. opening a related
  entity from a dashboard tile, where there is no list to anchor the
  split-pane.

If you find yourself stacking two modals, the second one is almost certainly a
sign that the first should have been a split-pane detail.

## Rationale

- **Context preservation.** The list stays visible, so users keep their search,
  filters, sort, and pagination state while inspecting individual records.
- **Bulk-friendly.** Admin workflows often involve scanning many records;
  split-pane lets you click through a list without closing/opening a modal
  each time.
- **Deep-linking.** A URL like `/rescues/:rescueId` is just another selection;
  the page renders the same way whether it was reached by clicking a row or by
  pasting a link.
- **Stops modal stacking.** The current admin codebase has flows that open
  three modals on top of each other (detail → verification → confirmation).
  That's a UX smell the split-pane removes by giving non-blocking detail a
  proper home.
- **Foundation for ADS-650.** The upcoming split-pane refactor needs one
  agreed component to migrate onto.

## Alternatives considered

- **Full-page detail (`/rescues/:rescueId` as a separate route, list left
  behind).** Simpler to build but loses list context and forces a round-trip
  through filters/pagination on every selection. Rejected for list-heavy admin
  surfaces; still acceptable for client-facing flows where deep context is
  needed (e.g. pet profile pages for adopters).
- **Keep modals everywhere.** Cheapest in the short term, but the stacking
  problem already exists and ADS-650 explicitly asks us to move away.
- **Drawer / off-canvas panel.** A middle ground, but suffers the same
  context-blocking problem as a modal on smaller screens, and is only a slight
  improvement on desktop. Not worth a separate primitive.

## Component API

The component lives at `lib.components/src/components/layout/SplitPaneDetail`.

```tsx
import { SplitPaneDetail } from '@adopt-dont-shop/lib.components';

<SplitPaneDetail
  items={rescues}
  getItemId={(r) => r.rescueId}
  selectedId={selectedId}
  onSelect={setSelectedId}
  renderListItem={(rescue, { isSelected }) => (
    <RescueRow rescue={rescue} isSelected={isSelected} />
  )}
  renderDetail={(rescue) => <RescueDetail rescue={rescue} />}
  emptyDetail={<p>Select a rescue to view details.</p>}
  emptyList={<p>No rescues match your filters.</p>}
  data-testid='rescues-split-pane'
/>;
```

Key properties:

- The component is generic in the list-item shape (`<T>`); no `any`.
- Selection is controlled — pages own `selectedId`, typically driven from the
  URL.
- Rendering of each list row and the detail body is delegated to the page;
  the component owns only the layout and the empty/responsive states.
- Below `768px` the detail collapses over the list; pressing the built-in
  "Back to list" control clears the selection.

## Adoption / migration plan

- **Reference implementation:** `app.admin` ships a small read-only demo route
  at `/users/split-pane` that uses the new component against the admin user
  list. This is intentionally a low-risk surface — the existing modal-based
  Users page is unchanged.
- **ADS-650 (next ticket):** migrate Rescues, Pets, Applications, and Users
  list pages off modal stacks onto `SplitPaneDetail`. Confirmation /
  verification flows stay as modals per the rules above.
- **Rescue and client apps:** adopt opportunistically as their list pages are
  touched. No big-bang rewrite.

## Consequences

- New shared component to maintain.
- Pages currently using modal detail will eventually need a small refactor
  (move the modal body into a `renderDetail`-shaped component, delete the
  modal trigger). That's planned work for ADS-650, not this ticket.
- Confirmation/verification modals stay where they are.
