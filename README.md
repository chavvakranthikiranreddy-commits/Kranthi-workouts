# Muscle & Money

Personal Android app for workouts and money. Workouts: interval timers, stopwatch, gym log, personalised programs, yoga & mobility routines, step counting and a workout calendar. Money: salary-day budgets, needs / wants / savings, bills with reminders and reading PhonePe / Google Pay screenshots.

## Get the APK (free, no coding, ~10 minutes the first time)

1. Create a free account at github.com (skip if you have one).
2. Click **+ → New repository**. Name it `kranthi-workouts`, choose **Private**, click **Create repository**.
3. On the new repo page click **uploading an existing file**. Drag in **everything inside this folder** (not `node_modules`), then click **Commit changes**.
4. Open the **Actions** tab. A job called **Build APK** starts by itself and takes about 5 minutes.
   - If the Actions tab says there are no workflows, the hidden `.github` folder was skipped during upload. Click **Add file → Create new file**, type the name `.github/workflows/build-apk.yml`, paste the contents of that file from this folder, and click **Commit changes**.
5. When the job shows a green tick, open the repo on your phone, go to **Releases** (right side of the repo page), open the newest build and download **Kranthi-Workouts.apk**.
6. Open the downloaded file. If Android asks, allow your browser/files app to **Install unknown apps**, then tap **Install**.

### First launch on the phone
- Allow **notifications** when asked, so beeps keep coming while you use other apps or the phone is locked.
- In **Settings → On-time alerts**, tap **ALLOW** and turn on "Alarms & reminders" so background alerts fire on the exact second.

## Updating the app later
Change any file in the repo (or ask Claude to change it), and a new APK appears under Releases. Installing it updates the app and **keeps your timers and calendar**, because every build is signed with the same key (`android/app/kranthi-signing.p12`). Don't delete that file, and keep the repo private.

Note: your data lives on the phone. Uninstalling the app deletes it.

## Building with Android Studio instead
`npm install`, then `npx cap sync android`, then open the `android` folder in Android Studio and use **Build → Build APK(s)**.

## Project layout
- `www/` — the app itself (HTML, CSS, JS, fonts, icons)
- `android/` — Android wrapper (Capacitor 8)
- `.github/workflows/build-apk.yml` — the automatic APK build
