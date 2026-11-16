// Keyboard and mouse state, kept in one place so the world never reads the DOM.
// The game also exposes the same shape to the screenshot autopilot.
export function createInput(canvas) {
  const keys = new Set();
  const state = {
    keys,
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    clicked: false,
    clickX: 0,
    clickY: 0,
    pressed: new Set(),
  };

  function keyName(event) {
    // Lower-cased throughout, so 'Enter', 'ArrowUp' and 'a' all match the
    // names the game checks ('enter', 'arrowup', 'a', ' ').
    return event.key.toLowerCase();
  }

  window.addEventListener('keydown', (event) => {
    const name = keyName(event);
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(name)) event.preventDefault();
    if (!event.repeat) state.pressed.add(name);
    keys.add(name);
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(keyName(event));
  });
  window.addEventListener('blur', () => {
    keys.clear();
    state.mouseDown = false;
  });

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    state.mouseX = event.clientX - rect.left;
    state.mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    state.mouseX = event.clientX - rect.left;
    state.mouseY = event.clientY - rect.top;
    state.mouseDown = true;
    state.clicked = true;
    state.clickX = state.mouseX;
    state.clickY = state.mouseY;
  });
  window.addEventListener('mouseup', () => { state.mouseDown = false; });

  return {
    state,
    // True only on the frame the key went down; main clears it every frame.
    wasPressed(name) { return state.pressed.has(name); },
    endFrame() { state.pressed.clear(); state.clicked = false; },
    moveX() {
      let x = 0;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      return x;
    },
    moveY() {
      let y = 0;
      if (keys.has('w') || keys.has('arrowup')) y -= 1;
      if (keys.has('s') || keys.has('arrowdown')) y += 1;
      return y;
    },
  };
}
