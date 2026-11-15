export type EmailFlag = "pending" | "sent";

export type PublicParticipant = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  preference: string;
  /** Null before the shuffle. */
  mail: EmailFlag | null;
};

/** Host payload. The page blurs gift wishes and the draw until the host asks. */
export type PublicState = {
  closed: boolean;
  mapped: boolean;
  participants: PublicParticipant[];
  exclusions: { a: string; b: string }[];
  /** santaId -> childId. Null before the shuffle. */
  mapping: Record<string, string> | null;
  emailSubject: string;
  emailHtml: string;
};
