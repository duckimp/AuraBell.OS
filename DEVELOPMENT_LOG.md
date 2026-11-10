# Development Handoff

This is a rolling handoff for continuing AuraBell.OS work from another device. Update it after a substantial implementation or operational milestone. Do not put credentials, tokens, private URLs, or `.env.local` contents in this file.

## Local browser audio update — 2026-11-10

- Browser imports now save the actual audio `Blob` in IndexedDB and store a stable IndexedDB reference in the localStorage playlist metadata.
- Browser player and manual bell playback resolve that stable reference to a temporary object URL only at playback time, so refresh no longer loses newly imported audio.
- Deleting a playlist track also removes its IndexedDB file. Browser backup remains JSON-only and does not include audio blobs.
- Audio is still local to one browser profile and origin; it is not synchronized to other devices or Supabase. Clearing site data can remove it.
- Updated the UI and README to explain browser-local persistence and backup limitations.
- Validation: `npm run build` passed. No end-to-end file-upload/reload test was run.

## Browser bell safety update — 2026-11-10

- Browser mode now has a navbar toggle to enable/disable local bell playback. It defaults to disabled and persists in that browser's localStorage.
- When disabled, the app blocks manual bell playback and emergency bell actions in code, disables dashboard/schedule preview buttons, and stops any active browser bell when toggled off.
- Desktop Tauri behavior remains unchanged. Remote announcement receiver remains separate and can still speak announcements in the browser.
- Validation: `npm run build` passed.

## Bell-over-music priority — 2026-11-10

- Added a persisted `music_duck_percent` school setting with a 20% default, including Rust deserialization fallback for existing desktop data files.
- While a manual/scheduled/emergency bell is active, the music player keeps playing at the configured fraction of its normal volume; the master volume setting/slider is unchanged.
- Restore the music volume after WAV/MP3 or built-in bell playback and any chained TTS complete, or immediately when the bell is stopped. Audio playback errors also release ducking.
- Validation: `npm run build` and `cargo check --manifest-path src-tauri/Cargo.toml` passed.

## Latest session — 2026-11-10

### Goal

Prepare a Vercel-hosted PWA and Supabase authentication/remote-announcement path while keeping the Tauri desktop app responsible for the local school-bell scheduler and system tray.

### Implemented in the working tree

- Added Supabase email/password login with no public sign-up UI.
- Added Supabase client configuration through `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Added a SQL migration for authenticated remote announcement commands, short expiry, single-claim processing, completion status, and Realtime publication.
- Added a remote announcement sender and receiver for the fixed `ruang-tu` node.
- Added a receiver toggle and connection status in school settings. It is persisted per browser/app installation.
- Added a **Kirim ke Ruang TU** action in the browser announcement form.
- Added PWA manifest, icons, service worker, and Vercel SPA rewrite configuration.
- Configured the GitHub Actions desktop build to read Supabase frontend configuration from repository Actions Variables.
- Updated README setup guidance and safety notes.
- The earlier work in this same uncommitted worktree also prefers Google Bahasa Indonesia when available through Web Speech. The browser voice is selected by the computer that receives and plays the announcement; it is not transferred from the sender.

### Important architecture and behavior

- Tauri on the TU computer remains the local scheduler/tray process. Local schedules and WAV files remain on that computer.
- For Google Chrome's Google Indonesian voice, keep Chrome/PWA open on the TU computer, log in there, enable its remote receiver, and leave the Tauri receiver disabled to avoid competing receivers. Verify that Chrome on that specific machine lists the Google Indonesian voice.
- Remote announcements need internet at both ends. The announcement text is stored in Supabase's remote command table and then spoken by the receiving browser/Web Speech engine.
- A PWA/service worker does not guarantee background audio delivery when its browser is closed, suspended, or the computer sleeps. Keep the receiver page/browser active.
- The publishable/anon key is intended for frontend use. Never put a Supabase `service_role` key or other secret in Vite environment variables, frontend code, or Git.

### Validation completed

- `npm run build` passed after the changes.
- PWA manifest and Vercel configuration JSON parsed successfully; service worker passed `node --check`.
- PWA manifest and icon assets returned HTTP 200 from the local dev server.
- `.env.local` was confirmed ignored by `.gitignore`.
- No end-to-end Supabase test has been done: the migration still needs to be applied in the Supabase project, and the Vercel deployment/auth redirect configuration still needs to be completed.

### Next steps

1. Review and apply `supabase/migrations/20261110_remote_announcements.sql` in the intended Supabase project.
2. Disable public sign-up and create trusted operator accounts in Supabase Auth.
3. Configure Vercel environment variables and deploy the `dist` build.
4. Configure the GitHub repository Actions Variables used by desktop installer builds.
5. Add the deployed app URL to Supabase Auth's allowed site/redirect URLs.
6. Test login, enable the receiver on the TU Chrome PWA, send a harmless test announcement from another device, and verify audio and status updates.
7. Test local scheduled WAV playback with internet disconnected to confirm the offline bell requirement.
8. Revisit authorization boundaries if multiple schools, roles, or speaker nodes are introduced. Current remote command functions allow any authenticated user in this single-school project to send to the fixed node.

### Worktree and portability

At the time this note was written, the implementation files were modified/untracked on branch `main` and had not been committed or pushed. `.env.local` is local-only and ignored. To continue from another device, commit and push the source changes plus this handoff file; then clone/pull the repository and recreate environment configuration locally from `.env.example` without copying secrets into Git.

## Handoff update convention

After a substantial task, update the latest-session section with the date, goal, implementation summary, validation actually performed, remaining steps, and any changed architecture assumptions. Keep older details only when they remain useful; never record secrets or claim a deployment/test that was not actually performed.
