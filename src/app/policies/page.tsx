import "@/styles/demo/policies.css";
import type { Metadata } from "next";
import { getSetting } from "@/modules/settings";
import { BackBar } from "@/components/site/BackBar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Help & policies" },
  description:
    "Everything about deposits, payments and cancellations — clear and upfront. Have a question we haven't covered? May is one message away.",
};

/** "- " lines become bullets (grouped), other lines paragraphs;
    a line starting with a flag emoji keeps the demo's note styling. */
function Body({ text }: { text: string }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = (key: string) => {
    if (bullets.length) {
      out.push(<ul key={key}>{bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>);
      bullets = [];
    }
  };
  lines.forEach((line, i) => {
    if (line.startsWith("- ")) {
      bullets.push(line.slice(2));
    } else {
      flush(`u${i}`);
      if (line.startsWith("## ")) out.push(<h4 key={i} style={{ fontFamily: "'Baloo 2', cursive", margin: "12px 0 2px" }}>{line.slice(3)}</h4>);
      else if (line.startsWith("# ")) out.push(<h3 key={i} style={{ fontFamily: "'Baloo 2', cursive", margin: "14px 0 4px" }}>{line.slice(2)}</h3>);
      else if (line.startsWith("🇪🇬")) out.push(<div className="pol-note" key={i}>{line}</div>);
      else if (i > 0) out.push(<p key={i} style={{ marginTop: 12 }}><b>{line}</b></p>);
      else out.push(<p key={i}>{line}</p>);
    }
  });
  flush("end");
  return <>{out}</>;
}

export default async function PoliciesPage() {
  const c = await getSetting("page_policies");
  return (
    <div className="pg-policies">
      <BackBar />
      <div className="page-hero" style={{ padding: "28px 0 2px" }}>
        <div className="sun"></div>
        <div className="eyebrow">{c.hero.eyebrow}</div>
        <h1>{c.hero.title}</h1>
        <p>{c.hero.intro}</p>
      </div>
      <div className="pol-wrap">
        <nav className="pol-nav">
          {c.sections.map((s) => (
            <a key={s.id} href={`#${s.id}`}>{s.title.replace(/^[^\p{L}\p{N}]+\s*/u, "")}</a>
          ))}
        </nav>
        <div>
          {c.sections.map((s) => (
            <div className="pol-sec" id={s.id} key={s.id}>
              <h2>{s.title}</h2>
              <Body text={s.body} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
