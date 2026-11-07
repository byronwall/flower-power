# Indy Init 2026 submission

Flower Power is entered in Indy Init 2026 (November 7, 2026). This folder holds the source for the Devpost page, so we can update it as work lands.

## Links

- Devpost project page: https://devpost.com/software/flower-power-bford0
- Devpost edit page: https://devpost.com/software/flower-power-bford0/edit
- Hackathon page: https://indy-init-2026.devpost.com/
- Live app: https://flower-power.apps.byroni.us
- Repo: https://github.com/byronwall/flower-power

## Files

- [devpost.md](devpost.md): the story text, one section per Devpost heading.
- [process.draft](process.draft): how we built it in one day.
- [app-flow.draft](app-flow.draft): from photos to a garden plan.
- [tech-stack.draft](tech-stack.draft): what runs where.
- `*.png`: the gallery images, rendered from the `.draft` files.

## Update the Devpost page

1. Edit `devpost.md` or a `.draft` file.
2. Check a diagram and render its image. Keep each one under about 1,300 px wide, because the Devpost gallery is about 800 px wide and has no zoom.

   ```bash
   npx draftably@0.11.0 check docs/hackathon/app-flow.draft --metrics
   ```

   ```bash
   npx draftably@0.11.0 inspect docs/hackathon/app-flow.draft --png docs/hackathon/app-flow.png --max-width 1920
   ```

3. Open the edit page. Paste the text from `## Inspiration` down to, but not including, `## Built with` into the description box.
4. To replace an image, remove the old one in the image gallery, then upload the new PNG. Keep the order process, app flow, tech stack. Each caption is the diagram's title and subtitle.
5. Click **Save**. Edits after the 5:00 PM deadline show on the portfolio page but not in the judged submission.

To see the diagrams live while you edit them:

```bash
npx draftably@0.11.0 open docs/hackathon
```

## Still to update on Devpost

- Built With tags list only typescript, solidjs and three.js. Add zod, solidstart, openai, vitest, coolify, claude-code and codex.
- Add Shakila and Meghaj as team members.
- When the design engine merges, change it from "On a branch" to "Built" in `app-flow.draft` and in the "What's next" section of `devpost.md`.
