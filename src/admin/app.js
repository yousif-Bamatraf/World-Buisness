// src/admin/app.js
import { initLockSharedFields, getSharedFields } from "./lock-shared-fields.js";

export default {
  register() {},
  bootstrap() {
    // 1) علّم <body> إذا اللغة غير الافتراضية
    initLockSharedFields();

    const SHARED_FIELDS = getSharedFields(); // يختلف حسب UID الحالي (news / projects / resources)
    const esc = (s) => (window.CSS && CSS.escape ? CSS.escape(s) : s);

    // جذور محتملة لحقول Strapi v5 (نقطة التثبيت الوحيدة للقفل)
    const FIELD_ROOTS = [
      "[data-strapi-field]",
      "[data-strapi-field-root]",
      '[data-testid$="-field"]',
      "[data-field-root]",
      "[data-field-name]",
      "[data-name]",
    ].join(",");

    // العناصر التفاعلية داخل الحقل
    const INTERACTIVE = [
      "input",
      "textarea",
      "select",
      "button",
      '[role="switch"]',
      '[role="checkbox"]',
      '[role="combobox"]',
      '[data-testid*="relation"]',
      '[data-testid*="media"]',
    ].join(",");

    // —[ مانع أحداث (Capturing) داخل الحقول المقفولة فقط ]—
    const blockEvents = (e) => {
      if (!document.body.classList.contains("non-default-locale")) return;
      const lockedRoot =
        e.target.closest?.("[data-ui-locked]") ||
        (e.target.querySelector && e.target.querySelector("[data-ui-locked]"));
      if (!lockedRoot) return;
      e.stopImmediatePropagation();
      e.stopPropagation();
      e.preventDefault();
    };
    [
      "click",
      "mousedown",
      "keydown",
      "focusin",
      "pointerdown",
      "touchstart",
    ].forEach((ev) => document.addEventListener(ev, blockEvents, true));

    // —[ إيجاد جذور الحقول بالاسم (نرفع لأقرب جذر فقط) ]—
    const findCandidates = (name) => {
      const n = esc(name);
      const rough = document.querySelectorAll(
        [
          `[data-strapi-field-name="${n}"]`,
          `[data-name="${n}"]`,
          `[name="${n}"]`,
          `[id$="${n}"]`,
          `[id*="${n}"]`,
          `[aria-label*="${n}"]`,
          `[aria-labelledby*="${n}"]`,
        ].join(",")
      );

      const roots = Array.from(rough).map(
        (el) => el.closest(FIELD_ROOTS) || el
      );

      // حالات خاصة: ميديا لكل السكيمات
      if (
        [
          "News_images",
          "New_Avatar",
          "Project_Image",
          "Resources_file",
        ].includes(name)
      ) {
        document.querySelectorAll(`[data-testid*="media"]`).forEach((m) => {
          const r = m.closest(FIELD_ROOTS) || m;
          roots.push(r);
        });
      }

      return Array.from(new Set(roots));
    };

    // —[ أدوات التعطيل/التمكين ]—
    const toggleEl = (el, lock) => {
      if (!el) return;
      if (lock) {
        el.setAttribute("aria-disabled", "true");
        el.setAttribute("disabled", "true");
        el.setAttribute("tabindex", "-1");
        if (el.style) el.style.pointerEvents = "none";
      } else {
        el.removeAttribute("aria-disabled");
        el.removeAttribute("disabled");
        el.removeAttribute("tabindex");
        if (el.style) el.style.pointerEvents = "";
      }
    };

    const tagLocked = (el, lock) => {
      if (!el) return;
      if (lock) el.setAttribute("data-ui-locked", "");
      else el.removeAttribute("data-ui-locked");
      if ("inert" in el) el.inert = !!lock;
      if (el.style) el.style.pointerEvents = lock ? "none" : "";
    };

    const toggleContainer = (fieldRoot, lock) => {
      if (!fieldRoot) return;
      // علّم جذر الحقل فقط
      tagLocked(fieldRoot, lock);
      // عطّل التفاعلات داخله
      fieldRoot
        .querySelectorAll(INTERACTIVE)
        .forEach((el) => toggleEl(el, lock));
      // لو الجذر نفسه إدخال
      if (fieldRoot.matches('input,textarea,select,button,[role="combobox"]')) {
        toggleEl(fieldRoot, lock);
      }
      // غلاف قابل للنقر داخل نفس الجذر
      const wrapperInside = fieldRoot.querySelector(
        'div[tabindex], [role="group"]'
      );
      if (wrapperInside) tagLocked(wrapperInside, lock);
    };

    // —[ قفل عام لكل حقول التاريخ المشتركة (combobox date) ]—
    const lockDateWrappers = (lock) => {
      SHARED_FIELDS.forEach((fname) => {
        document
          .querySelectorAll(`input[name="${esc(fname)}"][role="combobox"]`)
          .forEach((inp) => {
            const root = inp.closest(FIELD_ROOTS) || inp;
            // الإدخال نفسه + جذر الحقل
            toggleEl(inp, lock);
            tagLocked(root, lock);

            // امنع أي فوكس برمجي على الإدخال
            if (lock) {
              const blurOnce = (e) => e.target.blur();
              inp.addEventListener("focus", blurOnce, {
                once: true,
                capture: true,
              });
            }

            // غلاف قابل للنقر داخل نفس الجذر
            const wrapper = inp.closest("div[tabindex]");
            if (wrapper && root.contains(wrapper)) tagLocked(wrapper, lock);

            // زر/أيقونة فتح التقويم إن وُجدت داخل الجذر
            const iconBtn = root.querySelector('button, [role="button"]');
            if (iconBtn) {
              toggleEl(iconBtn, lock);
              tagLocked(iconBtn, lock);
            }
          });
      });
    };

    const isEditView = () =>
      /^\/admin\/content-manager\/(collection-types|single-types)\//.test(
        location.pathname
      );

    // —[ تطبيق القفل ]—
    const applyLock = () => {
      const isLocked =
        document.body.classList.contains("non-default-locale") && isEditView();

      SHARED_FIELDS.forEach((fieldName) => {
        const roots = findCandidates(fieldName);
        if (roots.length === 0) {
          console.debug("[UI-LOCK] no nodes matched for", fieldName);
          return;
        }
        roots.forEach((root) => toggleContainer(root, isLocked));
      });

      // قفل خاص للتاريخ (عام)
      lockDateWrappers(isLocked);

      // أبقِ أزرار الحفظ/النشر مفتوحة دائمًا
      document
        .querySelectorAll(
          '[data-testid="submit-button"], [data-testid="publish-button"]'
        )
        .forEach((btn) => {
          btn.removeAttribute("data-ui-locked");
          if (btn.style) btn.style.pointerEvents = "";
          if ("inert" in btn) btn.inert = false;
          toggleEl(btn, false);
          // فكّ أي قفل وصل آباء الأزرار بالغلط
          let p = btn.parentElement;
          while (p && p !== document.body) {
            if (p.hasAttribute("data-ui-locked"))
              p.removeAttribute("data-ui-locked");
            if (p.style && p.style.pointerEvents === "none")
              p.style.pointerEvents = "";
            p = p.parentElement;
          }
        });
    };

    // ستايل احتياطي (ما نوسّم إلا جذور الحقول)
    const style = document.createElement("style");
    style.textContent = `
      [data-ui-locked], [data-ui-locked] * { pointer-events: none !important; }
    `;
    document.head.appendChild(style);

    // —[ مراقبة DOM + ديبونس ]—
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(applyLock);
    };
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });

    // —[ إعادة التطبيق عند التنقل داخل الأدمن ]—
    window.addEventListener("popstate", schedule);
    const PATCH_KEY = Symbol.for("uiLock:pushStatePatched");
    if (!history[PATCH_KEY]) {
      const _push = history.pushState;
      history.pushState = function (...args) {
        const r = _push.apply(this, args);
        setTimeout(schedule, 0);
        return r;
      };
      history[PATCH_KEY] = true;
    }

    // تشغيل أولي
    applyLock();
  },
};
