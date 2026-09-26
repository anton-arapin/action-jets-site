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
  function placeholder(path, kind) {
    var d = document.createElement("div");
    d.className = "ph";
    var t = document.createElement("div");
    t.className = "ph-title";
    t.textContent = kind === "video" ? "VIDEO PLACEHOLDER"
                                     : "FIGURE PLACEHOLDER";
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

  function swap(el, kind) {
    if (el.dataset.swapped) return;
    el.dataset.swapped = "1";
    var ph = placeholder(srcOf(el), kind);
    if (el.parentNode) el.parentNode.replaceChild(ph, el);
  }

  document.querySelectorAll("img.ph-img").forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) swap(img, "image");
    img.addEventListener("error", function () { swap(img, "image"); });
  });

  document.querySelectorAll("video.ph-video").forEach(function (v) {
    // a <source> that 404s fires 'error' on the <source>, not the video
    v.querySelectorAll("source").forEach(function (s) {
      s.addEventListener("error", function () { swap(v, "video"); });
    });
    v.addEventListener("error", function () { swap(v, "video"); });
    // belt and braces: nothing loadable after a moment => placeholder
    setTimeout(function () {
      if (!v.dataset.swapped && v.readyState === 0 && v.networkState === 3) {
        swap(v, "video");
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
