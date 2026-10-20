import type { GenerativeUiResponse } from "./botanical-schema";
export type { GenerativeUiResponse } from "./botanical-schema";
import { copy, type Locale } from "./content";
import { compliments, type ComplimentId } from "./compliments";
import { flowerCatalog, type FlowerKind } from "./flower-catalog";

export const botanicalStates = ["BUD", "SPROUT", "BLOOMING", "FULL_BLOOM", "WITHER_RELOAD"] as const;
export const componentCatalog = ["FloralGreeting"] as const;

export type BotanicalState = GenerativeUiResponse["botanicalState"];

const timing: Record<BotanicalState, { growthRate: number; transitionDurationMs: number }> = {
  BUD: { growthRate: 0, transitionDurationMs: 0 },
  SPROUT: { growthRate: 0.2, transitionDurationMs: 400 },
  BLOOMING: { growthRate: 0.85, transitionDurationMs: 7000 },
  FULL_BLOOM: { growthRate: 1, transitionDurationMs: 0 },
  WITHER_RELOAD: { growthRate: 0, transitionDurationMs: 450 },
};

export function createBotanicalResponse(state: BotanicalState, locale: Locale, recipient: string | null, flower: FlowerKind = "rose", complimentId: ComplimentId = "joy"): GenerativeUiResponse {
  const message = recipient ? copy[locale].namedHeading(recipient) : copy[locale].genericHeading;
  return {
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
        data: { locale, recipient, message, flower, compliment: { id: complimentId, ...compliments[complimentId][locale] } },
        interactive: state === "FULL_BLOOM",
      },
    },
  };
}
