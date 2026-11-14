import type { Metadata } from "next";
import { Landing } from "./landing";

export const metadata: Metadata = {
  title: "Secret Santa",
  description: "Sign the list. Draw one person. Keep it to yourself.",
};

export default function Page() {
  return <Landing />;
}
