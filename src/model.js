'use strict';

const SECTION_SEED = [
  ['Introduction', 'Frame the problem, motivation, and contribution.'],
  ['Related Work', 'Position the paper against the closest prior work.'],
  ['Method', 'Describe the proposed approach and its assumptions.'],
  ['Evaluation', 'Define datasets, baselines, metrics, and research questions.'],
  ['Conclusion', 'Summarize findings, limitations, and future work.']
];

function id(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function seedCanvas() {
  return {
    nodes: SECTION_SEED.map(([title, body], i) => ({
      id: `node-${i + 1}`,
      type: 'text',
      x: 80 + (i % 3) * 330,
      y: 80 + Math.floor(i / 3) * 260,
      width: 280,
      height: 190,
      color: String((i % 6) + 1),
      text: `# ${title}\n\n${body}`,
      section: title,
      status: 'draft',
      path: '',
      anchor: ''
    })),
    edges: [],
    metadata: { dotcanvas: { version: 1 } }
  };
}

function validateCanvas(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    throw new Error('Canvas must contain nodes and edges arrays.');
  }
  const ids = new Set();
  for (const node of value.nodes) {
    if (!node || typeof node.id !== 'string' || !node.id || ids.has(node.id)) throw new Error('Canvas contains a duplicate or invalid node id.');
    if (node.type !== 'text' && node.type !== 'file' && node.type !== 'link') throw new Error(`Unsupported node type: ${node.type}`);
    for (const key of ['x', 'y', 'width', 'height']) if (typeof node[key] !== 'number' || !Number.isFinite(node[key])) throw new Error(`Node ${node.id} has an invalid ${key}.`);
    if (typeof node.text !== 'string') throw new Error(`Node ${node.id} must have text.`);
    ids.add(node.id);
  }
  const edgeIds = new Set();
  for (const edge of value.edges) {
    if (!edge || typeof edge.id !== 'string' || edgeIds.has(edge.id)) throw new Error('Canvas contains a duplicate or invalid edge id.');
    if (!ids.has(edge.fromNode) || !ids.has(edge.toNode)) throw new Error(`Edge ${edge.id} points to a missing node.`);
    edgeIds.add(edge.id);
  }
  return value;
}

function parseCanvas(text) {
  let value;
  try { value = JSON.parse(text); } catch (error) { throw new Error(`Canvas JSON is invalid: ${error.message}`); }
  return validateCanvas(value);
}

function serializeCanvas(value) {
  validateCanvas(value);
  return `${JSON.stringify(value, null, 2)}\n`;
}

module.exports = { SECTION_SEED, id, seedCanvas, validateCanvas, parseCanvas, serializeCanvas };
