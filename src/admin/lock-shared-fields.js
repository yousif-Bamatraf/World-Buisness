// src/admin/lock-shared-fields.js

// اللغة الافتراضية في لوحة الأدمن (طابقها مع إعداداتك)
const DEFAULT_LOCALE = "ar";

/**
 * خريطة الحقول المشتركة (localized:false) لكل Content-Type
 * الأسماء هنا بالحرف تمامًا كما في schema.json
 */
const SHARED_BY_UID = {
  // News
  "api::newse.newse": ["News_tags", "News_Date", "News_images", "New_Avatar"],

  // Projects
  "api::project.project": [
    "Project_Start_Date",
    "Project_End_Date",
    "Project_Cost",
    "Is_Favourite",
    "Project_Status",
    "Project_Image",
  ],

  // Resources
  "api::resource.resource": [
    "Resources_Tags",
    "Resource_Date",
    "Resources_file",
    "Resource_Type",
  ],
};

/**
 * يحاول استخراج UID الحالي من مسار الأدمن أو من الكويري
 * أمثلة:
 *  /admin/content-manager/collection-types/api::newse.newse/<id>?locale=en
 *  /admin/content-manager/single-types/api::project.project?locale=en
 */
const getCurrentUID = () => {
  const path = location.pathname;
  const m = path.match(
    /\/admin\/content-manager\/(?:collection-types|single-types)\/([^/?#]+)/
  );
  if (m && m[1]) return decodeURIComponent(m[1]);

  // احتياط من الكويري (لو plugin آخر حاطها هناك)
  const params = new URLSearchParams(location.search);
  const qUID =
    params.get("contentType") ||
    params.get("contentTypeUid") ||
    params.get("uid");
  return qUID || null;
};

/**
 * واجهة بسيطة يستدعيها app.js
 * ترجع قائمة الحقول المشتركة للـUID المفتوح حاليًا
 * ولو تعذّر تحديد الـUID، ترجع اتحاد كل الحقول (لا يضر، فقط يطبع no nodes matched أحيانًا)
 */
export function getSharedFields() {
  const uid = getCurrentUID();
  if (uid && uid in SHARED_BY_UID) return SHARED_BY_UID[uid];

  // اتحاد كل القوائم احتياطًا
  const union = new Set();
  Object.values(SHARED_BY_UID).forEach((arr) =>
    arr.forEach((k) => union.add(k))
  );
  return Array.from(union);
}

/**
 * دالة مساعدة (اختيارية): لو احتجت تجيب حقول UID معيّن يدويًا
 */
export function getSharedFieldsFor(uid) {
  return SHARED_BY_UID[uid] || [];
}

/**
 * يعلّم <body> بكلاس non-default-locale إذا اللوكال الحالية ≠ DEFAULT_LOCALE
 * بحيث app.js يعتمد عليه لقفل الحقول
 */
export function initLockSharedFields() {
  const applyFlag = () => {
    const params = new URLSearchParams(location.search);
    const locale = params.get("plugins[i18n][locale]");
    const isNonDefault = !!locale && locale !== DEFAULT_LOCALE;
    document.body.classList.toggle("non-default-locale", isNonDefault);
    console.log(
      "[UI-LOCK] locale=",
      locale || "(default)",
      "locked=",
      isNonDefault
    );
  };

  applyFlag();
  window.addEventListener("popstate", applyFlag);

  // رقعة pushState لتحديث الحالة عند تنقّل الأدمن
  const PATCH_KEY = Symbol.for("uiLock:localePatched");
  if (!history[PATCH_KEY]) {
    const origPush = history.pushState;
    history.pushState = function (...args) {
      const ret = origPush.apply(this, args);
      setTimeout(applyFlag, 0);
      return ret;
    };
    history[PATCH_KEY] = true;
  }
}
