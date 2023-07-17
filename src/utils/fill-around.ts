import { RawPosition } from "../interfaces/interfaces";

export const fillSectors = (cords: RawPosition[]): RawPosition[] => {
  const cordsStringified = cords.map(el => JSON.stringify(el));
  const aroundCSectors = new Set(
    cords
      .map((el) => [
        { x: el.x + 1, y: el.y + 1 },
        { x: el.x + 1, y: el.y - 1 },
        { x: el.x - 1, y: el.y - 1 },
        { x: el.x - 1, y: el.y + 1 },
        { x: el.x, y: el.y + 1 },
        { x: el.x + 1, y: el.y },
        { x: el.x, y: el.y - 1 },
        { x: el.x - 1, y: el.y },
      ])
      .map((el) =>
        el.reduce(
          (acc: string[], pos) =>
            pos.x >= 0 && pos.y >= 0 && pos.x < 10 && pos.y < 10
              ? (acc = [...acc, JSON.stringify({ x: pos.x, y: pos.y })])
              : acc,
          []
        )
      )
      .flat()
  );
  aroundCSectors.forEach(el => {
    if (cordsStringified.includes(el)) aroundCSectors.delete(el);
  })
  return Array.from(aroundCSectors).map(el => JSON.parse(el));
};
