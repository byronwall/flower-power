# Repeat corrections after "make it amazing" passes

These are follow-ups Byron sent *after* an agent finished a 10x, punch-up, or impeccable pass, gathered from Claude and Codex threads between July and October 2026. Each one cost an extra round trip. Check every after-screenshot against this list before reporting. `byron-ui-taste` holds the general rules; this list is what still slipped through.

## Vertical space and chrome

- [ ] Content starts near the top of the viewport. A site header plus a page header plus a toolbar eats the first screen. Merge them or make them compact. (ticket viewer: "Should not waste vertical space like that.")
- [ ] Action buttons share a row with the title or tabs instead of taking a whole line of their own.
- [ ] Detail and metadata sections are only as tall as their content. A "documents" area sized for ten items when there are usually two is wasted space.
- [ ] Expanded rows and panels add no extra whitespace. Prefer a table over cards, and two lines per item over three.
- [ ] When Byron names a device ("iPad", "single viewport"), the interactive surface fits with no page scroll.

## Noise

- [ ] The header or info section isn't "pilly". Show metadata as plain text, key: value pairs, or icons.
- [ ] There's no stray status dot, and no dots that are misaligned with their text.
- [ ] There's no row of metric tiles across the top unless each tile drives a decision.
- [ ] Tables get no totals, sum, or average rows unless the columns are numbers someone adds up. Generic Markdown tables don't. (expanded table: "That's not going to be helpful for the examples we have here.")
- [ ] Horizontal dividers and rules are kept to a minimum.
- [ ] No blue-on-blue or other low-contrast pairs in a hero or highlighted area.
- [ ] No ugly focus ring around a whole chart or canvas. Show focus on the element being operated on.
- [ ] Filter pills don't overflow into a horizontal scroll. Use a menu, a popover, or wrapping.

## Information architecture

- [ ] Nothing repeats. An account header followed by role headers with the same information means one is redundant, so keep one selectable thing per entity.
- [ ] Navigation lives in visible buttons or tabs that show the active page, not in a popover menu. Show an indicator when an area needs attention, such as items to review.
- [ ] The user never sees raw JSON, internal IDs, or dev or debug copy ("Traveler", coverage tooling, placeholder text). Turn logs and AI activity into a readable timeline.
- [ ] Large inputs collapse once their job is done, so the review or result can take the space.
- [ ] Calculated, derived, or inferred values are marked as such, and the user can inspect them in place.

## Stability and interaction

- [ ] Switching views away and back (Charts → Rows → Charts) leaves the layout intact.
- [ ] Opening an overlay, mode, or toggle (for example "show all x-ray moves") doesn't shift the layout.
- [ ] Filtering, brushing, and cross-highlighting still work after the redesign. Test them; don't assume.
- [ ] Clicking to pan or zoom never selects text inside an SVG or canvas.
- [ ] Search highlights the part that matched.
- [ ] Popovers or tables don't close unexpectedly when you select or deselect inside them.
- [ ] Clicking a legend filters the view, and that's disabled when there's only one item.
- [ ] Inspector and sidebar widths that the user can resize are saved.

## Data presentation

- [ ] Dense scatter or point plots don't turn into a black blur. Adjust opacity, size, and binning with the point count.
- [ ] Text is large enough to read at Byron's usual zoom. "The font is small" has come up more than once.
- [ ] Graph and diagram layouts match the viewport's aspect ratio. Wrap long chains into lanes, and avoid needless edge crossings or detours.
- [ ] Status shows up even when zoomed out, through a fill or background color, not only a small badge.

## Finish

- [ ] Everything feels professional and complete. If something looks "sloppy" in a screenshot, it is.
- [ ] Changed pages look consistent with the rest of the app, using the same shell, tokens, and component patterns.
- [ ] The examples or demo data show off the new UI.
