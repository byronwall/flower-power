# 100x craft checklist

Inspect each zoomed region against this list. Each item describes something you can observe; write a ledger row for every miss.

## Alignment and rhythm

- Left edges line up down the page. Titles, table text, inputs, and section headers share a small number of x positions.
- Icons sit centered on the text's x-height, not on the line box. Dots, checkboxes, and status icons line up with the first line of their label.
- Every spacing value comes from the spacing scale. Similar gaps match exactly, such as row-to-row and section-to-section.
- Heights stay consistent within a row. Buttons, inputs, selects, and segmented controls in one toolbar are the same height.
- Columns of numbers are right-aligned with tabular numerals, and units and decimal places are consistent within a column.
- Sticky headers, rails, and inspectors line up with the content edges under them, with no one-pixel seams or double borders.

## Typography

- At most 3–4 sizes and 2 weights appear in one view. Hierarchy comes from size, weight, and color, not from boxes.
- Body text is readable at Byron's usual zoom. Secondary text is muted but still passes contrast.
- Prose stays near 60–80 characters per line, while tables can run wider.
- Truncation is deliberate: an ellipsis at a sensible width, backed by a real hover card rather than a `title` attribute. Labels and links never break mid-word.
- Capitalization is consistent: one convention for headings, buttons, and labels.

## Color and surface

- Color is used for meaning (status, selection, deltas), not decoration. One accent color, used consistently.
- Selected, hover, and focus states can be told apart, and they look the same across every component.
- Dark mode, if the app has it, doesn't flatten contrast, invert charts badly, or leave light-mode-only images.
- No stacked shadows, nested borders, or cards inside cards.

## States

- Every interactive element has hover and pressed states plus a visible `:focus-visible` style, and the cursor matches what it does.
- Empty states say what goes here and offer the one action that fills it.
- Loading reserves the final layout with skeletons or fixed heights, so nothing jumps when data arrives.
- Error states say what happened and what to do, sit next to the cause, and clear once it's fixed.
- Disabled controls explain why on hover, or are hidden if they're never usable in that context.
- Extreme data holds up: 0 items, 1 item, 10k items, 200-character names, and negative, null, or huge values.

## Interaction feel

- Hover cards and tooltips appear in about 150–300 ms, sit next to the trigger, and never cover the thing being read.
- Transitions run on specific properties for about 120–200 ms and respect reduced motion. Nothing animates its layout on load.
- Keyboard: a logical tab order, Esc closes the top layer, Enter confirms, arrow keys move through lists and tables, and shortcuts are shown in hints.
- Click targets are at least 24 px (44 px on touch). Hit areas aren't smaller than the visible control.
- A copy action confirms with a subtle animation in place. Destructive actions offer undo or a confirmation that names the item.
- Selection, filters, tab, and sort live in the URL where that's sensible, so a refresh keeps them.

## Copy and numbers

- Labels use the user's terms, not internal IDs or field names.
- Numbers are formatted for people: thousands separators, sensible precision, relative times with the exact time on hover, and units shown.
- Deltas show direction with a sign and color, plus a non-color cue.
- Remove filler copy and explanations that only repeat what the UI already shows.

## Responsive

- At about 1100 px, nothing collides, wraps awkwardly, or squeezes a column to unreadable.
- At the narrow target, the main job still works. Rails become drawers and tables scroll inside their own container, never the whole page.
- At very large widths, content uses the space well, either through more columns or a sensible max width.

## Consistency with the app

- The same thing looks and behaves the same everywhere it appears: buttons, menus, dialogs, empty states, and icons.
- Patterns that are repeated locally are folded into a shared component when that is easy to do.
