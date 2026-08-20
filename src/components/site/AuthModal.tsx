"use client";

/**
 * Auth overlay ported from the demo (au-ov): login skips phone,
 * sign-up verifies by SMS. Front-end only, exactly like the demo —
 * real auth arrives at the backend phase.
 */

import { useRef, useState } from "react";

const SHOW_FACEBOOK_LOGIN = false;

export type AuthMode = "login" | "signup";

/**
 * Mount with a changing `key` per open (see SiteHeader) so mode/step
 * reset on every open, like the demo's auOpen().
 */
export function AuthModal({
  open,
  mode: initialMode,
  onClose,
}: {
  open: boolean;
  mode: AuthMode;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [step, setStep] = useState(1);
  const [okTitle, setOkTitle] = useState("You’re all set!");
  const [phoneEcho, setPhoneEcho] = useState("");
  const phoneRef = useRef<HTMLInputElement>(null);
  const ccRef = useRef<HTMLSelectElement>(null);
  const codeBoxRef = useRef<HTMLDivElement>(null);

  const signup = mode === "signup";

  function focusCode() {
    setTimeout(() => {
      const f = codeBoxRef.current?.querySelector("input");
      if (f) f.focus();
    }, 60);
  }

  function sendCode() {
    const ph = (phoneRef.current?.value || "").trim();
    const cc = ccRef.current?.value || "";
    if (!ph) {
      phoneRef.current?.focus();
      return;
    }
    setPhoneEcho(cc + " " + ph);
    setStep(2);
    focusCode();
  }

  function submit() {
    if (signup) {
      sendCode();
    } else {
      setOkTitle("You are logged in!");
      setStep(3);
    }
  }

  function social(p: string) {
    if (signup) {
      alert("Continue with " + p + " connects to " + p + " sign-in at the backend step. We will still verify your phone number by SMS.");
      setStep(2);
      focusCode();
    } else {
      alert("Continue with " + p + " connects to " + p + " sign-in at the backend step.");
      setOkTitle("You are logged in!");
      setStep(3);
    }
  }

  function verify() {
    setOkTitle(signup ? "Welcome to TutCasa!" : "You are logged in!");
    setStep(3);
  }

  function codeInput(e: React.FormEvent<HTMLInputElement>) {
    const el = e.currentTarget;
    if (el.value && el.nextElementSibling) (el.nextElementSibling as HTMLInputElement).focus();
  }
  function codeKey(e: React.KeyboardEvent<HTMLInputElement>) {
    const el = e.currentTarget;
    if (e.key === "Backspace" && !el.value && el.previousElementSibling)
      (el.previousElementSibling as HTMLInputElement).focus();
  }

  return (
    <div
      className={`au-ov${open ? " open" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="au-modal">
        <button className="au-x" onClick={onClose}>&times;</button>
        <div className="au-head">
          <h2>{signup ? "Create your account" : "Welcome back"}</h2>
          <p>{signup ? "Join the TutCasa family and book like a king." : "Log in to book faster and track your trips."}</p>
        </div>
        <div className="au-body">
          <div className={`au-step${step === 1 ? " on" : ""}`}>
            <div className="au-tabs">
              <button className={signup ? undefined : "on"} onClick={() => setMode("login")}>Log in</button>
              <button className={signup ? "on" : undefined} onClick={() => setMode("signup")}>Sign up</button>
            </div>
            <div className="au-social">
              <button className="au-sbtn" onClick={() => social("Google")}>
                <svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.4 1.1 7.3 2.9l5.7-5.7C33.6 6.1 29 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c2.8 0 5.4 1.1 7.3 2.9l5.7-5.7C33.6 6.1 29 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-2.6-11.3-6.7l-6.5 5C9.6 39.7 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C39.9 36.1 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg> Continue with Google
              </button>
              {/* Facebook login parked for now (Google is enough) — flip
                  SHOW_FACEBOOK_LOGIN to true to bring it back */}
              {SHOW_FACEBOOK_LOGIN && (
                <button className="au-sbtn" onClick={() => social("Facebook")}>
                  <svg viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12a12 12 0 10-13.9 11.9v-8.4H7v-3.5h3.1V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9v2.2h3.4l-.5 3.5h-2.9v8.4A12 12 0 0024 12z"/></svg> Continue with Facebook
                </button>
              )}
            </div>
            <div className="au-or">or with email</div>
            <div className="au-field" style={{ display: signup ? "block" : "none" }}>
              <label>Full name</label>
              <input placeholder="Your name" />
            </div>
            <div className="au-field">
              <label>Email</label>
              <input type="email" placeholder="you@email.com" />
            </div>
            <div className="au-field">
              <label>Password</label>
              <input type="password" placeholder="Your password" />
            </div>
            <div className="au-field" style={{ display: signup ? "block" : "none" }}>
              <label>Phone number</label>
              <div className="au-phone">
                <select ref={ccRef}>
                  <option>+52</option><option>+20</option><option>+1</option><option>+33</option><option>+44</option>
                </select>
                <input ref={phoneRef} type="tel" placeholder="55 1234 5678" />
              </div>
            </div>
            <button className="au-primary" onClick={submit}>
              <span>{signup ? "Create account" : "Log in"}</span>
            </button>
            <div className="au-note" style={{ display: signup ? "block" : "none" }}>
              We&rsquo;ll text you a 6-digit code to verify your number.
            </div>
          </div>
          <div className={`au-step${step === 2 ? " on" : ""}`}>
            <p style={{ textAlign: "center", color: "var(--grey)", fontSize: "13.5px", marginTop: 6 }}>
              Enter the 6-digit code we sent to <b>{phoneEcho}</b>
            </p>
            <div className="au-code" ref={codeBoxRef}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <input key={i} maxLength={1} inputMode="numeric" onInput={codeInput} onKeyDown={codeKey} />
              ))}
            </div>
            <button className="au-primary" onClick={verify}>Verify &amp; continue</button>
            <div className="au-note">
              Didn&rsquo;t get it?{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); sendCode(); }} style={{ color: "var(--rosa)", fontWeight: 700 }}>Resend code</a>{" "}
              &middot;{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); setStep(1); }} style={{ color: "var(--grey)" }}>Change details</a>
            </div>
          </div>
          <div className={`au-step${step === 3 ? " on" : ""}`}>
            <div className="au-ok">
              <div className="c">&#10003;</div>
              <h2 style={{ fontSize: 22, fontWeight: 800 }}>{okTitle}</h2>
              <p style={{ color: "var(--grey)", marginTop: 8 }}>Your account is verified. Welcome to the TutCasa family.</p>
            </div>
            <button className="au-primary" onClick={onClose}>Start exploring</button>
          </div>
        </div>
      </div>
    </div>
  );
}
