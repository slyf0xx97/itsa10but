/** A gate a loop awaits between steps: open, it passes straight through; paused, it holds until resume(). */
export function createPauseGate() {
  let paused = false;
  let waiting: Array<() => void> = [];
  return {
    get paused() { return paused; },
    pause() { paused = true; },
    resume() {
      paused = false;
      const release = waiting;
      waiting = [];
      for (const go of release) go();
    },
    wait(): Promise<void> { return paused ? new Promise<void>((go) => { waiting.push(go); }) : Promise.resolve(); },
  };
}

/** Which side a popover opens on: below unless it does not fit there and there is more room above. */
export function menuSide(spaceBelow: number, spaceAbove: number, menuHeight: number): "below" | "above" {
  return spaceBelow >= menuHeight || spaceBelow >= spaceAbove ? "below" : "above";
}
