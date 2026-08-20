"use client";

/** List-my-property page body ported 1:1 from the demo. */

import { useRef, useState } from "react";
import { T, useLang } from "@/lib/i18n";
import { BackBar } from "@/components/site/BackBar";
import { submitListPropertyLead } from "@/app/leads-actions";
import type { ListPropertyContent } from "@/modules/settings";

export function ListPropertyClient({ content }: { content: ListPropertyContent }) {
  const { t } = useLang();
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(false);
  const [bad, setBad] = useState<Record<string, boolean>>({});
  const [photos, setPhotos] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const errRef = useRef<HTMLDivElement>(null);
  const okRef = useRef<HTMLDivElement>(null);

  const [f, setF] = useState({
    name: "", email: "", phone: "", loc: "", type: "", beds: "1", baths: "1",
    guests: "4", rate: "", msg: "", listed: "no", consent: false,
  });
  const [amenities, setAmenities] = useState<string[]>([]);
  // answers to the admin-defined extra questions, keyed by label
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [extraChecks, setExtraChecks] = useState<Record<string, string[]>>({});

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  function addPhotos(files: FileList | null) {
    if (!files) return;
    setPhotos((p) => {
      const next = [...p];
      for (const file of Array.from(files)) {
        if (next.length >= 20) break;
        if (file.type?.startsWith("image/")) next.push(file);
      }
      return next;
    });
  }

  function submit() {
    const required = ["name", "email", "phone", "loc", "type"] as const;
    const b: Record<string, boolean> = {};
    let ok = true;
    for (const k of required) {
      b[k] = !f[k].trim();
      if (b[k]) ok = false;
    }
    if (!f.consent) ok = false;
    setBad(b);
    if (!ok) {
      setErr(true);
      setTimeout(() => errRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 30);
      return;
    }
    setErr(false);
    setSent(true);
    void submitListPropertyLead({
      name: f.name, email: f.email, phone: f.phone,
      city: f.loc, propertyType: f.type, bedrooms: f.beds,
      message: `baths ${f.baths} · sleeps ${f.guests} · target rate ${f.rate || "?"} · already listed: ${f.listed} · amenities: ${amenities.join(", ") || "—"}
${content.extraFields.map((x) => {
  const v = x.kind === "checkboxes" ? (extraChecks[x.label] ?? []).join(", ") : (extra[x.label] ?? "");
  return v ? `${x.label}: ${v}` : "";
}).filter(Boolean).join("\n")}
${f.msg}`,
    });
    setTimeout(() => okRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 30);
  }

  const amToggle = (v: string, on: boolean) =>
    setAmenities((s) => (on ? [...s, v] : s.filter((x) => x !== v)));

  return (
    <>
      <BackBar />

      <section className="lp-hero">
        <div className="sun"></div>
        <div className="wrap">
          {content.title ? <h1>{content.title}</h1> : <T as="h1" k="list_h1" />}
          {content.intro ? <p>{content.intro}</p> : <T as="p" k="list_sub" />}
          <div className="lp-stats">
            {[0, 1, 2].map((i) => (
              <div className="s" key={i}>
                <b>{content.stats[i]?.big ?? ""}</b>
                {content.stats[i]?.label
                  ? <span>{content.stats[i].label}</span>
                  : <T k={`list_stat${i + 1}`} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-main wrap">
        <div className="form-card">
          <div style={{ display: sent ? "none" : undefined }}>
            {content.formTitle ? <h2>{content.formTitle}</h2> : <T as="h2" k="list_form_h" />}
            {content.formIntro ? <p className="lead">{content.formIntro}</p> : <T as="p" className="lead" k="list_form_p" />}
            <div className={`form-err${err ? " show" : ""}`} ref={errRef}><T k="list_req" /></div>

            <div className="grid2">
              <div className={`field${bad.name ? " bad" : ""}`}><label><T k="list_f_name" /> <span className="req">*</span></label><input type="text" value={f.name} onChange={set("name")} /></div>
              <div className={`field${bad.email ? " bad" : ""}`}><label><T k="list_f_email" /> <span className="req">*</span></label><input type="email" value={f.email} onChange={set("email")} /></div>
            </div>
            <div className="grid2">
              <div className={`field${bad.phone ? " bad" : ""}`}><label><T k="list_f_phone" /> <span className="req">*</span></label><input type="tel" value={f.phone} onChange={set("phone")} /></div>
              <div className={`field${bad.loc ? " bad" : ""}`}><label><T k="list_f_loc" /> <span className="req">*</span></label><input type="text" placeholder="Playa del Carmen, MX" value={f.loc} onChange={set("loc")} /></div>
            </div>
            <div className={`field${bad.type ? " bad" : ""}`}>
              <label><T k="list_f_type" /> <span className="req">*</span></label>
              <select value={f.type} onChange={set("type")}>
                <option value="" dangerouslySetInnerHTML={{ __html: t("list_choose") }} />
                {(["list_type_condo", "list_type_villa", "list_type_pent", "list_type_house", "list_type_other"] as const).map((k) => (
                  <option key={k} value={k} dangerouslySetInnerHTML={{ __html: t(k) }} />
                ))}
              </select>
            </div>
            <div className="grid3">
              <div className="field"><T as="label" k="list_f_beds" /><input type="number" min={0} value={f.beds} onChange={set("beds")} /></div>
              <div className="field"><T as="label" k="list_f_baths" /><input type="number" min={0} value={f.baths} onChange={set("baths")} /></div>
              <div className="field"><T as="label" k="list_f_guests" /><input type="number" min={1} value={f.guests} onChange={set("guests")} /></div>
            </div>
            <div className="field"><T as="label" k="list_f_rate" /><input type="text" placeholder="$" value={f.rate} onChange={set("rate")} /></div>

            <div className="field">
              <T as="label" k="list_f_amen" />
              <div className="checks">
                {([["pool", "list_am_pool"], ["beachfront", "st_f_beach"], ["parking", "list_am_parking"], ["ac", "list_am_ac"], ["wifi", "list_am_wifi"], ["gym", "list_am_gym"], ["tennis", "list_am_tennis"], ["spa", "list_am_spa"], ["kids", "list_am_kids"]] as const).map(([v, k]) => (
                  <label key={v}><input type="checkbox" checked={amenities.includes(v)} onChange={(e) => amToggle(v, e.target.checked)} /> <T k={k} /></label>
                ))}
              </div>
            </div>

            <div className="field">
              <T as="label" k="list_f_listed" />
              <div className="radios">
                {([["airbnb", "list_listed_airbnb"], ["vrbo", "list_listed_vrbo"], ["both", "list_listed_both"], ["no", "list_listed_no"]] as const).map(([v, k]) => (
                  <label key={v}><input type="radio" name="listed" value={v} checked={f.listed === v} onChange={() => setF((s) => ({ ...s, listed: v }))} /> <T k={k} /></label>
                ))}
              </div>
            </div>

            {content.extraFields.map((x) => (
              <div className="field" key={x.label}>
                <label>{x.label}</label>
                {x.kind === "textarea" ? (
                  <textarea value={extra[x.label] ?? ""} onChange={(e) => setExtra((s) => ({ ...s, [x.label]: e.target.value }))}></textarea>
                ) : x.kind === "checkboxes" ? (
                  <div className="checks">
                    {x.options.map((o) => (
                      <label key={o}>
                        <input
                          type="checkbox"
                          checked={(extraChecks[x.label] ?? []).includes(o)}
                          onChange={(e) => setExtraChecks((s) => {
                            const cur = s[x.label] ?? [];
                            return { ...s, [x.label]: e.target.checked ? [...cur, o] : cur.filter((v) => v !== o) };
                          })}
                        /> {o}
                      </label>
                    ))}
                  </div>
                ) : (
                  <input type="text" value={extra[x.label] ?? ""} onChange={(e) => setExtra((s) => ({ ...s, [x.label]: e.target.value }))} />
                )}
              </div>
            ))}
            <div className="field"><T as="label" k="list_f_msg" /><textarea value={f.msg} onChange={set("msg")}></textarea></div>

            <div className="field">
              <T as="label" k="list_f_photos" />
              <div
                className={`dropzone${drag ? " drag" : ""}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); addPhotos(e.dataTransfer.files); }}
              >
                <div className="dz-ic">&#128247;</div>
                <T as="div" className="dz-hint" k="list_photos_hint" />
                <div className="dz-count">{photos.length ? `${photos.length} / 20` : ""}</div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
              <div className="thumbs">
                {photos.map((file, i) => (
                  <div className="thumb" key={i}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={URL.createObjectURL(file)} alt="" />
                    <button type="button" className="thumb-x" onClick={() => setPhotos((p) => p.filter((_, x) => x !== i))}>&times;</button>
                  </div>
                ))}
              </div>
            </div>

            <label className="consent">
              <input type="checkbox" checked={f.consent} onChange={(e) => setF((s) => ({ ...s, consent: e.target.checked }))} /> <T k="list_f_consent" />
            </label>

            <button className="submit-btn" onClick={submit}><T k="list_submit" /></button>
          </div>

          <div className={`success${sent ? " show" : ""}`} ref={okRef}>
            <div className="ok">&#10003;</div>
            <T as="h2" k="list_success_h" />
            <T as="p" k="list_success_p" />
          </div>
        </div>

        <aside className="why">
          <T as="h3" k="list_why_h" />
          <div className="w"><span className="ic">&#128200;</span><div><T as="b" k="list_w1_h" /><T as="p" k="list_w1_p" /></div></div>
          <div className="w"><span className="ic">&#129309;</span><div><T as="b" k="list_w2_h" /><T as="p" k="list_w2_p" /></div></div>
          <div className="w"><span className="ic">&#128202;</span><div><T as="b" k="list_w3_h" /><T as="p" k="list_w3_p" /></div></div>
          <div className="why-cta">&#9990; <T k="wa_title" /></div>
        </aside>
      </section>
    </>
  );
}
