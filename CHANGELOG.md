# Vyora changelog

## 7.0 (Prism Flow redesign, monthly salary, always-on steps)

### New look and navigation (Prism Flow handoff)
- Four fixed destinations in a floating dock: **Today, Fitness, Money, Life**. The Fitness/Money/Life switch at the top and the changing bottom bars are gone.
- New **Today** screen: greeting and date, the next workout in a cobalt-to-violet feature card, steps ring, water and habits tiles, today's agenda (reminders, tasks, medicines, bills) and a Money summary (amounts never shown while Money is locked).
- Each destination has secondary tabs: Fitness (Overview, Train, Calendar, Progress), Money (Overview, Transactions, Budget & bills, Insights), Life (Overview, Notes, Tasks, Clock).
- Tapping another destination returns to the screen you were on; tapping the active one goes back to its overview. Scroll position is remembered.
- Back goes: open sheet → current screen → section overview → Today → leave the app.
- The old centre Start/Add button became a context action above the dock: "Start a workout", "Add expense", "Add note, task or reminder".
- While a workout is unfinished, a Resume banner shows above the dock everywhere.
- Header: VYORA, search, settings. Money settings open from the header while you are in Money.
- Colours: pearl canvas #F4F6FC, white cards, cobalt #3F51D9 actions, violet #8E79D6 accents, with a matching dark theme (light cobalt #B5BFFF in dark).
- One action colour across the app (old cyan, green and lavender section colours were moved to cobalt; you can still pick another in Settings).
- Inter for all text with even-width numbers for money, timers and stats. Page headings 28 px, sections 18 px, no all-caps paragraphs.
- Radii: feature cards 24, cards 20, fields 14, sheets 28, dock 28. Borders first, soft shadows only.
- The Money budget-left card is the feature card.
- Interval timer: readable pearl/dark player with one phase colour instead of full-screen yellow/red/green.
- Full-screen white flash replaced by a short border pulse.
- Motion follows the handoff: press 90/140 ms, dock pill 220 ms, tabs 140–180 ms, sheets 240 ms in and 180 ms out, dialogs 140 ms.
- **Settings → Appearance:** Theme Light / Dark / Same as phone; Motion Follow phone / Reduce; Open the app on now includes Today.
- Onboarding uses a small brand mark instead of a half-screen logo.
- Home-screen widgets use the pearl/cobalt palette.

### Fixes from the handoff's product findings
- F05: Insights no longer shows the literal text "${pWord()}".
- F06: one version source. The app shows the APK's own version and build (APK version is now 7.0.N).
- F07: "Move money" with fewer than two accounts shows a proper explanation with "Add account", not a passing toast.
- F08: the money card says "Budget left" and "this month's money", never a bank balance.

### Money: salary changes every month
- Each month, enter the salary you actually received (after leave deductions). That becomes the month's money and every expense is taken from it.
- A card on the Money overview asks for it at the start of each month. Until you enter it, your usual salary is used.
- "Add more money" adds a bonus or leave encashment to the month.
- The salary and extra money are saved as income entries. Editing or deleting them in Transactions updates the month.
- Turn it off in Budget & bills → "Budget comes from salary" to go back to a fixed budget.

### Steps: always-on counting
- New always-on step counter: listens to the step sensor all day and saves every 30 seconds and at midnight, so steps land on the right day and almost nothing is lost on a sudden power-off.
- It shows a small, silent "steps today" notification (Android requires it). Turn it off in Settings → Always-on counting.
- It restarts after a phone restart.

## 6.4 (step counter fixes)

Audit of build 17 (6.2). The phone's step sensor counts correctly; the problems were in how Vyora read it and put steps on days.
- Steps walked late in the evening no longer move to the next day. Vyora now takes a reading at 23:59 every night (an exact alarm that works even when the phone is asleep).
- If that reading is missed too, the steps since the last reading are shared between the days by time of day (night hours count much less), instead of all going to the day the app was opened.
- Restarting the phone: Vyora takes a last reading when the phone switches off (on phones that send that signal), takes a first reading after it starts, and spots a restart by the start time. Before, a restart could lose the steps since the last reading, and a second restart could undercount.
- Switching on counting now includes steps since the phone started, when it started today.
- Background readings and the 23:59 reading are re-booked every time the app opens, after a restart and after an update, in case the phone dropped them.
- The step card shows when the phone really last saved steps ("Updated 4 h ago"), not when the screen refreshed.
- New warning on the step card when the battery saver can pause background counting, with an "Allow background use" button that opens Android's own dialog. You are also asked once when you switch counting on.
- Settings text updated.

Not fixable without an always-on notification: steps between the last reading and a sudden power-off (battery died, or a phone that does not send the shutdown signal).

## 6.3 (UX audit fixes)

Audited against the VectorLab UX skills (19 checklists). Changes:
- Deleting anything now asks first and names it ("Delete bill "Rent"?", "Delete ₹500 to Swiggy on Nov 4?"). The Cancel button gets focus first. Tasks, reminders, habits, alarms, medicines, birthdays, ringtones and cities had no confirmation before.
- Renaming a shopping list edits the title in place (Enter saves, Escape cancels) instead of opening a pop-up.
- Escape closes the top sheet or screen. Keyboard focus stays inside an open sheet and goes back to the button that opened it.
- Add expense: visible labels on every field. The amount is checked when you leave the field, the error clears as you type, and Save shows the problem next to the field instead of a toast.
- If you close Add expense by accident, your unsaved entry comes back the next time (kept in memory only, never written to storage). "Discard draft" clears it.
- Labels added to the task, list item, reminder, bedtime and alarm time fields. Search boxes have names for screen readers.
- Error messages no longer say "Wrong ..." and say how to fix the problem ("That PIN didn't match. Try again.").
- Empty Transactions shows "Add expense", or "Clear search and filters" when a filter hides everything. Search shows "Clear search".
- Weather shows a loading skeleton instead of "Loading…".
- Text is never smaller than 12 px (tab labels, tool names and calendar letters were 11 px).
- Three font weights only (400 / 500 / 600), for a calmer look.
- Every tap target is at least 44 × 44 px (colour swatches, small icon buttons, calendar days, chips, "See all" links).
- Motion uses 100 / 150 / 200 / 300 ms only, ease-out to enter and ease-in to exit, transform and opacity only. Removed the springy overshoot, the pulsing blob behind the figure, and bar-width animations.
- With "Remove animations" on in phone settings, everything changes instantly.
- Removed the blur behind the tab bar and sheets. Light-mode glow under buttons is now very soft.
- Visible focus ring for keyboard use, in light and dark.
- Icon-only buttons show their name on mouse hover or keyboard focus.
- Spacing snapped to a 4 px grid.
- Button labels start with a verb ("Mark paid", "Mark taken", "Add photo", "Resume workout", "Scan or import").

Tested: all regression suites; every tab at 375 px and 1280 px in light and dark has no overflow, no console errors and no text under 12 px; keyboard trap, Escape and focus return; inline rename keeps neighbours in place; blur validation; draft restore and discard; reduced motion.

## 6.2 (monthly money, lavender Life, photos, melodies, motion)

### Money
- Budgets now run by calendar month (1st to last day). Every month starts from ₹0 spent; nothing carries over.
- One month switcher (‹ November 2026 ›) on Overview, Transactions, Budget & bills and Insights. Go back to any earlier month; "Back to this month" jumps home.
- Past months show a summary: under or over budget by how much, total spent, income, that month's entries and its report.
- Adding an entry while looking at a past month dates it to that month.
- Overview "Recent" now shows only the month you are looking at.
- Salary-day cycles are still available: Budget & bills → Budget period → From salary day. Existing users are moved to calendar months.
- Removed the extra floating + button (the centre Add button does the same).

### Life
- Life colour is now soft lavender: light lilac buttons and tabs with dark violet text, in light and dark themes and on the home-screen widget.
- 10 new melody alarm tones made on the phone: Music box, Sunrise piano (gets louder), Marimba morning, Harp breeze, Bamboo flute, Kalimba, Soft lullaby, Soft bells, Acoustic guitar, Birdsong garden. All original tunes, free to use. New alarms default to Music box; Bedtime wake-up uses Sunrise piano.
- Ringtone list is grouped into Melodies, Classic and Yours. Preview plays up to 15 seconds.
- Notes has New note / Checklist buttons; Clock has a New alarm button (instead of floating + buttons). Fixed the "No notes yet" text splitting into two columns.

### Quote cards
- Quote cards show free Unsplash photos picked for each theme (training, rest, progress, done, money, life), with the photographer credited on the card.
- Photos load when online and are cached; offline, or if a photo fails, the animated figure shows instead. Tap still changes the quote and the photo.
- Settings → Privacy → Photos on quote cards turns them off (nothing is downloaded).

### Look and feel
- The Fitness / Money / Life switch has a sliding colour pill.
- Tabs slide in the direction you move; switching mode fades up; cards arrive one after another.
- Sheets spring up, slide away when closed, and can be dragged down to close.
- Press feedback on buttons, chips and cards; toasts rise in. Respects the phone's "Remove animations" setting.
- Even spacing between cards on Life Today.

### Tested
- All earlier regression suites pass (test11 updated for the new setup screen).
- Every tab in Fitness, Money and Life at 360 px and 390 px, light and dark: no console errors, no sideways overflow.
- Month switching, past-month add, salary ↔ calendar switching, past-month report, notes buttons, alarm with melody tone, ringtone preview.
- Melody tones render in under 0.7 s each with no clipping.
- Photo fallback tested by simulating loaded, failed and blocked photos.

### Not testable here
- Real Unsplash photo downloads (blocked from the build machine; they load on the phone). If a photo is ever removed from Unsplash, the card quietly shows the figure.
- How the melodies sound on the phone speaker at alarm volume.

## 6.1 (developer action plan)

### Workouts
- Every set is logged as what you actually did: after "Complete set" you can correct weight and reps (and how hard it was) on the next screen. Planned reps are never saved over your correction.
- "Skip this set" is separate from "Complete set". Skipped sets are stored as skipped and never counted as done; the summary shows "X skipped".
- Timed exercises (planks, holds, cardio intervals) are saved in history with their seconds.
- Guided and manual workouts use the same record shape (weight + reps, or seconds, plus effort and skipped count).
- Session screen: one large Complete set button, separate Skip, visible "Paused" state, confirmation before discarding.
- If the phone storage is full when finishing, the workout is kept and a Retry button appears. No false "saved".
- Today shows "Resume" for an unfinished guided workout.
- Weight suggestions can be turned off (Settings → Training safety).

### Backups and data
- Backup screen offers Data backup or Full backup (with progress, journal and document photos), lists exactly what is and isn't included, and defaults to password protection. Saving without a password asks for confirmation.
- Restore validates the file (type, version, size, field types), previews counts, and follows the chosen mode exactly: Replace replaces steps too, and replaces photos when the backup has them (photos already on the phone are kept if the backup has none, and this is stated in the preview). Missing photo files and write failures are reported.
- Deleting a document or journal entry, or removing a photo, deletes the photo file from the phone.
- Saves report failure: no success message is shown right after a failed write.

### Privacy and security
- Fail closed: Money, Journal and Documents never open when the required fingerprint/screen lock check fails or the phone has no screen lock. Documents offer an explicit "turn protection off" choice in that case.
- Journal entries, document numbers/notes and journal/document photos are encrypted on the phone (Android Keystore key), like Money.
- Money auto-lock choice: right away, after 1 minute or after 5 minutes.
- Money, Journal and Documents are hidden in the recent-apps screen and can't be screenshotted while open.
- Private reminders by default: medicine, bill and document reminders say "Medicine reminder" / "A bill is due" unless you turn on details. They also use a lock-screen-private channel.
- Document numbers are masked when entering and viewing.

### Native features and reminders
- Settings → Phone features check: shows which features work on this phone (notifications, screen lock, encryption, alarms, screenshot reader, steps, voice, widgets, photo storage) with a fix for each, plus a test notification.
- Alarms only say "set" when the phone accepted them; missing permission or plugin is explained.
- Reminders tab shows notification permission status, how many alerts are scheduled, a Test button, and warns if some later alerts are queued. The soonest reminders are scheduled first.

### Look and navigation
- Section colours on active tabs and main buttons: Fitness cyan (changeable), Money green, Life orange, always with label and dot.
- Tabs renamed: Workout, Transactions, Budget & bills, Today (Life).
- Money: hide amounts button, "Budget left (not your bank balance)" label, "How safe to spend works" explanation, Undo after adding an expense.
- Life: favourite tools on Today with "See all tools"; sleep-cycle suggestions described as approximate.

## Test status

### Passed (automated, in a browser build with stand-ins for phone features)
- Plan 12 reps, enter 8: history shows 8. Skipped set not counted, shown as skipped.
- Weighted set + timed plank both saved in history.
- Guided workout persisted, restored after reload, discard clears it.
- Storage full at finish: session kept, Retry saves it.
- Back-friendly swaps and "This hurts" flow.
- Money encryption at rest (mocked keystore), sealed state never overwritten, failed unlock keeps Money closed.
- Journal and document details encrypted at rest; unreadable store fails closed and is not overwritten.
- Journal and Documents don't open when screen lock is unavailable.
- Password backup export, wrong password rejected, restore preview and merge.
- Salary day 31 across February (leap and non-leap years), April/May.
- Undo after adding an expense; hide amounts.
- Exercise photo fallback to animated figure.
- Native Java code compiles against Android API stubs.
- Earlier suites: onboarding, Today, search, workouts builder/player, Life, alarms UI, voice parsing.

### Outstanding (need a real Android phone)
- Force-stop during a workout and reopen (process death).
- Alarms: exact timing, reboot, locked screen, battery restrictions, custom ringtone playback.
- Fingerprint/screen-lock prompts and the "no screen lock" path on the device.
- Keystore encryption on device, including after an app update.
- Screenshot reader via Google Play services (first-use download message).
- Step counter, voice input, widgets and their buttons.
- Notifications: permission denial/re-enable, private channel on lock screen, large number of reminders, after reboot.
- Large text (Android font size) and TalkBack across the three main flows.
- Recent-apps privacy screen (FLAG_SECURE).
- APK size and startup time before/after (Play services OCR, bundled exercise photos).
- Fresh install vs upgrade from Muscle & Money; uninstall/reinstall data behaviour.

## 7.1
- Location: asks once after login; auto weather, place reminders, expenses tagged with place, outdoor walk/run route map.
- Money: bank SMS → expenses, subscription finder, EMI/loan tracker, "Can I afford it?", lend/borrow, tax helper, leave-adjusted salary, salary-day reminder, month-end summary.
- Fitness: smarter weight increase, PR board, rest-day tips, Indian protein food list, streak freeze.
- Life: night review, focus timer on tasks, meal plan → groceries, important dates, share/import family lists.
- Home: weekly goals, goals with milestones, weekly insights, voice sentences, Today widget, app shortcuts, notification quick actions, weekly encrypted backup.

## 7.4
- Cleaner layout: one + button adds anything, short tab names that fit, Today summary rings and a Get started checklist.
- Settings fold into groups; 4 action colours; calm quote cards.
- Life: extras folded under More, mood-this-week strip. Money: 14-day spending chart, details folded.
- 7.3: live run map, run recap with splits, two weather reports, area names.
