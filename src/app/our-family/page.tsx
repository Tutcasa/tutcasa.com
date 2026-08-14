import "@/styles/demo/our_family.css";
import type { Metadata } from "next";
import Link from "next/link";
import { T } from "@/lib/i18n";
import { BackBar } from "@/components/site/BackBar";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Our Family" },
  description:
    "The Canadian-Egyptian family behind TutCasa — from one condo in Playa del Carmen to a curated collection of 40+ homes.",
};

export default function OurFamilyPage() {
  return (
    <div className="pg-our_family">
      <BackBar />

      <section className="fam-hero">
        <div className="sun"></div>
        <div className="wrap">
          <T as="div" className="eyebrow" k="fam_eyebrow" />
          <T as="h1" k="fam_h1" />
          <T as="p" k="fam_lede" />
        </div>
      </section>

      <section className="story wrap">
        <div className="story-card">
          <div className="story-photo"></div>
          <div className="story-body">
            <T as="span" className="tag" k="fam_tag" />
            <T as="h2" k="fam_story_h" />
            <T as="p" k="fam_p1" />
            <T as="p" k="fam_p2" />
            <T as="p" k="fam_p3" />
            <T as="div" className="sign" k="fam_sign" />
          </div>
        </div>
      </section>

      <section className="fam-stats wrap">
        <div className="stat-grid">
          <div className="stat r"><b>40+</b><T k="fam_stat1" /></div>
          <div className="stat t"><b>200+</b><T k="fam_stat2" /></div>
          <div className="stat c"><b>100%</b><T k="fam_stat3" /></div>
        </div>
      </section>

      <section className="values wrap">
        <T as="div" className="sec-title" k="fam_val_title" />
        <T as="div" className="sec-sub" k="fam_val_sub" />
        <div className="val-grid">
          <div className="val"><div className="ic">&#10024;</div><T as="h3" k="fam_v1_h" /><T as="p" k="fam_v1_p" /></div>
          <div className="val"><div className="ic">&#127969;</div><T as="h3" k="fam_v2_h" /><T as="p" k="fam_v2_p" /></div>
          <div className="val"><div className="ic">&#128200;</div><T as="h3" k="fam_v3_h" /><T as="p" k="fam_v3_p" /></div>
        </div>
      </section>

      <section className="cta-band wrap">
        <div className="cta-inner">
          <span className="deco">&#127796;</span>
          <T as="h2" k="fam_cta_h" />
          <T as="p" k="fam_cta_p" />
          <div className="cta-btns">
            <Link className="btn btn-white" href="/stays"><T k="fam_cta_b1" /></Link>
            <Link className="btn btn-ghost" href="/list-my-property"><T k="fam_cta_b2" /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
