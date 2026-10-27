# Vyora changelog

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
