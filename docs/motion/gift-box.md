# Clickable purple gift

The owner selected a clickable gift box with an opening animation. `GiftBoxButton.tsx` replaces only the invitation action. It is still a native labeled button in Vietnamese/English; the name-entry flow and direct personalized links are preserved.

The violet box, ribbon and bow are original layered CSS artwork inspired by the supplied color/form reference. The watermarked stock image is not shipped. A small original inline floral card appears as the lid lifts. No image, animation dependency, audio or API request is added.

One activation runs an820ms finite lid/card sequence. The button becomes disabled/busy during opening, then invokes the existing personalization transition once. A guarded1-second fallback handles absent animation-end events. Reduced motion enters personalization immediately; changing that preference during opening also completes the action. Unmount clears the timer. The name input retains its existing autofocus.

Verification: `tests/browser/gift-box.spec.ts` checks keyboard/single transition, reduced motion and320px opening capture in Chromium/WebKit. Existing invitation/name/anonymous/direct-link journeys are also rerun. Build and axe checks remain the existing commands. Whole-site performance is measured separately; this CSS feature alone is not evidence of achieving a loading target.
