import { RawPosition } from "../interfaces/interfaces";
import { fillSectors } from "./fill-around";

export const generatePositions = () => {
  const fieldSize = 10;
  const ships = [
    [1, 4],
    [2, 3],
    [3, 2],
    [4, 1],
  ];
  let positions: (RawPosition[] | [])[][] = [];
  for (let [shipCount, len] of ships) {
    let currentShip = 0;
    while (currentShip < shipCount) {
      let shipPoints: RawPosition[] = [];
      const direction = Math.random() > 0.5 ? true : false;
      const pointBroadwise = Math.abs(
        Math.round(Math.random() * fieldSize - 0.5)
      );
      const pointLengthwise = Math.abs(
        Math.round(Math.random() * (fieldSize - len + 1) - 0.5)
      );
      let shipPoint = 0;
      while (shipPoint < len) {
        const newShipPoints = direction
          ? { x: pointBroadwise, y: pointLengthwise + shipPoint }
          : { x: pointLengthwise + shipPoint, y: pointBroadwise };
        shipPoints = [...shipPoints, newShipPoints];
        shipPoint++;
      }
      const restrictedPoints = positions
        .map((el) => [...el, ...fillSectors(el.flat())])
        .flat();
      let isWrongPositions = false;
      shipPoints.flat().forEach((pos) => {
        if (
          restrictedPoints.flat().filter((el) => el.x === pos.x && el.y === pos.y)
            .length > 0 &&
          !isWrongPositions
        ) {
          isWrongPositions = true;
        }
      });
      if (!isWrongPositions) {
        positions = [...positions, [shipPoints, []]];
        currentShip++;
      }
    }
  }
  return positions;
};
