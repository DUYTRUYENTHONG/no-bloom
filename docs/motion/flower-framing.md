# Flower viewport correction

The reported 665×604 viewport had a 596.5×298 fallback container but a 596.5×894.75 image box. Grid intrinsic minimum sizing let the portrait image overflow even with object-fit:contain. This was a layout defect, not a cropped source asset.

Changes:
- Remove grid intrinsic sizing from the fallback.
- Position image/SVG inside an explicit bounded box with 12px safe padding and zero minimum dimensions.
- Preserve the complete source with contain; remove the fading mask from tips/attachments.
- Tablet stage is centered, capped at 480px wide, height clamp(360px,66svh,480px).
- Mobile stage height is 380px, or 320px at widths up to350px.
- Caption has a positive8px gap below the artwork (the final shared caption rule overrides the earlier responsive value).

The same reserved frame is used for bud, WebGL, static/open and loading states. No image asset was replaced or enlarged beyond its available resolution. The native gift action and name/greeting flow are preserved.

Read-only senior product designer review supplied framing recommendations. Fourteen Chromium/WebKit checks capture both invitation buds and completed static flowers at1440×900,1024×768,768×1024,665×604,390×844,320×568 and844×390. Assertions check the image box against frame bounds, contain/no-mask behavior and horizontal overflow. Evidence: artifacts/quality/flower-framing/. These automated bounds checks supplement visual review; they do not alone establish visual quality or real-device behavior.

The purple gift-box attachment is a reference, not a licensed production asset. No watermarked stock image is copied into the site. A requested interaction choice is pending before changing the primary action.
