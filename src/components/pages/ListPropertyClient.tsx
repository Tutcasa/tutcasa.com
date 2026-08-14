"use client";

/** List-my-property page body ported 1:1 from the demo. */

import { useRef, useState } from "react";
import { T, useLang } from "@/lib/i18n";
import { BackBar } from "@/components/site/BackBar";

export function ListPropertyClient() {
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
          <T as="h1" k="list_h1" />
          <T as="p" k="list_sub" />
          <div className="lp-stats">
            <div className="s"><b>85%</b><T k="list_stat1" /></div>
            <div className="s"><b>40+</b><T k="list_stat2" /></div>
            <div className="s"><b>24/7</b><T k="list_stat3" /></div>
          </div>
        </div>
      </section>

      <section className="lp-main wrap">
        <div className="form-card">
          <div style={{ display: sent ? "none" : undefined }}>
            <T as="h2" k="list_form_h" />
            <T as="p" className="lead" k="list_form_p" />
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
