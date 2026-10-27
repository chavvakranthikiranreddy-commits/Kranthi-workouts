# Vyora

Vyora (formerly Muscle & Money) is a personal all-in-one Android app for fitness, money and daily life. Updating from Muscle & Money keeps all your data: it is the same app with a new name and logo. Workouts: interval timers, stopwatch, gym log, personalised programs, yoga & mobility routines, step counting and a workout calendar. Money: salary-day budgets, needs / wants / savings, bills with reminders and reading PhonePe / Google Pay screenshots.

## Get the APK (free, no coding, ~10 minutes the first time)

1. Create a free account at github.com (skip if you have one).
2. Click **+ → New repository**. Name it `kranthi-workouts`, choose **Private**, click **Create repository**.
3. On the new repo page click **uploading an existing file**. Drag in **everything inside this folder** (not `node_modules`), then click **Commit changes**.
4. Open the **Actions** tab. A job called **Build APK** starts by itself and takes about 5 minutes.
   - If the Actions tab says there are no workflows, the hidden `.github` folder was skipped during upload. Click **Add file → Create new file**, type the name `.github/workflows/build-apk.yml`, paste the contents of that file from this folder, and click **Commit changes**.
5. When the job shows a green tick, open the repo on your phone, go to **Releases** (right side of the repo page), open the newest build and download **Vyora.apk**.
6. Open the downloaded file. If Android asks, allow your browser/files app to **Install unknown apps**, then tap **Install**.

### First launch on the phone
- Allow **notifications** when asked, so beeps keep coming while you use other apps or the phone is locked.
- In **Settings → On-time alerts**, tap **ALLOW** and turn on "Alarms & reminders" so background alerts fire on the exact second.

### Getting around
The big **Start** button in the middle of the bottom bar starts today's workout or a quick one (in Money it adds an expense). **Settings** is the gear at the top left, **Search** the magnifier at the top right. On Today, tap **Customise this screen** to hide or reorder cards.

### Guided workouts
**Train → Workouts**: open a ready-made full-body template (dumbbells, barbell, mixed or bodyweight) or tap **Create workout** and type exercise names. Every exercise has an animated how-to. Press **Start**: a countdown, then the voice counts each rep, runs your rests and logs the workout to your calendar. Share a workout with a friend from the **⋯** menu; they paste it into **Import**.

### PhonePe statement PDF
In PhonePe, download your statement as a PDF, then **Share → Vyora** (or Money → Settings → Import PhonePe statement). Payments already in the app are skipped, known shops are sorted automatically, and you pick a category once per unknown payee. See it by day, month or year in **Insights**.

### Exercise photos and animations
Every exercise shows a real person doing the move (start and end photos that flip in time with your reps), plus an animated figure with the working muscles in red. Switch between **Real photos** and **Animated** on any exercise. There are 876 exercises with photos and steps. Type any of them in **Create workout**. The photos come from the free, public-domain library at github.com/yuhonas/free-exercise-db and are added to the APK automatically when it is built (the `scripts/fetch_exercise_photos.py` step), so you don't upload them yourself.

### Life (notes, tasks, alarms and daily tools)
Tap **Life** at the top. **Home** shows today's reminders, tasks, medicines, habits and upcoming birthdays, the weather and a fresh quote. **Notes** holds notes and checklists (pin, colour, reminder, share). **Tasks** has To-do (type "Call mom tomorrow 6pm" and the date fills in), Reminders (once, daily, weekly, monthly, yearly), Habits with streaks, and Shopping lists that can go straight into Money. **Clock** has alarms, a world clock and a bedtime schedule. **Speak to add** (Life home, the + button, or the Life widget): say things like "Remind me to pay rent on the 5th", "Wake me up at 6:30", "Add milk and eggs to my shopping list" or "Spent 250 on lunch". **Briefing** reads out your day: weather, workout, reminders, bills, birthdays and what you can spend. Turn on **Morning briefing** on an alarm to hear it when you turn the alarm off. **Documents** keeps photos of your Aadhaar, PAN, licence, insurance and RC behind your fingerprint, with reminders before they expire. Bills from Money show on Life Home with a **Paid** button. Tools on Home: journal (can be locked with your fingerprint), focus timer, weather, medicine & water reminders, birthdays & countdowns, calculator and converter (units, %, EMI, GST).

**Alarms with your own ringtone:** open an alarm → **Ringtone** → **Add a ringtone from your phone** and pick any MP3/M4A/WAV you downloaded. Alarms ring on the alarm volume even when the app is closed or the phone restarted, with Snooze and Turn off over the lock screen. The first time, if the Clock tab shows a yellow note, tap it and allow **Alarms & reminders** and **full-screen alerts**. Turn on **Log my sleep** on an alarm (or the bedtime schedule) and turning it off asks how you slept.

### Home-screen widget
Long-press an empty spot on your home screen → **Widgets** → **Vyora**, and drag it out. There are two: the original one, and **Vyora · Today** with your next alarm, today's tasks and reminders, and Task / Note / Speak buttons. It shows today's steps, money left and safe to spend today (hidden when Money lock is on), today's workout and your streak. Tap it to open the app.

## Updating the app later
Change any file in the repo (or ask Claude to change it), and a new APK appears under Releases. Installing it updates the app and **keeps your timers and calendar**, because every build is signed with the same key (`android/app/kranthi-signing.p12`). Don't delete that file, and keep the repo private.

Note: your data lives on the phone. Uninstalling the app deletes it.

## Building with Android Studio instead
`npm install`, then `npx cap sync android`, then open the `android` folder in Android Studio and use **Build → Build APK(s)**.

## Project layout
- `www/` — the app itself (HTML, CSS, JS, fonts, icons)
- `android/` — Android wrapper (Capacitor 8)
- `.github/workflows/build-apk.yml` — the automatic APK build


## Privacy, data and safety

**Where your data lives.** Everything is stored on your phone only (in the app's private storage). Nothing is sent to a server. Android's automatic cloud backup is turned off for this app, so use **Settings → Back up now** to keep a copy.

**Money.** With Money lock on, your money data is encrypted on the phone with a key kept in Android's secure keystore, and opening Money needs your fingerprint, screen lock or PIN. Money locks again one minute after you leave the app. Five wrong PINs start a short wait that doubles each time (up to 15 minutes). Because the key never leaves the phone, moving to a new phone works through a Vyora backup file, not by copying app data.

**Backups.** The backup screen lists exactly what is included. Photos (progress, journal, documents) are optional, and you can protect the file with a password (AES-256 encryption). Custom ringtones are not included. Restore shows a preview, lets you merge or replace, checks the file, and tells you what was restored.

**Lock-screen notifications.** Bill, medicine and document reminders use a private channel, so their details are hidden on the lock screen.

**Internet use.** Weather comes from Open-Meteo (only your chosen city's coordinates are sent). Exercise photos are bundled in the app; if one is missing it is loaded from the public free-exercise-db library on GitHub. "YouTube demos" opens a YouTube search. The screenshot reader runs on the phone through Google Play services. Nothing else goes online.

**Training safety.** Back-friendly mode (on by default) swaps heavy hinges and twisting core work for options that load the lower back less, and moves you mark as painful are swapped out and never pushed heavier. This is a cautious default, not medical advice. See a doctor or physiotherapist if back pain lasts, gets worse, or comes with weakness, numbness, bladder or bowel changes, or numbness around the groin.

**Accessibility.** The app follows your phone's font size (up to 135%), allows pinch zoom, respects "Remove animations", and has larger touch targets and screen-reader labels on buttons.

**Problem log.** If something goes wrong, a short note (the error message and where it happened, never your data) is saved in **Settings → Problem log** so you can copy it when asking for help.
