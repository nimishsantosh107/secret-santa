import type { Metadata } from "next";
import { AdminPanel } from "./admin-panel";

export const metadata: Metadata = {
  title: "Host",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminPanel />;
}
