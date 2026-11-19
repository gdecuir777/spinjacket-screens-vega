# SpinJacket Screens - Vega OS (Fire TV)

A second "SpinJacket Screens" app, this one for the NEW Fire TV OS (Vega). It does
the same job as the Android app: it opens full screen and loads the `/tv` display
page (`connect.spinjacket.com/tv`), which pairs with a code and shows whatever the
venue brain sends. The Android app stays exactly as it is; this is a separate app
for the new Fire TV Sticks that run Vega and can't install the Android one.

Why a whole separate app: Vega is not Android. Its apps are built with Amazon's
Vega SDK (React Native / TypeScript) and use a WebView component, not an APK. So
none of the Android project carries over, but the approach (a thin wrapper around
`/tv`) is the same.

## How it gets built (no Mac, no SDK on your PC)

The Vega SDK only runs on Mac or Linux, not Windows. So we build it in the cloud
with GitHub Actions, the same way the Android app builds: you push this to a repo,
GitHub builds it, you download the result. The build output is a `.vpkg` file (the
installable Vega app).

### One-time setup
1. Create a new, empty GitHub repo, e.g. `spinjacket-screens-vega` (separate from
   the Android `spinjacket-tv` repo).
2. Put these files in it and push (keep the folder layout: `.github/workflows/build.yml`
   at the top).
3. GitHub Actions runs automatically on push. Open the repo's **Actions** tab to
   watch it.

### What the first build does (Phase 1)
The workflow is set to build a plain Vega starter app first, on purpose, so we
confirm the cloud toolchain works and can see the real project file layout. When it
finishes, open the run, and under **Artifacts** download `spinjacket-screens-vega`.
Send me what's inside (especially the file list and `manifest.toml`). If the run
fails, send me the red step's log. Getting this green first is exactly how the
Android app started.

### Phase 2 - swap in the /tv WebView
Once Phase 1 is green, we turn on the real app: in the repo, go to
**Settings -> Secrets and variables -> Actions -> Variables**, add a variable named
`APPLY_WEBVIEW` set to `true`, and re-run the build. That swaps in `webview-app/App.tsx`
(already in this project), which loads `connect.spinjacket.com/tv`. I'll confirm the
exact wiring against the real layout from Phase 1 before we flip this on.

## Testing on your Vega Fire Stick
Two ways, we'll pick one once there's a `.vpkg`:
- **Amazon Appstore testing** (no Mac): submit the build as a test/unlisted release
  and install it on your stick from the Appstore. Slower per round, but zero Mac.
- **Direct install** (needs the Mac once): install the Vega CLI on the Mac and run
  one command to push the `.vpkg` to the stick. Faster to iterate. I'll give exact
  copy-paste commands if we go this way.

## Submitting to the Appstore
Same Amazon developer account you used for the Android "SpinJacket Screens" app, via
the web console. Vega is a separate app listing. We'll do real branding (icon,
banner) and release signing before submitting, same checklist as Android.

## Files in here
- `.github/workflows/build.yml` - the cloud build. Phase 1 by default.
- `webview-app/App.tsx` - the SpinJacket `/tv` WebView app, applied in Phase 2.
- `README.md` - this file.

The generated Vega project (package.json, manifest.toml, etc.) is created by the SDK
during the build, so it is not hand-written here, that avoids guessing the structure
and having the first build fail on a detail.
