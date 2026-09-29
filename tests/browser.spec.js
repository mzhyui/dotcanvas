'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../scripts/serve');
const { chromium } = require(process.env.DOTCANVAS_PLAYWRIGHT_MODULE || 'playwright');

function fixture() {
  const canvas = { nodes: ['a', 'b', 'c', 'd'].map((id, i) => ({
    id, type: 'text', x: 60 + i % 2 * 420, y: 60 + Math.floor(i / 2) * 430,
    width: 300, height: 240, color: String(i + 1), text: `# Card ${id.toUpperCase()}\n\n` + 'Detailed manuscript core text with pending evidence.\n'.repeat(24),
    section: 'Custom', status: 'draft', path: 'main_conference_paper/sections/a-very-long-repository-filename.tex', anchor: 'sec:long-source-anchor',
    extra: { preserve: id }
  })), edges: [], metadata: { custom: { unchanged: true } } };
  for (const fromSide of ['top', 'right', 'bottom', 'left']) {
    canvas.edges.push({ id: `e-${fromSide}`, fromNode: 'a', fromSide, toNode: 'b', toSide: fromSide, label: 'existing label', extra: 42 });
  }
  return canvas;
}

test('DotCanvas browser interactions', { timeout: 120000 }, async suite => {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.DOTCANVAS_BROWSER ? { executablePath: process.env.DOTCANVAS_BROWSER } : {}),
    args: ['--no-sandbox', '--no-proxy-server', '--disable-dev-shm-usage'] });
  suite.after(() => browser.close());

  async function setup(t, initial = fixture()) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dotcanvas-browser-'));
    const file = path.join(root, '.canvas');
    const bytes = JSON.stringify(initial, null, 2) + '\n';
    await fs.writeFile(file, bytes);
    const server = createServer(root);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const page = await browser.newPage({ viewport: { width: 1500, height: 1050 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let saves = 0;
    page.on('request', request => { if (request.method() === 'PUT') saves += 1; });
    t.after(async () => {
      await page.close();
      await new Promise(resolve => server.close(resolve));
      await fs.rm(root, { recursive: true, force: true });
      assert.deepEqual(errors, [], 'No browser JavaScript errors');
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(() => document.querySelector('#save-state').textContent === 'Ready');
    return { page, file, bytes, saves: () => saves };
  }
  async function read(page) { return page.evaluate(() => window.researchCanvas.getCanvas()); }
  async function header(page, id) { const b = await page.locator(`.card[data-id="${id}"] .card-header`).boundingBox(); return { x: b.x + 30, y: b.y + 8 }; }
  async function drag(page, a, b, button = 'left') {
    await page.mouse.move(a.x, a.y); await page.mouse.down({ button });
    await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up({ button });
  }
  async function flush(page) { await page.evaluate(() => window.researchCanvas.flushSave()); }
  async function selected(page) { return page.locator('.card.selected').evaluateAll(cards => cards.map(c => c.dataset.id).sort()); }
  async function attached(page) {
    const errors = await page.evaluate(() => {
      const canvas = window.researchCanvas.getCanvas();
      return canvas.edges.flatMap(e => {
        const line = [...document.querySelectorAll('g[data-edge-id]')].find(g => g.dataset.edgeId === e.id).querySelector('.edge-line');
        if (line.closest('.hidden')) return [];
        return [[e.fromNode, e.fromSide, 0], [e.toNode, e.toSide, line.getTotalLength()]].map(([id, side, length]) => {
          const p = line.getPointAtLength(length).matrixTransform(line.getScreenCTM());
          const handle = document.querySelector(`.card[data-id="${id}"] .handle-${side}`).getBoundingClientRect();
          return Math.hypot(p.x - handle.x - handle.width / 2, p.y - handle.y - handle.height / 2);
        });
      });
    });
    assert.ok(errors.every(error => error <= 1), `Endpoint errors: ${errors}`);
  }

  await suite.test('load preserves bytes and metadata; core text fills card and inspector', async t => {
    const { page, file, bytes, saves } = await setup(t);
    await page.waitForTimeout(550);
    assert.equal(await fs.readFile(file, 'utf8'), bytes); assert.equal(saves(), 0);
    assert.equal(await page.locator('#connect').count(), 0);
    const dimensions = await page.locator('.card[data-id="a"]').evaluate(el => ({
      height: el.getBoundingClientRect().height, body: el.querySelector('.body').clientHeight,
      footer: el.querySelector('.tag').clientHeight, full: el.querySelector('.tag').title
    }));
    assert.equal(dimensions.height, 240); assert.ok(dimensions.body > 150); assert.equal(dimensions.footer, 19);
    assert.ok(dimensions.full.startsWith('main_conference_paper/sections/'));
    await page.mouse.click(...Object.values(await header(page, 'a')));
    assert.ok((await page.locator('#f-body').boundingBox()).height > 400);
    assert.equal(await page.locator('details').getAttribute('open'), null);
    await attached(page);
  });

  await suite.test('individual drag stays attached through zoom/pan; one undo and redo', async t => {
    const { page } = await setup(t);
    const initial = await read(page);
    const a = await header(page, 'a'); await drag(page, a, { x: a.x + 70, y: a.y + 35 });
    await attached(page);
    await page.locator('#undo').click(); assert.deepEqual(await read(page), initial);
    await page.locator('#redo').click(); assert.equal((await read(page)).nodes[0].x, initial.nodes[0].x + 70);
    const zoom = { x: 1350, y: 850 };
    const worldBefore = await page.evaluate(p => {
      const r = document.querySelector('#viewport').getBoundingClientRect();
      const m = new DOMMatrix(getComputedStyle(document.querySelector('#world')).transform);
      return new DOMPoint(p.x-r.left,p.y-r.top).matrixTransform(m.inverse()).toJSON();
    }, zoom);
    await page.mouse.move(zoom.x, zoom.y); await page.mouse.wheel(0, -400); await page.waitForTimeout(60);
    await attached(page);
    const worldAfter = await page.evaluate(p => {
      const r = document.querySelector('#viewport').getBoundingClientRect();
      const m = new DOMMatrix(getComputedStyle(document.querySelector('#world')).transform);
      return new DOMPoint(p.x-r.left,p.y-r.top).matrixTransform(m.inverse()).toJSON();
    }, zoom);
    assert.ok(Math.abs(worldBefore.x-worldAfter.x)<.001 && Math.abs(worldBefore.y-worldAfter.y)<.001);
    await drag(page, { x: 1320, y: 930 }, { x: 1370, y: 965 }); await attached(page);
    const h = await header(page, 'b'); await drag(page, h, { x: h.x + 50, y: h.y + 20 }); await attached(page);
  });

  await suite.test('middle marquee in four directions; additive selection and group dragging', async t => {
    const { page } = await setup(t);
    for (const [a,b] of [
      [{x:340,y:94},{x:1100,y:380}], [{x:1100,y:380},{x:340,y:94}],
      [{x:1100,y:94},{x:340,y:380}], [{x:340,y:380},{x:1100,y:94}]
    ]) { await drag(page,a,b,'middle'); assert.deepEqual(await selected(page),['a','b']); }
    await page.keyboard.down('Control');
    await drag(page,{x:340,y:525},{x:675,y:800},'middle');
    await page.keyboard.up('Control');
    assert.deepEqual(await selected(page),['a','b','c']);
    const before=await read(page), a=await header(page,'a');
    await drag(page,a,{x:a.x+35,y:a.y+25});
    const after=await read(page);
    for(let i=0;i<3;i++) { assert.equal(after.nodes[i].x,before.nodes[i].x+35); assert.equal(after.nodes[i].y,before.nodes[i].y+25); }
    assert.deepEqual(after.nodes[3],before.nodes[3]); await attached(page);
    await flush(page); assert.deepEqual(await selected(page),['a','b','c']);
    await page.locator('#undo').click(); assert.deepEqual(await read(page),before); assert.deepEqual(await selected(page),['a','b','c']);
    await page.locator('#redo').click(); assert.deepEqual(await read(page),after);
    await page.keyboard.down('Shift'); const b=await header(page,'b'); await page.mouse.click(b.x,b.y); await page.keyboard.up('Shift');
    assert.deepEqual(await selected(page),['a','c']);
    await page.keyboard.down('Meta');
    await page.locator('.card[data-id="b"] .body').click();
    await page.keyboard.up('Meta');
    assert.deepEqual(await selected(page),['a','b','c']);
  });

  await suite.test('handle connections persist all four sides; invalid drops do not add edges', async t => {
    const data=fixture(); data.edges=[];
    const {page,file}=await setup(t,data);
    async function handle(id,side) {
      await page.locator(`.card[data-id="${id}"] .card-header`).hover();
      const b=await page.locator(`.card[data-id="${id}"] .handle-${side}`).boundingBox(); return {x:b.x+b.width/2,y:b.y+b.height/2};
    }
    for (const [from,to] of [['top','bottom'],['right','left'],['bottom','top'],['left','right']]) {
      const b=await handle('b',to),a=await handle('a',from); await drag(page,a,b);
    }
    assert.equal((await read(page)).edges.length,4);
    assert.ok((await read(page)).edges.every(edge => !Object.hasOwn(edge, 'label')), 'New connections are unnamed');
    assert.deepEqual(await page.locator('.edge-label').allTextContents(),['','','','']);
    await attached(page);
    const b=await handle('b','left'),a=await handle('a','right'); await drag(page,a,b);
    await drag(page,await handle('a','right'),await handle('a','left'));
    await drag(page,await handle('a','right'),{x:1380,y:920});
    assert.equal((await read(page)).edges.length,4);
    await flush(page); const saved=JSON.parse(await fs.readFile(file,'utf8'));
    assert.deepEqual(saved,await read(page)); assert.deepEqual(saved.metadata,data.metadata);
    await page.reload(); await page.waitForFunction(()=>document.querySelector('#save-state').textContent==='Ready'); await attached(page);
    assert.deepEqual((await read(page)).edges,saved.edges);
  });

  await suite.test('connection names can be added, renamed, cleared, undone and reloaded', async t => {
    const {page,file}=await setup(t);
    const initial=await read(page);
    const p=await page.locator('g[data-edge-id="e-bottom"] .edge-line').evaluate(el=>{
      const p=el.getPointAtLength(el.getTotalLength()/2).matrixTransform(el.getScreenCTM()); return {x:p.x,y:p.y};
    });
    await page.mouse.click(p.x,p.y);
    assert.equal(await page.locator('#f-edge-label').inputValue(),'existing label');
    const name='Supports "privacy" <claim> & evidence';
    await page.locator('#f-edge-label').fill(name);
    await page.locator('#f-edge-label').press('Enter');
    assert.equal(await page.locator('g[data-edge-id="e-bottom"] .edge-label').textContent(),name);
    assert.equal(await page.locator('#f-edge-label').inputValue(),name);
    assert.equal((await read(page)).edges.find(e=>e.id==='e-bottom').extra,42);
    await page.locator('#f-edge-label').fill('Renamed relation'); await page.locator('#apply').click();
    await page.locator('#undo').click(); assert.equal(await page.locator('#f-edge-label').inputValue(),name);
    await page.locator('#redo').click(); assert.equal(await page.locator('#f-edge-label').inputValue(),'Renamed relation');
    await flush(page);
    assert.equal(JSON.parse(await fs.readFile(file,'utf8')).edges.find(e=>e.id==='e-bottom').label,'Renamed relation');
    await page.reload(); await page.waitForFunction(()=>document.querySelector('#save-state').textContent==='Ready');
    assert.equal(await page.locator('g[data-edge-id="e-bottom"] .edge-label').textContent(),'Renamed relation');
    await page.mouse.click(p.x,p.y); await page.locator('#f-edge-label').fill('  '); await page.locator('#apply').click();
    assert.equal(await page.locator('g[data-edge-id="e-bottom"] .edge-label').textContent(),'');
    assert.equal(Object.hasOwn((await read(page)).edges.find(e=>e.id==='e-bottom'),'label'),false);
    await page.locator('#undo').click(); assert.equal(await page.locator('#f-edge-label').inputValue(),'Renamed relation');
    await page.locator('#redo').click(); await flush(page);
    assert.equal(Object.hasOwn(JSON.parse(await fs.readFile(file,'utf8')).edges.find(e=>e.id==='e-bottom'),'label'),false);
    await page.locator('#f-edge-label').fill('New name for an unnamed line'); await page.locator('#apply').click();
    assert.equal((await read(page)).edges.find(e=>e.id==='e-bottom').label,'New name for an unnamed line');
    await page.locator('#undo').click();
    assert.equal(Object.hasOwn((await read(page)).edges.find(e=>e.id==='e-bottom'),'label'),false);
    assert.deepEqual((await read(page)).nodes,initial.nodes);
    assert.deepEqual((await read(page)).edges.filter(e=>e.id!=='e-bottom'),initial.edges.filter(e=>e.id!=='e-bottom'));
    assert.deepEqual((await read(page)).metadata,initial.metadata);
  });

  await suite.test('Escape, pointer cancellation and lost capture roll back without saves', async t => {
    const {page,saves}=await setup(t), before=await read(page);
    for(const cancel of ['Escape','pointercancel','lostpointercapture']) {
      const a=await header(page,'a'); await page.mouse.move(a.x,a.y); await page.mouse.down(); await page.mouse.move(a.x+80,a.y+40,{steps:5});
      if(cancel==='Escape') await page.keyboard.press('Escape');
      else await page.locator('#viewport').dispatchEvent(cancel,{pointerId:1});
      await page.mouse.up(); assert.deepEqual(await read(page),before); await attached(page);
    }
    await page.waitForTimeout(550); assert.equal(saves(),0); assert.equal(await page.locator('#undo').isDisabled(),true);
  });

  await suite.test('filtering hides incident edges; hidden and partially enclosed cards stay unselected', async t => {
    const {page}=await setup(t);
    await page.locator('#search').fill('Card A');
    await drag(page,{x:330,y:84},{x:1400,y:900},'middle'); assert.deepEqual(await selected(page),['a']);
    assert.equal(await page.locator('g[data-edge-id]:not(.hidden)').count(),0);
    await page.locator('#search').fill('');
    await drag(page,{x:340,y:94},{x:500,y:380},'middle'); assert.deepEqual(await selected(page),[]);
  });

  await suite.test('body scrolling does not pan or move; editing preserves unknown fields', async t => {
    const {page}=await setup(t), before=await read(page);
    const area=page.locator('.card[data-id="a"] .body'); await area.hover(); await page.mouse.wheel(0,200); await page.waitForTimeout(80);
    assert.ok(await area.evaluate(e=>e.scrollTop)>0); assert.deepEqual(await read(page),before);
    assert.equal(await page.locator('#world').evaluate(e=>getComputedStyle(e).transform),'matrix(1, 0, 0, 1, 0, 0)');
    const b=await area.boundingBox(); await drag(page,{x:b.x+10,y:b.y+10},{x:b.x+50,y:b.y+30}); assert.deepEqual(await read(page),before);
    const a=await header(page,'a'); await page.mouse.click(a.x,a.y); await page.locator('#f-body').fill('Revised core text');
    await page.locator('#apply').click(); await flush(page);
    assert.equal((await read(page)).nodes[0].text,'# Card A\n\nRevised core text');
    assert.deepEqual((await read(page)).nodes[0].extra,{preserve:'a'});
  });

  await suite.test('multi-card and edge deletion are atomic and undoable', async t => {
    const {page}=await setup(t), before=await read(page);
    await drag(page,{x:340,y:94},{x:1100,y:380},'middle'); await page.keyboard.press('Delete');
    assert.deepEqual((await read(page)).nodes.map(n=>n.id),['c','d']); assert.equal((await read(page)).edges.length,0);
    await page.locator('#undo').click(); assert.deepEqual(await read(page),before);
    // Select a connection at its midpoint using its actual rendered curve.
    const p=await page.locator('g[data-edge-id="e-bottom"] .edge-line').evaluate(el=>{
      const p=el.getPointAtLength(el.getTotalLength()/2).matrixTransform(el.getScreenCTM()); return {x:p.x,y:p.y};
    });
    await page.mouse.click(p.x,p.y); await page.keyboard.press('Delete');
    assert.equal((await read(page)).edges.length,3); assert.equal((await read(page)).nodes.length,4);
    await page.locator('#undo').click(); assert.deepEqual(await read(page),before);
  });

  await suite.test('pending autosave never serializes a partial or canceled drag', async t => {
    const {page,file}=await setup(t);
    await page.locator('#add').click(); const committed=await read(page);
    const a=await header(page,'b'); await page.mouse.move(a.x,a.y); await page.mouse.down(); await page.mouse.move(a.x+100,a.y+40,{steps:4});
    await page.waitForTimeout(650); await page.keyboard.press('Escape'); await page.mouse.up();
    assert.deepEqual(JSON.parse(await fs.readFile(file,'utf8')),committed);
  });

  if(process.env.DOTCANVAS_TEST_CANVAS) await suite.test('current manuscript renders without rewriting its copied canvas', async t => {
    const data=JSON.parse(await fs.readFile(process.env.DOTCANVAS_TEST_CANVAS,'utf8'));
    const {page,file,bytes,saves}=await setup(t,data);
    assert.equal(await page.locator('.card').count(),data.nodes.length); await attached(page);
    await page.waitForTimeout(550); assert.equal(saves(),0); assert.equal(await fs.readFile(file,'utf8'),bytes);
    if(process.env.DOTCANVAS_SCREENSHOT) await page.screenshot({path:process.env.DOTCANVAS_SCREENSHOT});
  });
});
