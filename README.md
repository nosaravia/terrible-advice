# Terrible Advice

Good friends. Bad ideas. A browser party game for 2–10 people, plus Solo Practice with two computer opponents. Create a room, share its code, write absurd advice using a secret ingredient, and vote for the biggest laugh over five rounds.

Family and Anything Goes prompt packs, optional read-aloud mode, synchronized timers, hidden authors, scoring, reconnects, and rematches are included. Two-player rooms get a neutral house answer so both humans have something to vote for. Computer votes in Solo Practice are random and are not an assessment of humor.

No player accounts, API keys, or downloads are needed. Player-written answers are not automatically moderated.

## Cloudflare Workers deployment

1. Connect this GitHub repository to a Cloudflare Worker named `terrible-advice`.
2. Create a D1 database named `terrible-advice-db`.
3. Build command: `npm run build`.
4. Deploy command: `npm run deploy`.
5. Build variable: `TERRIBLE_ADVICE_DATABASE_ID`, containing the D1 database UUID.

Cloudflare installs the locked dependencies. The deploy script applies the database schema and publishes both the Worker and static files. Keep public workers.dev access enabled for players and judges. No paid-plan upgrade is required by this source configuration; account limits still apply.

Rooms expire after 24 hours without a stored change. D1 stores live game state with optimistic revision checks. Browser session tokens stay in each player's tab and are redacted from other players' responses. Local test rooms are not included in this repository.

## Validation

Use Node.js 24 or newer, then `npm ci`, `npm test`, and `npm run build`. Tests cover five-round games, concurrency, privacy, scoring, host recovery, reconnects, solo, and two-player rules.

After publishing, verify independent players can create and join a room on the public URL, finish a game, and rematch before submitting that public URL to a competition. GitHub source links alone are not a playable deployment.

## Third-party assets

The mode icons are from Tabler Icons (MIT); their license is included in `public/icons/LICENSE`. The interface uses DM Sans and Space Grotesk through Google Fonts.
