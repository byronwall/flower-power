---
name: byron-ui-taste
description: Byron Wall's recurring UI and diagram preferences — density, borders, layout stability, links, truncation, hierarchy, interaction, and diagram layout. Use before designing, restyling, "punching up", or reviewing any interface or technical diagram for Byron (the daily-planning viewer, Modeler/Rel app UI, dialogs, dashboards), and compose it with `impeccable`, `high-quality-application-ui-design`, and `emil-design-eng`. These are corrections Byron has given repeatedly; apply them by default instead of waiting for him to ask again.
---

# Byron UI Taste

Byron reviews UI on a large monitor and works through it quickly. He wants calm, dense, stable screens where the most useful thing is obvious. Each rule below is a correction he has made more than once. Treat a violation as a bug.

## Density

- Default to dense. "Over-padded", "airy", "floaty", "too cardy" and "over drop-shadowed" are his most frequent complaints. Tighten padding before adding anything.
- Group with sections and whitespace, not with stacked cards. Never nest cards or borders; find an inline treatment instead.
- Keep buttons sized to their job. Large generic buttons (search, open draft) read as wasted space.

## Borders, pills, and color

- No border around content that is one line tall. Bordered one-liners read as "chipification".
- No side or left accent borders on cards, contents lists, or callouts.
- Pills only where they carry state, and sparingly. A screen full of pills is "a mottled mess".
- Prefer an icon or color on a consistent left rail for status over a text pill that pushes titles around.
- Code blocks are light, not black, and wrap by default.
- Fills are soft and low-chroma: panel, row, node and group backgrounds use pale tints, never saturated color. Save saturated color for data marks (a metric's value, an edge, a status dot). Text on a tint must read easily; blue text on a blue fill is a common miss. ("Background colors are too strong and saturated"; "too saturated… almost look like nodes".)

## Layout stability

- Zero layout shift. Results arriving, an icon appearing, a confirmation showing, or a toast firing must not move other content. Reserve space and use fixed heights.
- Toasts go in a corner, not as a banner.
- Use popovers instead of disclosures that expand content at the bottom of the page.
- Progressive columns get a fixed width each; widths must not change as content changes.
- A copy action confirms with a subtle animation on the clicked element, not with inserted text.

## Links

- Links are colored text only: same weight as body text, no underline, no background fill.
- All link types share one subtle hover. Do not give one type (for example tasks) a different hover.
- Never break a link across lines.
- External references get a small source icon (GitHub, Linear, Jira, Slack, task). Detect references only when they are standalone tokens, never inside branch names or paths.

## Truncation and disclosure

- In lists, show the full text. Lists are for reading, not inline references.
- Truncate only inline references, around 28–48 characters, and back them with a fast hover card (not a `title` attribute) that adds information beyond the name.
- Every truncation needs a way to see the full content.
- Hover cards sit close to the trigger and above everything else. Remove hover cards that only repeat what is visible; Byron finds them annoying.

## Hierarchy and placement

- The most useful content goes at the top. Completed and deferred items are hidden by default behind a toggle and rendered below the active work when shown.
- Primary actions sit at the top, aligned with the content they act on, not at the bottom or far right.
- When something has low value, remove it rather than restyle it. He regularly deletes secondary links, unused pages, decorative logos, and sidebar buttons.
- Offer the same action everywhere the same item appears.
- Persist selection in the URL so a refresh keeps it.
- Every breadcrumb segment is clickable, and a child document always offers an obvious path back to its parent.
- Keep prose at a comfortable reading width; let tables bleed wider than the text column.
- In two-button dialogs, spread the buttons so the next action is clearly the primary one.

## Interaction

- Every interactive element has a visible hover and pressed state. Use `emil-design-eng` motion: short color fades around 140ms, no `transition: all`, respect reduced motion.
- A dialog containing typed text does not close on a backdrop click; require Cancel. An empty dialog may close on any outside click.
- A dialog or menu with a text filter focuses it on open, and only Esc (or ×) closes it. No letter key closes or toggles it while the filter has focus, including the key that opened it; every letter must be searchable.
- Text areas auto-size so the full contents are visible.
- Graphs get an expand control that opens a full-viewport view with drag-to-pan and wheel zoom. Zoom keeps the focal point under the cursor stable, and the view opens fitted to the whole image.
- Save actions clear the previous status or error immediately so stale messages never imply progress.
- Status text uses real names users recognize, not internal IDs.

## Diagrams

- Prefer wide, left-to-right layouts over tall ones.
- Run the core path as a straight spine down the center.
- Arrows land on node edges, not in the middle of a shape, and avoid crossing.
- Keep decision diamonds close to square with the text inside.
- Do not bake tables or checklists into diagram images.
- Choose a palette for the context instead of fixed hard-coded colors.
- Group labels must not collide with group borders.

## Working method

- For open-ended "make it better" requests, use `consider-contrast`: sketch 5–10 directions, then combine the best into one.
- Get the change working end to end in the UI first, then simplify. Prefer the least new code.
- Verify in the browser at Byron's wide-monitor size before reporting.
