import "@/styles/demo/our_family.css";
import type { Metadata } from "next";
import Link from "next/link";
import { T } from "@/lib/i18n";
import { BackBar } from "@/components/site/BackBar";
import { getSetting } from "@/modules/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Our Family" },
  description:
    "The Canadian-Egyptian family behind TutCasa — from one condo in Playa del Carmen to a curated collection of 40+ homes.",
};

export default async function OurFamilyPage() {
  const c = await getSetting("page_family");
  // admin text wins when set; empty fields keep the translated built-ins
  const or = (v: string, k: string) => (v ? <>{v}</> : <T k={k} />);

  return (
    <div className="pg-our_family">
      <BackBar />

      <section className="fam-hero">
        <div className="sun"></div>
        <div className="wrap">
          <div className="eyebrow">{or(c.eyebrow, "fam_eyebrow")}</div>
          <h1>{or(c.title, "fam_h1")}</h1>
          <p>{or(c.intro, "fam_lede")}</p>
        </div>
      </section>

      <section className="story wrap">
        <div className="story-card">
          <div className="story-photo"></div>
          <div className="story-body">
            <span className="tag">{or(c.tag, "fam_tag")}</span>
            <h2>{or(c.storyTitle, "fam_story_h")}</h2>
            <p>{or(c.p1, "fam_p1")}</p>
            <p>{or(c.p2, "fam_p2")}</p>
            <p>{or(c.p3, "fam_p3")}</p>
            <div className="sign">{or(c.sign, "fam_sign")}</div>
          </div>
        </div>
      </section>

      <section className="fam-stats wrap">
        <div className="stat-grid">
          {(["r", "t", "c"] as const).map((cls, i) => (
            <div className={`stat ${cls}`} key={i}>
              <b>{c.stats[i]?.big ?? ""}</b>
              {c.stats[i]?.label
                ? <span>{c.stats[i].label}</span>
                : <T k={`fam_stat${i + 1}`} />}
            </div>
          ))}
        </div>
      </section>

      <section className="values wrap">
        <div className="sec-title">{or(c.valuesTitle, "fam_val_title")}</div>
        <div className="sec-sub">{or(c.valuesSub, "fam_val_sub")}</div>
        <div className="val-grid">
          {[0, 1, 2].map((i) => (
            <div className="val" key={i}>
              <div className="ic">{c.values[i]?.icon || ["✨", "🏡", "📈"][i]}</div>
              <h3>{or(c.values[i]?.title ?? "", `fam_v${i + 1}_h`)}</h3>
              <p>{or(c.values[i]?.text ?? "", `fam_v${i + 1}_p`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-band wrap">
        <div className="cta-inner">
          <span className="deco">&#127796;</span>
          <h2>{or(c.ctaTitle, "fam_cta_h")}</h2>
          <p>{or(c.ctaText, "fam_cta_p")}</p>
          <div className="cta-btns">
            <Link className="btn btn-white" href="/stays"><T k="fam_cta_b1" /></Link>
            <Link className="btn btn-ghost" href="/list-my-property"><T k="fam_cta_b2" /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
