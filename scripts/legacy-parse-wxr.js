// Minimal WXR reader: returns items of the requested post types with meta.
const fs = require("fs");
const cdata = (s) => (s ?? "").replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
const tag = (xml, t) => { const m = xml.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`)); return m ? cdata(m[1].trim()) : null; };
module.exports = function read(file, types) {
  const xml = fs.readFileSync(file, "utf8");
  const out = [];
  for (const chunk of xml.split("<item>").slice(1)) {
    const item = chunk.split("</item>")[0];
    const type = tag(item, "wp:post_type");
    if (!types.includes(type)) continue;
    const meta = {};
    for (const m of item.matchAll(/<wp:postmeta>([\s\S]*?)<\/wp:postmeta>/g)) {
      const k = tag(m[1], "wp:meta_key"), v = tag(m[1], "wp:meta_value");
      if (k) meta[k] = v;
    }
    out.push({ type, id: tag(item, "wp:post_id"), title: tag(item, "title"),
      date: tag(item, "wp:post_date"), status: tag(item, "wp:status"),
      author: tag(item, "dc:creator"), meta });
  }
  return out;
};
