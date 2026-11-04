# Vedic Valor and Sanskritam homepages

Light, responsive, buildless HTML/CSS/JS. Prepared locally on 2026-11-04; these
changes have **not** been deployed or connected to the domains.

## Preview and build

From the repository root:

```powershell
node deploy/cloudflare/homepages/build.mjs
node deploy/cloudflare/homepages/check.mjs
python -m http.server 4173 --bind 127.0.0.1 --directory deploy/cloudflare/homepages/dist
```

- Vedic Valor: http://127.0.0.1:4173/vedicvalor/
- Sanskritam: http://127.0.0.1:4173/sanskritam/

Source pages are in `pages/`; shared CSS, JS, fonts, and images are in `assets/`.
The build copies each page and its assets to an independent deployable folder
under `dist/`. No npm installation or framework is needed. Navigation, download
links, and FAQ disclosures work without JavaScript. JavaScript adds the word
sampler, current copyright year, and localhost-only cross-page preview links.

## Connect later with Cloudflare

After authentication, build once with the command above.

**Root domain:** `wrangler.toml` in this folder defines a new static Worker named
`vedicvalor-home`, with `dist/vedicvalor` as its asset directory. It is prepared
for `vedicvalor.com` and `www.vedicvalor.com` custom domains.

```powershell
cd deploy/cloudflare/homepages
npx wrangler deploy
```

**Sanskritam:** the existing `../legal-site/wrangler.toml` serves
`dist/sanskritam` through an `ASSETS` binding. The existing worker retains the
HTTPS redirect, HSTS, `/privacy` and `/delete-account` backend proxies, and 404
behavior. It serves the new homepage at `/` and the local assets at `/assets/`.
Deploy this existing Worker rather than creating a second static site on the
same hostname: the legal URLs must continue reaching the backend.

```powershell
cd deploy/cloudflare/legal-site
npx wrangler deploy
```

These are future deployment commands, not actions taken during the local build.
The account and hostname values reuse the repository's existing Cloudflare
configuration. No credentials are included in the source or export.

## Public destinations

- Google Play: https://play.google.com/store/apps/details?id=com.sanskritam.app
- Privacy: https://sanskritam.vedicvalor.com/privacy
- Account deletion: https://sanskritam.vedicvalor.com/delete-account
- Support: sanskritam@vedicvalor.com (the address on the Play listing)

The Play listing and both legal endpoints were reachable on 2026-11-04.
App Store availability is explicitly **coming soon**, with no placeholder link.

## Assets and privacy

- Existing app icon: `mobile/assets/icon.png`, resized to a 192px WebP.
- Existing Gītā cover: `mobile/assets/covers/gita.webp`, kept in full proportion.
  Existing artwork policy was read before reuse.
- Self-hosted Lora, DM Sans, and Tiro Devanagari Sanskrit, sourced from Google
  Fonts. SIL Open Font License files are included alongside the fonts.
- Vedic Valor's circular sun-and-crossed-swords emblem was adapted with the
  built-in image generator from the owner's supplied reference on 2026-11-04.
  Transparent WebPs at 64px, 192px, and 768px cover favicon, header/footer, and
  larger brand uses. The generated original was discarded after verification;
  the prompt, source/native hashes, dimensions, and derivative hashes are in
  `specs/artwork/vedicvalor-brand-20261104.json`. Sanskrit and all other text
  remain real selectable HTML, independent of the images.
- No tracking, cookies, sign-in, forms, or third-party runtime requests.

## Verification

Run `check.mjs` after building. It checks static asset references, production
destinations, and Worker routing, including preservation of both legal proxies.
Browser QA covers phone and desktop layouts, cross-site navigation, word-sampler
selection, and FAQ disclosures. Cloudflare production routing needs verification
after the later deployment; local tests do not certify a live deployment.

Verified on 2026-11-04: 320px and 390px phone widths, 768px tablet width, and
the default desktop viewport. No horizontal overflow was observed. Both
Cloudflare configurations passed `wrangler deploy --dry-run` without deployment.
