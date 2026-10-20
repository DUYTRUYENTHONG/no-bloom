import assert from "node:assert/strict";
import test from "node:test";
import { BloomTimeline } from "../lib/BloomTimeline";
import { petalPose, petalProgress } from "../lib/bloom-pose";

test("petal poses are deterministic and reach both exact boundaries", () => {
  for (const layer of [0, 1, 2, 3]) for (const index of [0, 2, 7]) {
    assert.deepEqual(petalPose(0.5, layer, index, 2010), petalPose(0.5, layer, index, 2010));
    assert.equal(petalProgress(0, layer, index, 2010), 0);
    assert.equal(petalProgress(1, layer, index, 2010, true), 1);
    assert.equal(petalPose(1, layer, index, 2010).openWeight, 1);
  }
  assert.ok(petalProgress(0.5, 0, 0, 2010) > petalProgress(0.5, 0, 0, 2010, true));
});

test("one timeline supports pause, repeated play, replay, and one completion callback", () => {
  let completed = 0;
  const timeline = new BloomTimeline(() => completed++, 7000);
  timeline.play(); timeline.play();
  timeline.tick(3500);
  assert.equal(timeline.progress, 0.5);
  timeline.pause(); timeline.tick(3500);
  assert.equal(timeline.progress, 0.5);
  timeline.play(); timeline.tick(3500); timeline.tick(1000);
  assert.equal(timeline.progress, 1);
  assert.equal(completed, 1);
  timeline.replay();
  assert.equal(timeline.progress, 0);
  timeline.tick(7000);
  assert.equal(completed, 2);
});

test("skip during loading remains complete and reduced-motion can bypass playback", () => {
  let completed = 0;
  const timeline = new BloomTimeline(() => completed++);
  timeline.skip();
  timeline.play(); timeline.tick(7000);
  assert.equal(timeline.progress, 1);
  assert.equal(timeline.playing, false);
  assert.equal(completed, 1);
  const reduced = new BloomTimeline(() => completed++);
  reduced.seek(1);
  assert.equal(reduced.progress, 1);
  assert.equal(completed, 2);
});
