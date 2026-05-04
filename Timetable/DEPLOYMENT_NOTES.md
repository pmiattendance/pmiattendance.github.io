# Teacher Timetable Deployment Notes

## GitHub Pages file structure

Keep these files in the same folder:

- `teacher_timetable.html`
- `app.js`
- `auth.js`
- `db.js`
- `ui.js`

The HTML loads `./app.js`, and `app.js` imports `./auth.js`, `./db.js`, and `./ui.js`.

## Case-sensitive filenames

GitHub Pages is case-sensitive. Use these exact lowercase names:

- `app.js`
- `auth.js`
- `db.js`
- `ui.js`

Do not rename them to `App.js`, `Auth.js`, `DB.js`, or `UI.js`.

## Firebase security

The Firebase config in `db.js` is safe to show publicly, but Firestore rules decide who can read or write data.

This project now ships with `firestore.rules`, which blocks all Firestore reads and writes:

```txt
allow read, write: if false;
```

That is the safe default for GitHub Pages because this app does not use Firebase Authentication yet. The app will still work on each device using browser local storage.

Only turn `CLOUD_SYNC_ENABLED` to `true` in `db.js` after adding real Firebase Authentication and replacing the locked rules with authenticated rules.
