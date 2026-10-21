# J-GIT server setup (Phase 1)

1. Edit `docker-compose.yml`: set `EMAIL_DOMAIN_ALLOWLIST` to your university email domain.
2. From this folder:
   ```
   docker rm -f forgejo
   docker compose up -d
   ```
   Your repos stay (they live in the `forgejo-data` volume). Open http://localhost:3000 (Ctrl+Shift+R).
3. As admin: Create **Organization** (e.g. `CS-2026`) → create **Teams** (Owners = teachers, Students = students).
4. Create a repo inside the org, then Settings → Branches → protect `main`
   (require pull request + 1 approval, disable direct push).
5. Test the full flow with a second (student) account: clone, make branch, push, open Pull Request, review, merge.

Student quick start:
```
git clone http://localhost:3000/<org>/<repo>.git
git checkout -b my-feature
git add . && git commit -m "My change"
git push -u origin my-feature
```
Then open a Pull Request on the repo page (J-GIT → Pull requests).

## Step 1: login + backend secrets
1. In Forgejo (as admin): Settings > Applications > Generate New Token (select all scopes). Copy it once.
2. Create `.env.local` in the project root (it is git-ignored) with:
   ```
   FORGEJO_URL=http://localhost:3000
   FORGEJO_ADMIN_TOKEN=<token from step 1>
   FORGEJO_USER_SECRET=<any long random string, never change later>
   FORGEJO_OWNER_EMAIL=<the email you log in to J-UniVerse with>
   FORGEJO_OWNER_USERNAME=programmeralisher
   ALLOWED_EMAIL_DOMAINS=
   ```
3. Supabase dashboard > Authentication > Providers: Email is on by default
   (for quick tests turn OFF "Confirm email"). Google needs a Google OAuth client (set up later).
4. Restart `bun run dev`. These secrets are read only on the server; the browser never gets them.
