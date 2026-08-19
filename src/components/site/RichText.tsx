/**
 * Lightweight rich text for admin-written content (descriptions and
 * editable pages). Line-based, no dependencies:
 *
 *   # Big heading      → styled H2 in the site's display font
 *   ## Small heading   → styled H3
 *   - bullet item      → list
 *   anything else      → paragraph
 */

const H1_STYLE: React.CSSProperties = {
  fontFamily: "'Baloo 2', cursive",
  fontSize: "1.35em",
  fontWeight: 800,
  margin: "14px 0 4px",
  lineHeight: 1.25,
};
const H2_STYLE: React.CSSProperties = {
  fontFamily: "'Baloo 2', cursive",
  fontSize: "1.12em",
  fontWeight: 700,
  margin: "12px 0 2px",
  lineHeight: 1.3,
};

export function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  let para: string[] = [];

  const flushBullets = (key: string) => {
    if (!bullets.length) return;
    out.push(
      <ul key={key} style={{ margin: "6px 0 8px", paddingLeft: 22 }}>
        {bullets.map((b, i) => <li key={i}>{b}</li>)}
      </ul>,
    );
    bullets = [];
  };
  const flushPara = (key: string) => {
    if (!para.length) return;
    out.push(<p key={key} style={{ margin: "6px 0" }}>{para.join(" ")}</p>);
    para = [];
  };

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) { flushBullets(`b${i}`); flushPara(`p${i}`); return; }
    if (line.startsWith("## ")) {
      flushBullets(`b${i}`); flushPara(`p${i}`);
      out.push(<h3 key={i} style={H2_STYLE}>{line.slice(3)}</h3>);
    } else if (line.startsWith("# ")) {
      flushBullets(`b${i}`); flushPara(`p${i}`);
      out.push(<h2 key={i} style={H1_STYLE}>{line.slice(2)}</h2>);
    } else if (line.startsWith("- ")) {
      flushPara(`p${i}`);
      bullets.push(line.slice(2));
    } else {
      flushBullets(`b${i}`);
      para.push(line);
    }
  });
  flushBullets("bEnd");
  flushPara("pEnd");
  return <>{out}</>;
}
