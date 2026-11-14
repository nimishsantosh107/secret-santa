import type { Metadata } from "next";
import { JoinForm } from "./join-form";

export const metadata: Metadata = {
  title: "Join the list",
  description: "Join the Secret Santa list.",
};

export default function Page() {
  return <JoinForm />;
}
