import { z } from "zod";
import { copy, type Locale } from "./content";
import { flowerCatalog, type FlowerKind } from "./flower-catalog";

export const botanicalStates = ["BUD", "SPROUT", "BLOOMING", "FULL_BLOOM", "WITHER_RELOAD"] as const;
export const componentCatalog = ["FloralGreeting"] as const;

export const generativeUiResponseSchema = z.strictObject({
  type: z.literal("GENERATIVE_UI_RESPONSE"),
  botanicalState: z.enum(botanicalStates),
  animationConfig: z.strictObject({
    growthRate: z.number().min(0).max(1),
    petalCount: z.number().int().positive(),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    transitionDurationMs: z.number().int().nonnegative(),
  }),
  componentSpec: z.strictObject({
    name: z.enum(componentCatalog),
    props: z.strictObject({
      title: z.string().min(1),
      data: z.strictObject({
        locale: z.enum(["vi", "en"]),
        recipient: z.string().nullable(),
        message: z.string().min(1),
        flower: z.enum(["rose", "peach-rose", "peony", "cherry", "lily", "alstroemeria", "orchid"]),
      }),
      interactive: z.boolean(),
    }),
  }),
});

export type GenerativeUiResponse = z.infer<typeof generativeUiResponseSchema>;
export type BotanicalState = GenerativeUiResponse["botanicalState"];

const timing: Record<BotanicalState, { growthRate: number; transitionDurationMs: number }> = {
  BUD: { growthRate: 0, transitionDurationMs: 0 },
  SPROUT: { growthRate: 0.2, transitionDurationMs: 400 },
  BLOOMING: { growthRate: 0.85, transitionDurationMs: 7000 },
  FULL_BLOOM: { growthRate: 1, transitionDurationMs: 0 },
  WITHER_RELOAD: { growthRate: 0, transitionDurationMs: 450 },
};

export function createBotanicalResponse(state: BotanicalState, locale: Locale, recipient: string | null, flower: FlowerKind = "rose"): GenerativeUiResponse {
  const message = recipient ? copy[locale].namedHeading(recipient) : copy[locale].genericHeading;
  return generativeUiResponseSchema.parse({
    type: "GENERATIVE_UI_RESPONSE",
    botanicalState: state,
    animationConfig: {
      ...timing[state],
      petalCount: flower === "peony" ? 78 : flower === "rose" || flower === "peach-rose" ? 64 : flower === "orchid" ? 14 : 12,
      primaryColor: state === "WITHER_RELOAD" ? "#A68F79" : flowerCatalog[flower].petal,
      secondaryColor: state === "WITHER_RELOAD" ? "#D9CCB8" : "#D2E87B",
    },
    componentSpec: {
      name: "FloralGreeting",
      props: {
        title: message,
        data: { locale, recipient, message, flower },
        interactive: state === "FULL_BLOOM",
      },
    },
  });
}
