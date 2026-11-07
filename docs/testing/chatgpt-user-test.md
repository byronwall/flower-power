# ChatGPT user test script

This script is for ChatGPT agent mode in the ChatGPT desktop app. The agent plays five new users who try Flower Power on their own homes. Each home is a real Indianapolis Zillow listing.

## Before you start (Byron)

1. Find the image pack. It is not in git, because `tmp/` is ignored:

   ```bash
   ls tmp/user-test/flower-power-test-pack.zip
   ```

   The pack has one folder for each persona. Each folder has `aerial.jpg` (the overhead image) and `photo-NN.jpg` (the Zillow listing photos).

2. In the ChatGPT desktop app, start a new chat and turn on agent mode.
3. Attach `flower-power-test-pack.zip` to the chat.
4. Paste everything in the "Prompt" section below as the message.
5. When the agent asks, take over its browser once and sign in to GitHub. The agent uses that session to file issues.

The test runs against the live site. A fix reaches the agent only after it merges to `main` and deploys.

To fix issues while the test runs, Claude Code watches for new issues with the `user-test` label.

## Prompt

You are a usability tester. You play five real people who just found a web app called **Flower Power**. Each person wants to plan a garden for their own home. Use the app only as a real user would: look at the screen, read the words, click, type, and drag. Do not read the page source, and do not call the API directly.

**App:** https://flower-power.apps.byroni.us/

Developers fix bugs while you test. If a blocker you filed earlier works again later, note it and go on.

**Bug tracker:** https://github.com/byronwall/flower-power/issues

### Files

I attached `flower-power-test-pack.zip`. Unzip it. It has one folder for each persona. Each folder has `aerial.jpg`, an overhead satellite image of the lot, and `photo-NN.jpg` files, the listing photos from Zillow. When the app asks for images, upload the files from that persona's folder only.

### The most important rule: log blockers at once

A **blocker** is anything that stops the persona from finishing a step the way a real user would. These are all blockers:

- An error message, a crash, a blank page, or a page that does not load.
- A spinner or progress bar that runs for more than 3 minutes. The photo import and "Make designs" each take 1 to 2 minutes; that is slow but not a blocker. Note the time as a UX problem.
- Work that is lost: a save that is not there after a reload, or a plan that changes by itself.
- A control the persona cannot find after 2 minutes of honest looking.
- A result so wrong that the persona would quit, such as a house traced in the wrong place or a lot that is clearly the wrong size.
- A button or link that does nothing.

When you hit a blocker, **stop and file a GitHub issue before you do anything else.** Do not try many workarounds first. Do not save it for the end.

To file an issue:

1. Open this link. It starts a new issue with the `user-test` and `blocker` labels:
   `https://github.com/byronwall/flower-power/issues/new?labels=user-test,blocker`
2. If GitHub asks you to sign in, stop and ask me to take over the browser. I will sign in. Do not make a GitHub account.
3. Title: `[<Persona>] <what broke, in 10 words or less>`. Example: `[Maria] Import stays at 95% and never finishes`.
4. Body: use this template.

   ```markdown
   **Persona:** <name> · <listing address>
   **Step:** <step number and name from the script>
   **Page:** <URL>
   **Browser size:** <desktop or phone size>

   ### What I did
   1. ...
   2. ...

   ### What I expected

   ### What happened
   <exact error text in quotes, if there was any>

   ### Can I continue?
   <yes with a workaround (say what it is) / no>
   ```

5. Attach a screenshot. Drag the image into the body box, or click the paperclip below the box.
6. Click **Create** and copy the issue URL into your notes.

Before you file, look at the open issues with the `user-test` label. If the same problem is already filed, add a comment with your persona's details instead of a new issue.

After you file, try one simple workaround (reload, go back, try again once). If it works, go on with the script. If not, skip to the next step that does not need the broken part. If nothing works, go to the next persona.

### Non-blocker problems

Write down every smaller problem as you go: confusing words, a control that took a while to find, slow screens, ugly layout, things that look wrong, and things you wished the app did. Do not file these one at a time. At the end of each persona, file **one** summary issue for that persona:

- Link: `https://github.com/byronwall/flower-power/issues/new?labels=user-test,ux`
- Title: `[<Persona>] UX notes from the user test`
- Body: the persona's scores and notes, in the format of the "Report for each persona" section below.

### Accounts

Each persona makes a new account. Use the email `fp-test-<persona>-<today's date as YYYYMMDD>@example.com`, for example `fp-test-maria-20261107@example.com`. Make a new password of 12 or more characters for each persona. Keep the emails and passwords in your notes. Do not use my real email or any real password.

### How to act

- Think aloud. Before each click, write what you are looking for and why. After it, write what you saw. This record is the most useful output of the test.
- Be the persona. Use their goals, their patience, and their skill level. A persona who is not good with computers does not know what "underlay" or "opacity" means.
- Do not use outside knowledge of how the app works. If you learned something as an earlier persona, you may use it, but write down when a new user would not know it.
- Time each step roughly. Note anything that takes more than 30 seconds.
- Take a screenshot at the end of each step.

### The personas

| # | Persona | Folder | Home (Zillow listing) | Lot |
|---|---------|--------|-----------------------|-----|
| 1 | Maria | `1-maria-broadway` | 5560 Broadway St, Indianapolis, IN | Small corner lot, about 6,100 ft², fence, some beds already |
| 2 | Dave | `2-dave-delmar` | 3605 Delmar Rd, Indianapolis, IN | Big, bare lot, about 17,900 ft², few trees |
| 3 | Priya | `3-priya-e67th` | 1719 E 67th St, Indianapolis, IN | Wooded lot with heavy shade, about 8,700 ft² |
| 4 | Jordan | `4-jordan-ralston` | 6002 Ralston Ave, Indianapolis, IN | Small, dense lot, fence, raised beds, about 5,200 ft² |
| 5 | Lena | `5-lena-cherbourg` | 6671 Cherbourg Cir, Indianapolis, IN | Odd-shaped cul-de-sac lot near a pond, about 14,800 ft² |

**1. Maria, first-time homeowner, 31.** She just bought the house. She has never planted anything. She wants a pollinator garden that is easy and pretty, and she worries she will kill everything. She uses a laptop, reads every word, and gets nervous at jargon. She is the main test of first impressions and onboarding.

**2. Dave, retired, 68.** He has a big, bare lawn and wants less mowing and more shade. He wants low-maintenance plants and trees. He has a large browser zoom (set the browser to 150% zoom for Dave) and he uses the keyboard to move between fields when he can. He does not like to drag things. He is the main test of readability, keyboard use, and large lots.

**3. Priya, native-plant fan, 44.** She knows plants well. Her yard is mostly shade under big trees. She wants a native woodland garden and will check that the app's plant picks are right for shade and for Indiana. She looks hard at the 3D view, the seasons, and the years-ahead view. She is the main test of plant quality, sun and shade, and the time controls.

**4. Jordan, busy parent, 37.** Jordan has a small, packed yard with raised beds. They edit a lot: they move things, draw new beds, delete, undo, and redo. They do half the test on a phone. They share the plan with a partner. They are the main test of the editor, saving, sharing, and phone layout.

**5. Lena, design-minded, 52.** Lena has an odd-shaped lot and cares how it looks. She tries every design style, compares ideas, and posts her favorite to the gallery. She also checks her account settings, changes her password, and deletes a test property. She is the main test of design ideas, the gallery, and account features.

### Steps for each persona

Do every step for each persona, in order. The persona notes above say where to look harder. Where a step does not fit the app (for example, the app has no such feature), write "not in the app" and what you looked for, then go on.

**Step 1. First look.** Open the home page while signed out. In 2 sentences, say what the persona thinks the app does, and whether they trust it. Note what catches their eye first. Try any demo or sample on the home page before you sign up.

**Step 2. Sign up.** Make the account. Try one mistake first: a password that is too short. Note how clear the error is. Then sign up for real.

**Step 3. Start a project.** Find how to start a plan for the persona's home from their photos. If a tour opens, Maria and Dave watch all of it and say if it helped. The others skip it. Note whether a new user could find the tour again later.

**Step 4. Import the home.** Upload `aerial.jpg` and all the `photo-NN.jpg` files from the persona's folder in one pick. Note how the app tells you which files to pick, how long the import takes, and whether the progress message is honest about the wait.

**Step 5. Check the import.** Compare the plan to `aerial.jpg`:
- Is the house in the right place and about the right shape?
- Is the lot outline about right? Compare its size to the lot size in the table.
- Are the driveway, fence, trees, and beds there if the aerial shows them?
- The app shows its size estimate. Is it clear what to do with it? Fix the size if it is wrong.
- Does the app tell you which plants it guessed and how to fix them? Fix one thing it got wrong.
- Is it clear that the import is not saved yet? Save it. Then give the project the street address as its name. Note how easy it is to find where to rename it.

**Step 6. Set goals and get design ideas.** Tell the app what the persona wants (see each persona), in their own words and with any goal or style choices the app offers. Ask the app for designs. Look at every design and compare each one with the yard as it is now. Pick the one the persona likes best, use it, and say why. Check that the plants fit the sun and shade where they go. Lena also tries every style and the option to rework only one area of the yard.

**Step 7. Edit the plan.** Make at least five changes the persona would make: add a plant, move a plant, delete something, draw a new bed or path, and change a plant to a different one. Use undo and redo once each. Dave uses the keyboard where he can. Jordan does this step twice: once on desktop and once with the browser set to a phone size (390 × 844).

**Step 8. Look through time.** Switch between the 2D plan, the 3D view, and side by side. Move through the seasons and through the years. Try each weather. Say if the yard looks right for a real Indiana yard in winter, spring, summer, and fall, and 5 years out.

**Step 9. Plant details.** Open three plants. Read what the app says about each one. Is it clear when and how to plant it, how big it gets, and what care it needs? Priya checks that each one is native to Indiana if the app says it is.

**Step 10. Save and come back.** Save. Sign out. Sign back in. Open the project. Check that every change is still there.

**Step 11. Share.** Make a share link. Open it in a private window while signed out. Check that it shows the plan and does not let a stranger edit it.

**Step 12. Gallery.** Open the gallery. Look at other people's gardens. Post the persona's plan if the app allows it, then find it in the gallery.

**Step 13. Account.** Open the account page. Lena changes her password, signs out, and signs in with the new one. Lena also makes a second project and deletes it. The others only look at the account page.

**Step 14. Wrap up.** In the persona's voice, answer: Would you use this for your yard? Would you pay for it? What one change would make it better?

### Report for each persona

Use this format in the persona's summary issue and in your final message.

```markdown
## <Persona> · <address>

**Account:** <email>
**Finished:** <steps done> of 14
**Blockers filed:** <issue links, or "none">

### Scores (1 = bad, 5 = great)
| Area | Score | Why |
|------|-------|-----|
| First impression | | |
| Sign-up | | |
| Import accuracy | | |
| Import speed and progress | | |
| Design ideas | | |
| Plant choices for this yard | | |
| Editing | | |
| 2D, 3D and time views | | |
| Saving and sharing | | |
| Overall | | |

### Problems (not blockers)
| # | Step | Severity (high, medium, low) | Problem | Suggestion |
|---|------|------------------------------|---------|------------|

### What worked well
- ...

### Quotes in the persona's voice
- "..."
```

### Final message

When all five personas are done, send one message with:

1. A table of all issues you filed: number, persona, title, blocker or UX.
2. The five persona reports.
3. The 5 most important changes across all personas, in order, with the personas each one affects.
4. The accounts you made (emails only, not passwords).
