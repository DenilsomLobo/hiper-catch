export const CONFIG = {
  duration: 30,
  pointsPerBall: 10,
  maxBalls: 12,
  ballRadius: 24,
  returnDuration: 260,
  fall: { minSpeed: 95, maxSpeed: 150, frameDuration: 130 },
  items: [
    { asset: 'paper', name: 'Papel amassado', points: 10, weight: 43 },
    { asset: 'cup', name: 'Copo descartável', points: 10, weight: 35 },
    { asset: 'banana', name: 'Casca de banana', points: 20, weight: 10, fall: { minSpeed: 170, maxSpeed: 210 } },
    { asset: 'apple', name: 'Maçã mordida', points: 20, weight: 10, fall: { minSpeed: 230, maxSpeed: 270 } },
    { asset: 'magic', name: 'Polietileno mágico', points: 50, weight: 2, fall: { minSpeed: 300, maxSpeed: 350 } },
  ],
  bob: {
    initialScale: 1, maxScale: 2.0,
    // A área de coleta segue o mesmo padrão de crescimento e ricochete do Bob.
    hitbox: { x: -.035, y: -.02, width: 1.07, height: .55 },
    levels: [[0, 1], [5, 1.1], [10, 1.2], [15, 1.3], [20, 1.45], [30, 1.6], [35, 1.8], [40, 2.0]],
  },
};
