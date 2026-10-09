// A arte.
export const ASSET_PATHS = {
  paper: ['assets/paper.png'],
  cup: ['assets/cup.png'],
  banana: ['assets/banana.png'],
  apple: ['assets/apple.png'],
  magic: ['assets/magic.png'],
  bob: ['asset/bob_roll.png', 'assets/bob-roll.svg'],
  ball: ['asset/politileno.png', 'assets/polyethylene.svg'],
  background: ['asset/cenario.png', 'assets/background.svg'],
};
// Coordenadas de pixel na arte fornecida. A primeira linha corresponde à animação de repouso.
export const SPRITE_REGIONS = {
  bob: [0, 200, 1254, 1000],
  ball: [[52, 52, 168, 148], [265, 52, 170, 148], [469, 52, 168, 148],
    [681, 52, 172, 148], [904, 52, 162, 148], [1128, 52, 159, 148]],
};
function prepareSprite(image, [x, y, width, height], backgroundSeeds = []) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height), data = pixels.data;
  const visited = new Uint8Array(width * height), queue = new Int32Array(width * height);
  let head = 0, tail = 0;
  const enqueue = index => {
    if (visited[index]) return; visited[index] = 1;
    const i = index * 4, min = Math.min(data[i], data[i+1], data[i+2]), max = Math.max(data[i], data[i+1], data[i+2]);
    if (data[i+3] === 0 || (max-min <= 18 && min >= 75 && max <= 220)) queue[tail++] = index;
  };
  for (let px=0; px<width; px++) { enqueue(px); enqueue((height-1)*width+px); }
  for (let py=0; py<height; py++) { enqueue(py*width); enqueue(py*width+width-1); }
  for (const [px, py] of backgroundSeeds) enqueue(py*width+px);
  while (head < tail) {
    const index = queue[head++]; data[index*4+3] = 0;
    const px = index % width;
    if (px>0) enqueue(index-1); if(px<width-1) enqueue(index+1);
    if(index>=width) enqueue(index-width); if(index<width*(height-1)) enqueue(index+width);
  }
  ctx.putImageData(pixels, 0, 0); return canvas;
}
function loadImage(path) {
  return new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = new URL(`../${path}`, import.meta.url).href;
  });
}
export async function loadAssets() {
  return Object.fromEntries(await Promise.all(Object.entries(ASSET_PATHS).map(async ([key, paths]) => {
    for (const path of paths) { try {
      const image = await loadImage(path);
      if (['paper', 'cup', 'banana', 'apple', 'magic'].includes(key)) {
        return [key, prepareSprite(image, [0, 0, image.width, image.height])];
      }
      if (path === 'asset/bob_roll.png') return [key, prepareSprite(image, SPRITE_REGIONS.bob, [[260, 330]])];
      if (path === 'asset/politileno.png') {
        const frames = SPRITE_REGIONS.ball.map(region => prepareSprite(image, region));
        frames[0].frames = frames; return [key, frames[0]];
      }
      return [key, image];
    } catch {} }
    return [key, null];
  })));
}
