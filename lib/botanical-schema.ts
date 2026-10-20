import { z } from "zod";
import { botanicalStates, componentCatalog } from "./botanical-ui";

// Validation for external A2UI consumers and contract tests. Internal rendering
// builds a typed payload without shipping this validator in the initial bundle.
export const generativeUiResponseSchema = z.strictObject({
  type: z.literal("GENERATIVE_UI_RESPONSE"), botanicalState: z.enum(botanicalStates),
  animationConfig: z.strictObject({
    growthRate: z.number().min(0).max(1), petalCount: z.number().int().positive(),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/), secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    transitionDurationMs: z.number().int().nonnegative(),
  }),
  componentSpec: z.strictObject({
    name: z.enum(componentCatalog),
    props: z.strictObject({
      title: z.string().min(1),
      data: z.strictObject({ locale: z.enum(["vi", "en"]), recipient: z.string().nullable(), message: z.string().min(1), flower: z.enum(["rose", "peach-rose", "peony", "cherry", "lily", "alstroemeria", "orchid"]) }),
      interactive: z.boolean(),
    }),
  }),
});
export type GenerativeUiResponse = z.infer<typeof generativeUiResponseSchema>;
