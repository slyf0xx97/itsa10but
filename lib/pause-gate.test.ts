import test from "node:test";
import assert from "node:assert/strict";
import { createPauseGate, menuSide } from "./pause-gate.ts";

test("an open gate passes straight through", async () => {
  const gate = createPauseGate();
  await gate.wait();
  assert.equal(gate.paused, false);
});

test("a paused gate holds every waiter until resume", async () => {
  const gate = createPauseGate();
  gate.pause();
  const order: string[] = [];
  const first = gate.wait().then(() => order.push("first"));
  const second = gate.wait().then(() => order.push("second"));
  await new Promise((done) => setTimeout(done, 10));
  assert.deepEqual(order, []);
  gate.resume();
  await Promise.all([first, second]);
  assert.deepEqual(order, ["first", "second"]);
  assert.equal(gate.paused, false);
});

test("resume with nobody waiting is harmless, and the gate can pause again", async () => {
  const gate = createPauseGate();
  gate.resume();
  gate.pause();
  let passed = false;
  const held = gate.wait().then(() => { passed = true; });
  await Promise.resolve();
  assert.equal(passed, false);
  gate.resume();
  await held;
  assert.equal(passed, true);
});

test("the menu opens below when it fits or when below has more room", () => {
  assert.equal(menuSide(500, 100, 300), "below");
  assert.equal(menuSide(200, 100, 300), "below");
});

test("the menu flips up only when below is too small and above is bigger", () => {
  assert.equal(menuSide(120, 400, 300), "above");
  assert.equal(menuSide(120, 100, 300), "below");
});
