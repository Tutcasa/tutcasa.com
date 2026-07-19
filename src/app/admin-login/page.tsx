import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Team login",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-sm px-4 py-20">
      <div className="rounded-card bg-paper p-7 shadow-soft">
        <h1 className="text-2xl font-extrabold">Team login</h1>
        <p className="mt-1 text-sm text-grey">TutCasa admin dashboard.</p>
        <LoginForm next={next ?? "/admin"} />
      </div>
    </div>
  );
}
