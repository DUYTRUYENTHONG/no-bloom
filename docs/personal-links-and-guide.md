# Personal links and the NỞ guide

## Personal links

After entering a name, the greeting offers **Sao chép liên kết riêng**. It creates a URL such as `https://duytruyenthong.github.io/no-bloom/?for=L%C3%AA+Th%E1%BB%8B+Mai&flower=peony`. GitHub Pages serves the same static page for every link; the browser validates the name and flower before opening the gift. Invalid names return to the normal invitation. The gift does not need a database or AI service. Treat the URL as shareable personal information: anyone with the link can read the name. Analytics and the visitor counter never receive the name, full URL, or query string.

## Guide

The guide uses three original likeness-based rendered poses (calm, welcoming, thoughtful) generated from the owner's supplied portrait. The browser changes pose for actions and AI wait state, with restrained perspective tilt on scrolling. This is image-based 2.5D motion, **not a rigged or photorealistic 3D likeness**. A true rotatable facially rigged avatar needs a separately authored model and approval of its visual likeness.

Without a configured endpoint, the guide offers local answers about the gift. With an endpoint, sending a question calls the `flower-guide` Supabase Edge Function. Only the question (at most 400 characters), locale, and current stage are sent. The browser does not send the recipient name or greeting. The function sends the question to Groq. The UI tells visitors not to enter private information; questions are not stored in this application's database. Groq and the hosting provider process requests according to their own policies. The guide never impersonates the portrait subject in its prompt.

The public endpoint has strict origins, a 2 KB body cap, a narrow request schema, an eight-second Groq timeout, and an atomic site-wide daily request cap in Postgres. CORS is a browser restriction, not authentication; a non-browser caller could spoof Origin and consume the cap. The cap bounds calls but does not prevent denial of service. The gift continues when the function or Groq is unavailable.

## Setup, when deployment is approved

1. Apply reviewed migration `202610200003_flower_guide_quota.sql` after the analytics schema.
2. Set Supabase function secrets: `ANALYTICS_DATABASE_URL`, `ANALYTICS_ALLOWED_ORIGINS`, `GROQ_API_KEY`, optional `GROQ_MODEL` and `GUIDE_DAILY_CAP`.
3. Deploy only `flower-guide` with public JWT verification disabled as specified in `supabase/config.toml`.
4. Set GitHub Pages variable `NEXT_PUBLIC_GUIDE_ENDPOINT` to `https://PROJECT.supabase.co/functions/v1/flower-guide`, then build and publish the static site.
5. Use a staging Groq key first and confirm a test question, 429 behavior, and that browser source contains no key. Keep `GROQ_API_KEY` exclusively in Supabase secrets; never use a `NEXT_PUBLIC_` prefix for it.

No cloud function, database migration, or Pages deployment has been applied by this implementation.

## Optional dance and music

The guide offers a seven-second silent dance and a separate opt-in official YouTube player for Cyndi Lauper’s Girls Just Want to Have Fun. Native player play/pause controls the dance; closing the guide stops playback. No audio is bundled or autoplayed. A prepared Vietnamese/English compliment works without Groq. Four original rendered dance poses are sprite animation, not a skeletal 3D rig. Reduced motion keeps the actor still while preserving the compliment and controls.
