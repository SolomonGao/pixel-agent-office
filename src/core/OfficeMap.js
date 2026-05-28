export class OfficeMap {
  constructor(width = 40, height = 30) {
    this.width = width;
    this.height = height;
    this.cellSize = 20;
    this.grid = Array(height).fill(null).map(() => Array(width).fill(0));
    this.areas = {
      claudeDesk: { x: 20, y: 5, name: '主控台' },
      subagentZone: [
        { x: 5, y: 10 }, { x: 10, y: 10 }, { x: 15, y: 10 },
        { x: 5, y: 15 }, { x: 10, y: 15 }
      ],
      toolServer: { x: 35, y: 8, name: '工具服务器' },
      meetingRoom: { x: 25, y: 20, name: '会议室' },
      entrance: { x: 1, y: 15, name: '入口' }
    };
    this.initGrid();
  }

  initGrid() {
    // Mark desk areas as obstacles
    this.markObstacle(18, 4, 6, 3); // Claude desk area
    this.markObstacle(33, 6, 4, 4); // Tool server area
    this.markObstacle(23, 18, 6, 5); // Meeting room table

    // Mark subagent desks
    this.areas.subagentZone.forEach(pos => {
      this.markObstacle(pos.x - 1, pos.y - 1, 3, 2);
    });

    // Walls around meeting room
    for (let x = 22; x <= 30; x++) {
      this.grid[17][x] = 1;
      this.grid[24][x] = 1;
    }
    for (let y = 17; y <= 24; y++) {
      this.grid[y][22] = 1;
      this.grid[y][30] = 1;
    }
    this.grid[17][26] = 0; // Door
  }

  markObstacle(x, y, w, h) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const py = y + dy;
        const px = x + dx;
        if (py >= 0 && py < this.height && px >= 0 && px < this.width) {
          this.grid[py][px] = 1;
        }
      }
    }
  }

  isWalkable(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    return this.grid[y][x] === 0;
  }

  findPath(start, end) {
    const openSet = [];
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const startKey = `${start.x},${start.y}`;
    const endKey = `${end.x},${end.y}`;

    openSet.push(start);
    gScore.set(startKey, 0);
    fScore.set(startKey, this.heuristic(start, end));

    while (openSet.length > 0) {
      // Find node with lowest fScore
      let current = openSet[0];
      let currentIdx = 0;
      for (let i = 1; i < openSet.length; i++) {
        const key = `${openSet[i].x},${openSet[i].y}`;
        const currentKey = `${current.x},${current.y}`;
        if ((fScore.get(key) || Infinity) < (fScore.get(currentKey) || Infinity)) {
          current = openSet[i];
          currentIdx = i;
        }
      }

      const currentKey = `${current.x},${current.y}`;

      if (current.x === end.x && current.y === end.y) {
        return this.reconstructPath(cameFrom, current);
      }

      openSet.splice(currentIdx, 1);
      closedSet.add(currentKey);

      for (const neighbor of this.getNeighbors(current)) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        if (closedSet.has(neighborKey)) continue;

        const tentativeG = (gScore.get(currentKey) || 0) + 1;

        if (!openSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) {
          openSet.push(neighbor);
        } else if (tentativeG >= (gScore.get(neighborKey) || Infinity)) {
          continue;
        }

        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentativeG);
        fScore.set(neighborKey, tentativeG + this.heuristic(neighbor, end));
      }
    }

    return []; // No path found
  }

  heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  getNeighbors(node) {
    const dirs = [
      { x: 0, y: -1 }, { x: 0, y: 1 },
      { x: -1, y: 0 }, { x: 1, y: 0 }
    ];
    const neighbors = [];
    for (const dir of dirs) {
      const nx = node.x + dir.x;
      const ny = node.y + dir.y;
      if (this.isWalkable(nx, ny)) {
        neighbors.push({ x: nx, y: ny });
      }
    }
    return neighbors;
  }

  reconstructPath(cameFrom, current) {
    const path = [current];
    let key = `${current.x},${current.y}`;
    while (cameFrom.has(key)) {
      current = cameFrom.get(key);
      path.unshift(current);
      key = `${current.x},${current.y}`;
    }
    return path;
  }

  pixelToGrid(px, py) {
    return {
      x: Math.floor(px / this.cellSize),
      y: Math.floor(py / this.cellSize)
    };
  }

  gridToPixel(gx, gy) {
    return {
      x: gx * this.cellSize,
      y: gy * this.cellSize
    };
  }
}
