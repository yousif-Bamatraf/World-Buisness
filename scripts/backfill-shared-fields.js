// تشغيل:
//   DRY=1 node scripts/backfill-shared-fields.js   // تجربة بدون كتابة
//   node scripts/backfill-shared-fields.js          // تنفيذ فعلي

const DEFAULT_LOCALE = "ar"; // غيّر لغة الديفولت هنا إن كانت مختلفة

// عرّف كل الكونتنت تايب مع حقوله المشتركة
const CONFIG = [
  {
    uid: "api::news.news",
    sharedFields: ["News_images", "News_tags", "News_Date", "New_Avatar"],
  },
  //   { uid: "api::project.project", sharedFields: ["News_images"] },
  //   { uid: "api::resource.resource", sharedFields: ["News_images"] },

  // مثال ثاني:
  // { uid: 'api::page.page', sharedFields: ['cover', 'hero_media'], status: 'published' },
];

// حجم الصفحة (يفيد لو عندك آلاف السجلات)
const PAGE_SIZE = 100;

const DRY = !!process.env.DRY;

function isEmptyValue(val) {
  return (
    val == null ||
    (Array.isArray(val) && val.length === 0) ||
    (typeof val === "object" &&
      !Array.isArray(val) &&
      Object.keys(val).length === 0)
  );
}

function toRelIds(v) {
  if (Array.isArray(v)) return v.map((x) => x?.id ?? x?.documentId ?? x);
  if (v && typeof v === "object") return v.id ?? v.documentId ?? v;
  return v;
}

async function backfillType(app, { uid, sharedFields }) {
  let page = 1;
  let totalUpdated = 0;

  // نجلب سجلات الديفولت على صفحات
  while (true) {
    const bases = await app.documents(uid).findMany({
      locale: DEFAULT_LOCALE,
      page,
      pageSize: PAGE_SIZE,
      populate: {
        localizations: { populate: sharedFields },
        ...Object.fromEntries(sharedFields.map((f) => [f, true])),
      },
    });

    if (!bases || bases.length === 0) break;

    for (const base of bases) {
      const localizations = base.localizations || [];
      for (const loc of localizations) {
        const patch = {};
        for (const f of sharedFields) {
          const baseVal = base[f];
          const locVal = loc[f];
          if (isEmptyValue(locVal) && !isEmptyValue(baseVal)) {
            patch[f] = toRelIds(baseVal);
          }
        }

        if (Object.keys(patch).length) {
          if (DRY) {
            console.log(
              `[DRY] would update ${uid} loc ${loc.documentId} <= base ${base.documentId}`,
              patch
            );
          } else {
            await app.documents(uid).update({
              documentId: loc.documentId,
              data: patch,
            });
            totalUpdated++;
            console.log(
              `✔ synced ${uid} loc ${loc.documentId} <= base ${base.documentId}`
            );
          }
        }
      }
    }

    if (bases.length < PAGE_SIZE) break;
    page++;
  }

  return totalUpdated;
}

async function run() {
  const strapiFactory = require("@strapi/strapi");
  const app = await strapiFactory.createStrapi();
  await app.load();

  let grandTotal = 0;
  for (const cfg of CONFIG) {
    console.log(
      `\n=== Backfilling ${cfg.uid} (shared: ${cfg.sharedFields.join(", ")}) ===`
    );
    const updated = await backfillType(app, cfg);
    console.log(
      `=> ${cfg.uid}: ${DRY ? "[dry-run] " : ""}${updated} localization(s) updated`
    );
    grandTotal += updated;
  }

  await app.destroy();
  console.log(`\nDone. ${DRY ? "[dry-run] " : ""}Total updates: ${grandTotal}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
