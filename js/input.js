export function attachInput(canvas, game) {
  let pointer = null;
  const point = event => { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX-rect.left)*game.width/rect.width, y: (event.clientY-rect.top)*game.height/rect.height }; };
  canvas.addEventListener('pointerdown', event => {
    if (pointer !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if (game.pick(point(event), event.pointerType)) { pointer = event.pointerId; canvas.setPointerCapture(pointer); event.preventDefault(); }
  });
  canvas.addEventListener('pointermove', event => { if (event.pointerId === pointer) { event.preventDefault(); game.move(point(event)); } });
  const release = (event, cancelled) => {
    if (event.pointerId !== pointer) return;
    if (!cancelled) game.move(point(event));
    game.drop(cancelled); const id = pointer; pointer = null;
    if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  };
  canvas.addEventListener('pointerup', event => release(event, false));
  canvas.addEventListener('pointercancel', event => release(event, true));
  canvas.addEventListener('lostpointercapture', event => release(event, true));
  canvas.addEventListener('keydown', event => {
    if (game.state !== 'PLAYING' || pointer !== null) return;
    if (event.code === 'Space' || event.key === 'Enter') {
      event.preventDefault();
      if (game.drag) game.drop(); else if (game.balls[0]) game.pick(game.balls[0]);
    } else if (event.key.startsWith('Arrow') && game.drag) {
      event.preventDefault(); const step = event.shiftKey ? 5 : 22;
      game.move({x:game.drag.x+({ArrowLeft:-step,ArrowRight:step}[event.key]||0),y:game.drag.y+({ArrowUp:-step,ArrowDown:step}[event.key]||0)});
    } else if (event.key === 'Escape') game.drop(true);
  });
  return { cancel() { game.drop(true); if (pointer !== null) { const id = pointer; pointer = null; if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id); } } };
}
