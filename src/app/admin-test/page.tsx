import type { Metadata } from "next";
import { AdminPanel } from "../admin/admin-panel";

export const metadata: Metadata = {
  title: "Host test",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminPanel api="/api/admin?test=1" testing />;
}
