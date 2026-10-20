# Full-body actor and guide follow-up

The owner corrected the earlier compact circular mobile dock: the full figure must remain at the bottom right. All widths now use a fixed, safe-area-aware full-body contain image. Phone sizes scale to76–96px wide and102–128px high; desktop112×145. No circular crop or question-mark badge remains. Extra bottom scroll room lets the final gift controls move clear of the actor; portrait and landscape tests check bounds, full image height and centered action access.

The companion performs a finite six-second silent sprite dance after the introduction settles and when a greeting arrives. The animation measures visible time, pauses when hidden, and stops on reduced motion, opening the guide, dismissing its hint, or explicit dance control. Existing optional music/player controls remain separate; no audio starts automatically. This uses four rendered poses, not a skeletal3D rig.

A localized, dismissible stage hint is visible beside the closed actor after the introduction. It explains the gift, name/flower choice, reveal and greeting/share steps. Hints are local authored guidance, do not steal focus and do not send a Groq or analytics request. The original actor button remains keyboard accessible with its existing label.

Coverage:320,375,491,755,897 portrait widths and667×375 landscape, Chromium/WebKit, natural intro-to-dance handoff, no autoplay, finite cleanup, hidden pause/resume, hint dismissal and language/reduced-motion behavior. Physical-device testing remains unavailable.
