# Mobile actor correction

The closed guide previously remained a large fixed figure on tablet-sized phones (including 491px), overlapping content while scrolling. At widths up to 800px it is now a 56px circular trigger, with a 44px minimum interactive target and safe-area offsets. It belongs to the flower region and scrolls away instead of covering the letter or action buttons. Opening the guide preserves its dialog and Escape/focus-return behavior. Short landscape screens use a compact side-by-side dialog/trigger arrangement.

Regression coverage: 320×568, 375×667, 491×604 and 667×375. Assertions check trigger bounds, content intersection, dialog bounds and keyboard return. This is browser emulation, not a physical-device or software-keyboard claim.
