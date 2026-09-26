/* =====================================================================
   Action Jets -- project page behaviour.

   Three small things, no dependencies:
     1. Any <img class="ph-img"> or <video class="ph-video"> whose file
        is missing is replaced by a dashed placeholder naming the path
        it expected. So the page reads correctly BEFORE you add media,
        and the placeholder disappears by itself once the file is there.
     2. Videos only play while on screen, so a page full of clips does
        not melt a laptop.
     3. The nav underlines whichever section you are looking at.
   ===================================================================== */
(function () {
  "use strict";

  /* ---------------------------------------------------- placeholders */
  function placeholder(path, kind, title) {
    var d = document.createElement("div");
    d.className = "ph";
    var t = document.createElement("div");
    t.className = "ph-title";
    t.textContent = title || (kind === "video" ? "VIDEO PLACEHOLDER"
                                               : "FIGURE PLACEHOLDER");
    var p = document.createElement("div");
    p.className = "ph-path";
    p.textContent = path || "(no file set)";
    d.appendChild(t);
    d.appendChild(p);
    return d;
  }

  function srcOf(el) {
    if (el.tagName === "VIDEO") {
      var s = el.querySelector("source");
      return (s && s.getAttribute("src")) || el.getAttribute("src") || "";
    }
    return el.getAttribute("src") || "";
  }

  function swap(el, kind, title) {
    if (el.dataset.swapped) return;
    el.dataset.swapped = "1";
    var ph = placeholder(srcOf(el), kind, title);
    if (el.parentNode) el.parentNode.replaceChild(ph, el);
  }

  /* A video can fail for two different reasons and they need different
     messages: the file is not there yet (the normal case while the page
     is being filled in), or the file IS there and this browser will not
     decode it. Ask the server which one it is before replacing anything,
     so a codec problem is never reported as a missing file. */
  function swapVideo(el) {
    if (el.dataset.swapped) return;
    var src = srcOf(el);
    if (!src || !window.fetch) { swap(el, "video"); return; }
    fetch(src, { method: "HEAD" }).then(function (r) {
      if (r.ok) {
        swap(el, "video", "THIS BROWSER CANNOT PLAY THIS FILE");
      } else {
        swap(el, "video");
      }
    }).catch(function () { swap(el, "video"); });
  }

  document.querySelectorAll("img.ph-img").forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) swap(img, "image");
    img.addEventListener("error", function () { swap(img, "image"); });
  });

  document.querySelectorAll("video.ph-video").forEach(function (v) {
    // a <source> that 404s fires 'error' on the <source>, not the video
    v.querySelectorAll("source").forEach(function (s) {
      s.addEventListener("error", function () { swapVideo(v); });
    });
    v.addEventListener("error", function () { swapVideo(v); });
    // belt and braces: nothing loadable after a moment => check and swap
    setTimeout(function () {
      if (!v.dataset.swapped && v.readyState === 0 && v.networkState === 3) {
        swapVideo(v);
      }
    }, 2500);
  });

  /* ------------------------------------------------ play when visible */
  var vids = document.querySelectorAll("video[autoplay]");
  if ("IntersectionObserver" in window && vids.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        } else {
          v.pause();
        }
      });
    }, { rootMargin: "120px 0px", threshold: 0.1 });
    vids.forEach(function (v) { io.observe(v); });
  }

  /* ------------------------------------------------------- lightbox */
  /* Click a figure image to see it at full size. Figures are wide and
     the column is narrow, so a rollout strip is unreadable inline.
     Works on anything inside a <figure>; the placeholder boxes are not
     images, so they are skipped automatically. */
  var box = null;

  function closeBox() {
    if (!box) return;
    box.classList.remove("on");
    document.body.style.overflow = "";
    var b = box;
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); },
               180);
    box = null;
  }

  function openBox(src, alt, caption) {
    closeBox();
    box = document.createElement("div");
    box.className = "lightbox";
    box.innerHTML =
      '<button class="lb-close" aria-label="Close">&times;</button>' +
      '<figure><img src="" alt=""><figcaption></figcaption></figure>';
    var img = box.querySelector("img");
    img.src = src;
    img.alt = alt || "";
    var cap = box.querySelector("figcaption");
    if (caption) cap.textContent = caption;
    else cap.remove();
    document.body.appendChild(box);
    document.body.style.overflow = "hidden";
    // next frame, so the transition has something to animate from
    requestAnimationFrame(function () { box.classList.add("on"); });
    box.addEventListener("click", function (e) {
      if (e.target === img) return;      // clicking the image itself keeps it
      closeBox();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeBox();
  });

  document.querySelectorAll("figure img").forEach(function (img) {
    if (img.closest(".lightbox")) return;
    img.classList.add("zoomable");
    img.addEventListener("click", function () {
      if (!img.naturalWidth) return;     // nothing loaded yet: do nothing
      var fig = img.closest("figure");
      var fc = fig && fig.querySelector("figcaption");
      openBox(img.currentSrc || img.src, img.alt,
              fc ? fc.textContent.trim() : "");
    });
  });

  /* ------------------------------------------------- chart hover layer */
  /* The SVG itself is static. All this does is move a crosshair and
     read the values already in the markup, so the chart is complete
     and correct with scripts off. */
  var SERIES = [
    { v: "--s1", label: "Action Jet, ft. decoder" },
    { v: "--s2", label: "Action Jet" },
    { v: "--s3", label: "IRASim" },
    { v: "--s4", label: "WorldGym" },
    { v: "--s0", label: "copy-frame" }
  ];

  document.querySelectorAll(".viz").forEach(function (viz) {
    var tip = viz.querySelector(".tip");
    if (!tip) return;

    viz.querySelectorAll(".panel").forEach(function (panel) {
      var svg = panel.querySelector("svg");
      var hair = svg.querySelector(".xhair");
      var pts = svg.querySelectorAll(".pt");
      var metric = panel.dataset.metric;
      var unit = panel.dataset.unit || "";
      var fixed = metric === "lpips" ? 3 : 2;

      function hide() {
        hair.style.opacity = 0;
        tip.hidden = true;
      }

      svg.querySelectorAll(".hit rect").forEach(function (rect) {
        function show(ev) {
          var gap = +rect.dataset.gap;
          var cx = +rect.dataset.cx;
          hair.setAttribute("x1", cx);
          hair.setAttribute("x2", cx);
          hair.style.opacity = 0.5;

          var rows = SERIES.map(function (s, si) {
            // points are emitted series-major, four per series
            var c = pts[si * 4 + gap];
            if (!c) return "";
            var val = c.getAttribute("data-v");
            return '<div class="r" style="--c:var(' + s.v + ')">' +
                   "<i></i>" + s.label + "<span>" + val + "</span></div>";
          }).join("");

          tip.innerHTML = "<b>gap " + (gap + 1) +
                          (unit ? " &middot; " + unit : "") + "</b>" + rows;
          tip.hidden = false;

          var vr = viz.getBoundingClientRect();
          var pr = panel.getBoundingClientRect();
          var x = pr.left - vr.left + (cx / 420) * pr.width;
          var y = ev.clientY - vr.top;
          var tw = tip.offsetWidth;
          tip.style.left =
            Math.max(0, Math.min(vr.width - tw, x - tw / 2)) + "px";
          // above the cursor by default, below it when there is no room
          var ty = y - tip.offsetHeight - 14;
          tip.style.top = (ty < 0 ? y + 18 : ty) + "px";
        }
        rect.addEventListener("mousemove", show);
        rect.addEventListener("mouseenter", show);
      });

      svg.addEventListener("mouseleave", hide);
      panel.addEventListener("mouseleave", hide);
    });
  });

  /* --------------------------------------------------------- scrollspy */
  var links = Array.prototype.slice.call(
    document.querySelectorAll(".nav-links a[href^='#']"));
  var targets = links
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  if ("IntersectionObserver" in window && targets.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle("active",
            a.getAttribute("href") === "#" + e.target.id);
        });
      });
    }, { rootMargin: "-60px 0px -70% 0px", threshold: 0 });
    targets.forEach(function (t) { spy.observe(t); });
  }
})();
