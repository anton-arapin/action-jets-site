# Action Jets — project page

A single static page. No build step, no framework, no CDN: everything it
needs is in this folder, so it will still render identically in five
years.

```
action-jets-site/
├── index.html            the whole page
├── static/
│   ├── css/style.css     one stylesheet (theme tokens at the top)
│   ├── js/main.js        placeholders, play-on-screen, nav scrollspy
│   ├── images/           put figures + poster frames here
│   ├── videos/           put .mp4 files here
│   └── paper/            put action_jets.pdf here
└── README.md
```

Every place you are meant to drop something in is marked `EDIT ME` in
`index.html`. Until a file exists, the page draws a dashed box naming
the exact path it is waiting for, so you can always see what is still
missing just by loading the page.

---

## 1. Adding the MP4 videos

Drop the files into `static/videos/` using **exactly** these names. No
HTML editing is needed — the moment a file is there, the placeholder is
replaced by the real video on the next reload.

| File | Section | What it should show |
| --- | --- | --- |
| `fanout_1.mp4` `fanout_2.mp4` `fanout_3.mp4` | Speed | breadth search, three episodes, side by side |
| `gt_1.mp4` `gt_2.mp4` `gt_3.mp4` `gt_4.mp4` | Tracing the manifold | the sweep, four episodes, in a 2×2 grid |

The four sweep clips are `slide_videos.py`'s `gt.mp4` output for four
different episodes: run the script per episode and rename each result
`gt_1.mp4` … `gt_4.mp4`.

Both groups are plain grids, so the count is not fixed. To show five
sweeps or two fan-outs instead, copy or delete a `<figure class="media">`
block in that section of `index.html` — the grid reflows on its own. To
use a different filename, edit that block's one `<source src="...">`
line.

### Encoding

The page autoplays clips muted and inline, which browsers only allow for
H.264 in a `yuv420p` pixel format. `slide_videos.py` already writes them
that way. For anything encoded elsewhere, normalise it first:

```bash
ffmpeg -i in.mp4 \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 20 \
  -movflags +faststart -an out.mp4
```

- `-pix_fmt yuv420p` — without it Safari and iOS show a black frame.
- `-movflags +faststart` — puts the index at the front so playback
  starts before the file has finished downloading.
- `-an` — the page mutes audio anyway, so drop the track.
- **Keep each file under ~10 MB.** GitHub refuses single files over
  100 MB and warns past 50 MB, and a visitor on a phone loads the
  teaser before anything else. If a clip is too big, cut the frame rate
  (`-r 20`), scale it (`-vf scale=960:-2`), or raise `-crf` to 24.

Total page weight is worth watching too: seven clips at 8 MB is 56 MB,
which is a slow first visit even though the page only plays what is on
screen.

---

## 2. Adding the figures and the PDF

Same idea — drop files in and the placeholders go away.

| File | Where |
| --- | --- |
| `static/images/teaser.png` | top of the page, above the abstract |
| `static/images/method.png` | Method, after the Taylor expansion |
| `static/images/bridge_rollout_1.png` | Speed, qualitative rollout |
| `static/images/bridge_rollout_2.png` | Speed, second rollout |
| `static/images/favicon.png` | browser tab icon (32×32 or 64×64) |
| `static/images/og_card.png` | link preview card (1200×630) |
| `static/paper/action_jets.pdf` | the Paper button |

PNG at roughly 1600 px wide is plenty; the page never displays anything
wider than 880 px. Export figures from the LaTeX sources rather than
screenshotting them.

Two further figure slots are written but **commented out**, so they do
not show as empty boxes: one in the validity-radius section
(`fig_radius.png`) and one in the manifold section
(`fig_nvs_qual.png`). If you want either, drop the PNG in and delete the
`<!--` / `-->` around that block.

---

## 3. The three things still left blank on purpose

- **arXiv button** — `href=""` in `index.html`. Paste the abs URL in
  when the preprint is up.
- **Code button** — also `href=""`, so clicking it reloads the page,
  and it carries a "coming soon" tag. Swap in the repo URL and delete
  the `btn-soon` class and the `<span class="tag">` when the code is
  out.
- **BibTeX** — the `<pre class="bib"><code></code></pre>` block near the
  bottom. Paste the entry between the `<code>` tags, keeping its
  indentation; the block preserves whitespace exactly as typed.

---

## 4. Previewing locally

Open `index.html` directly and most of it works, but `file://` blocks
some media loads, so use a server:

```bash
cd action-jets-site
python3 -m http.server 8000
```

Then visit <http://localhost:8000>. Hard-reload (Shift-Reload) after
adding a video — browsers cache a 404 aggressively.

---

## 5. Hosting on GitHub Pages

You have two URL shapes to choose between.

**Option A — user site, at `https://<username>.github.io`.**
The repo must be named exactly `<username>.github.io`. One per account.

**Option B — project site, at `https://<username>.github.io/action-jets/`.**
Any repo name. Use this one if `<username>.github.io` is already taken
by something else. Every path in this page is relative, so it works in a
subdirectory with no changes.

### Steps

1. Create an empty **public** repo on GitHub (no README, no .gitignore —
   this folder already has what it needs).

2. Push **the contents of `action-jets-site/`** at the repo root, so
   that `index.html` sits at the top level, not inside a subfolder:

   ```bash
   cd action-jets-site
   git init -b main
   git add .
   git commit -m "Action Jets project page"
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```

   If you would rather not use git: on the empty repo's page click
   **uploading an existing file**, then drag in `index.html`, the
   `static` folder and `README.md` — the *contents* of the unzipped
   folder, not the folder itself — and commit. The web uploader keeps
   the folder structure inside `static/`, but it will silently skip
   `.nojekyll` because it is a hidden file. That file is only a
   precaution here (nothing in this site starts with an underscore), so
   you can ignore it, or recreate it with **Add file → Create new file**
   and the filename `.nojekyll`.

3. On GitHub: **Settings → Pages → Build and deployment**.
   Source = *Deploy from a branch*, Branch = `main`, folder = `/ (root)`.
   Save.

4. Wait a minute or two. The URL appears at the top of that same Pages
   settings panel, and the deploy shows up under the Actions tab.

This site is a **project site**. If you already host a personal page at
`https://<username>.github.io`, that is a separate repo and this does
not touch it: the two coexist, and the project site appears at
`https://<username>.github.io/<repo>/`. The one collision to know about
is if your personal-site repo happens to contain a folder with the same
name as this repo — then the project site wins at that path. Pick a repo
name your personal site does not already use and there is nothing to
think about.

### Things that trip people up

- **`index.html` must be at the repo root.** If you push the folder
  itself, you get `<repo>/action-jets-site/index.html` and Pages serves
  a 404. Either push the contents, or set the Pages folder to `/docs`
  and rename the folder `docs`.
- **Videos are large binaries.** Git stores every version of them
  forever, so avoid re-committing re-encodes repeatedly; if you expect
  many revisions, use Git LFS, and note that LFS files do get served by
  Pages but count against a bandwidth quota.
- **The repo has to be public** for Pages on a free account.
- **Cached old version?** Pages sits behind a CDN. Give it a couple of
  minutes and hard-reload.
- A `.nojekyll` file is included so GitHub serves the folder verbatim
  rather than running it through Jekyll. Leave it there.

### A custom domain, if you want one later

Settings → Pages → Custom domain, enter it, then add a `CNAME` DNS
record pointing at `<username>.github.io`. Tick *Enforce HTTPS* once the
certificate is issued.

---

## 6. The equations

The method section carries the paper's math. It is hand-built HTML, not
MathJax or KaTeX: no CDN, nothing to load, no flash of raw `$...$`
before a typesetter runs, and it still renders in a browser with
scripts off. Four small pieces do all the work, defined at the bottom of
`static/css/style.css`:

| Markup | Renders |
| --- | --- |
| `<span class="frac"><span class="num">a</span><span class="den">b</span></span>` | a stacked fraction (add `fr-s` for a small inline one like ½) |
| `<span class="sum"><span class="supl">A</span><span class="sop">&#8721;</span><span class="slim">i=1</span></span>` | a summation with limits above and below (drop `supl` for below only) |
| `&radic;<span class="rad">x + y</span>` | a radical with the overbar across its contents |
| `<span class="hat">z</span>`, `<span class="tld">r</span>` | a circumflex or tilde accent over one letter |

Everything else is ordinary `<sub>`, `<sup>`, `<i>` and HTML entities
(`&alpha;`, `&epsilon;`, `&#8477;` for ℝ, `&#8214;` for the norm bars).
Each equation sits in a `<div class="eq">`, which scrolls sideways on a
phone rather than overflowing the page.

If you change a symbol in the paper, change it here too — nothing is
generated from the LaTeX.

---

## 7. Retheming

The top of `static/css/style.css` is a block of custom properties —
ink, rule, card, background, and the two accent colours, which are the
paper's `#2a78d6` and `#eb6834`. Change them there and the whole page
follows. Dark mode is a second set of the same tokens a few lines
below; it follows the visitor's system setting.
