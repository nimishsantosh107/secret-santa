export type EmailFlag = "pending" | "sent";

export type PublicParticipant = {
  id: string;
  name: string;
  email: EmailFlag | null;
};

/** Admin payload. No gift prefs, no Santa-to-child map. */
export type PublicState = {
  closed: boolean;
  mapped: boolean;
  participants: PublicParticipant[];
  exclusions: { a: string; b: string }[];
  emailSubject: string;
  emailHtml: string;
};
