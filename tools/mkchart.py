#!/usr/bin/env python3
"""Build the BridgeData V2 rollout chart and write it into index.html.

The page ships a STATIC SVG. Nothing is computed in the browser, no
chart library is loaded, and the figure is complete and readable with
JavaScript switched off -- the hover layer in static/js/main.js only
moves a crosshair and reads values that are already in the markup.

Edit the numbers below and re-run:

    python3 tools/mkchart.py

It replaces whatever sits between <!--chart:bridge--> and <!--/chart-->
in index.html, so it is safe to run as often as you like.

Colours come from CSS custom properties (--s0 .. --s4, defined on .viz
in static/css/style.css) so that light and dark mode each get their own
validated steps of the same hues.
"""

from pathlib import Path

# --------------------------------------------------------------- data
# Series order is fixed. It sets the legend order, the colour slot each
# model gets, and the order the hover layer reads points back in --
# do not reorder one without the others.
SERIES = [
    # key,   legend label,                     colour slot, dashed
    ("ajft", "Action Jet, fine-tuned decoder", "--s1", False),
    ("aj",   "Action Jet",                     "--s2", False),
    ("ira",  "IRASim",                         "--s3", False),
    ("wg",   "WorldGym",                       "--s4", False),
    ("copy", "copy-frame (control)",           "--s0", True),
]

# short labels for the hover tooltip, same order
TIP_LABELS = ["Action Jet, ft. decoder", "Action Jet", "IRASim",
              "WorldGym", "copy-frame"]

GAPS = [1, 2, 3, 4]

PSNR = {                                    # dB, higher is better
    "ajft": [24.57, 22.42, 21.07, 20.11],
    "aj":   [24.21, 22.07, 20.67, 19.67],
    "ira":  [23.34, 22.37, 21.64, 21.12],
    "wg":   [23.80, 21.10, 19.70, 18.86],
    "copy": [24.48, 21.48, 20.04, 19.19],
}
LPIPS = {                                   # lower is better
    "ajft": [0.073, 0.111, 0.143, 0.170],
    "aj":   [0.074, 0.110, 0.144, 0.177],
    "ira":  [0.101, 0.116, 0.127, 0.136],
    "wg":   [0.059, 0.093, 0.118, 0.137],
    "copy": [0.051, 0.084, 0.105, 0.121],
}

CAPTION = """<b>Open-loop rollouts on BridgeData&nbsp;V2</b> validation
      episodes under the recorded actions. LPIPS is the one metric the
      copy-frame control wins throughout, because consecutive Bridge
      frames barely differ
      &mdash; which is why the validity-radius measurement scores
      against that control explicitly rather than against a model."""

# ----------------------------------------------------------- geometry
W, H = 420, 268
L, R, T, B = 50, 16, 16, 34
X0, X1 = L + 12, W - R - 12
Y0, Y1 = T, H - B
STEP = (X1 - X0) / (len(GAPS) - 1)


def xs(i):
    return round(X0 + i * STEP, 1)


def panel(data, lo, hi, ticks, tickfmt, valfmt, title, unit):
    def ys(v):
        return round(Y1 - (v - lo) / (hi - lo) * (Y1 - Y0), 1)

    o = [f'<svg class="chart" viewBox="0 0 {W} {H}" role="img"',
         f'     aria-label="{title}" preserveAspectRatio="xMidYMid meet">',
         f'  <title>{title}</title>',
         '  <g class="grid">']
    o += [f'    <line x1="{L}" x2="{X1 + 12}" y1="{ys(t)}" y2="{ys(t)}"/>'
          for t in ticks]
    o.append('  </g>')
    o.append('  <g class="ylab">')
    o += [f'    <text x="{L - 8}" y="{round(ys(t) + 3.5, 1)}" '
          f'text-anchor="end">{tickfmt % t}</text>' for t in ticks]
    o.append('  </g>')
    o.append('  <g class="xlab">')
    o += [f'    <text x="{xs(i)}" y="{Y1 + 20}" text-anchor="middle">{g}</text>'
          for i, g in enumerate(GAPS)]
    o.append(f'    <text x="{round((X0 + X1) / 2, 1)}" y="{H - 4}" '
             f'text-anchor="middle" class="axtitle">frame gap</text>')
    o.append('  </g>')
    # anchored at the left edge of the box, not of the plot: anchoring it
    # to the axis pushes the text outside the viewBox and it gets clipped
    o.append(f'  <text class="axtitle" x="2" y="{T - 4}" '
             f'text-anchor="start">{unit}</text>')
    o.append(f'  <line class="xhair" x1="0" x2="0" y1="{Y0}" y2="{Y1}" '
             f'style="opacity:0"/>')

    for key, _label, var, dash in SERIES:
        pts = " ".join(f"{xs(i)},{ys(v)}" for i, v in enumerate(data[key]))
        d = ' stroke-dasharray="5 4"' if dash else ""
        o.append(f'  <polyline class="ln" points="{pts}" '
                 f'stroke="var({var})"{d}/>')
    # markers last, and series-major: main.js indexes them as
    # points[series_index * len(GAPS) + gap_index]
    for key, _label, var, _dash in SERIES:
        for i, v in enumerate(data[key]):
            o.append(f'  <circle class="pt" cx="{xs(i)}" cy="{ys(v)}" '
                     f'r="3.6" fill="var({var})" '
                     f'data-v="{valfmt % v}"/>')

    o.append('  <g class="hit">')
    for i in range(len(GAPS)):
        x = max(L, xs(i) - STEP / 2)
        o.append(f'    <rect x="{round(x, 1)}" y="{Y0}" '
                 f'width="{round(STEP, 1)}" height="{Y1 - Y0}" '
                 f'data-gap="{i}" data-cx="{xs(i)}"/>')
    o.append('  </g>')
    o.append('</svg>')
    return "\n".join(o)


def indent(block, n):
    pad = " " * n
    return "\n".join(pad + ln if ln.strip() else ln
                     for ln in block.split("\n"))


def build():
    legend = "\n".join(
        f'      <span class="lg{" lg-dash" if dash else ""}">'
        f'<i style="--c:var({var})"></i>{label}</span>'
        for _k, label, var, dash in SERIES)

    body = []
    for key, label, _var, _dash in SERIES:
        cells = "".join(f"<td>{v:.2f}</td>" for v in PSNR[key])
        cells += "".join(f'<td>{("%.3f" % v).lstrip("0")}</td>'
                         for v in LPIPS[key])
        body.append(f"          <tr><td>{label}</td>{cells}</tr>")
    body = "\n".join(body)
    heads = "".join(f"<th>{g}</th>" for g in GAPS)

    p1 = panel(PSNR, 18.4, 25.0, [19, 20, 21, 22, 23, 24, 25], "%d", "%.2f",
               "PSNR by frame gap", "PSNR (dB) ↑")
    p2 = panel(LPIPS, 0.04, 0.19, [0.05, 0.10, 0.15], "%.2f", "%.3f",
               "LPIPS by frame gap", "LPIPS ↓")

    return f'''
  <figure class="viz">
    <div class="lgrow">
{legend}
    </div>
    <div class="panels">
      <div class="panel" data-metric="psnr" data-unit="dB">
{indent(p1, 8)}
      </div>
      <div class="panel" data-metric="lpips" data-unit="">
{indent(p2, 8)}
      </div>
    </div>
    <div class="tip" hidden></div>
    <figcaption>
      {CAPTION}
    </figcaption>
  </figure>

'''


if __name__ == "__main__":
    page = Path(__file__).resolve().parent.parent / "index.html"
    src = page.read_text()
    open_m, close_m = "<!--chart:bridge-->", "<!--/chart-->"
    a = src.index(open_m) + len(open_m)
    b = src.index(close_m, a)
    page.write_text(src[:a] + build() + "  " + src[b:])
    print(f"wrote the bridge chart into {page.name}")
