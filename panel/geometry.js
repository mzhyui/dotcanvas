(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CanvasGeometry = api;
}(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const SIDES = ['top', 'right', 'bottom', 'left'];
  const normals = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] };
  function anchor(node, side) {
    const x = node.x, y = node.y, w = node.width, h = node.height;
    switch (side) {
      case 'top': return { x: x + w / 2, y };
      case 'bottom': return { x: x + w / 2, y: y + h };
      case 'left': return { x, y: y + h / 2 };
      default: return { x: x + w, y: y + h / 2 };
    }
  }
  function curve(a, aSide, b, bSide) {
    const distance = Math.max(40, Math.min(180, Math.hypot(b.x - a.x, b.y - a.y) / 2));
    const u = normals[aSide] || normals.right, v = normals[bSide] || normals.left;
    return `M ${a.x} ${a.y} C ${a.x + u[0] * distance} ${a.y + u[1] * distance}, ${b.x + v[0] * distance} ${b.y + v[1] * distance}, ${b.x} ${b.y}`;
  }
  function screenToWorld(point, rect, pan, scale) {
    return { x: (point.x - rect.left - pan.x) / scale, y: (point.y - rect.top - pan.y) / scale };
  }
  function zoomPan(point, pan, previousScale, nextScale) {
    return { x: point.x - (point.x - pan.x) * nextScale / previousScale,
      y: point.y - (point.y - pan.y) * nextScale / previousScale };
  }
  function bounds(a, b) {
    return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) };
  }
  function enclosed(nodes, box) {
    return nodes.filter(n => n.width > 0 && n.height > 0 && n.x >= box.x && n.y >= box.y &&
      n.x + n.width <= box.x + box.width && n.y + n.height <= box.y + box.height).map(n => n.id);
  }
  function combineSelection(current, inside, visible, additive) {
    const allowed = new Set(visible);
    return new Set([...(additive ? current : []), ...inside].filter(id => allowed.has(id)));
  }
  function canConnect(edges, fromNode, fromSide, toNode, toSide) {
    return fromNode !== toNode && SIDES.includes(fromSide) && SIDES.includes(toSide) &&
      !edges.some(e => e.fromNode === fromNode && e.fromSide === fromSide && e.toNode === toNode && e.toSide === toSide);
  }
  return { SIDES, anchor, curve, screenToWorld, zoomPan, bounds, enclosed, combineSelection, canConnect };
}));
