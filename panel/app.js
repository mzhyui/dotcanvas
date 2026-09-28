(function () {
  'use strict';
  const SECTIONS = ['Introduction', 'Related Work', 'Method', 'Evaluation', 'Conclusion'];
  const COLORS = { '1':'#3b82f6', '2':'#8b5cf6', '3':'#10b981', '4':'#f59e0b', '5':'#ef4444', '6':'#64748b' };
  const viewport = document.getElementById('viewport'), world = document.getElementById('world'), edges = document.getElementById('edges');
  const inspector = document.getElementById('inspector'), saveState = document.getElementById('save-state'), pathLabel = document.getElementById('path');
  let canvas = null, selected = null, mode = null, filter = '', scale = 1, pan = { x: 0, y: 0 }, drag = null, history = [], future = [], saveTimer;
  const uid = p => `${p}-${Math.random().toString(36).slice(2, 9)}`;
  const seed = () => ({ nodes: SECTIONS.map((section, i) => ({ id:`node-${i+1}`, type:'text', x:80+(i%3)*330, y:80+Math.floor(i/3)*260, width:280, height:190, color:String(i%6+1), text:`# ${section}\n\n${['Frame the problem, motivation, and contribution.','Position the paper against the closest prior work.','Describe the proposed approach and its assumptions.','Define datasets, baselines, metrics, and research questions.','Summarize findings, limitations, and future work.'][i]}`, section, status:'draft', path:'', anchor:'' })), edges:[], metadata:{dotcanvas:{version:1}} });
  function valid(c) { if (!c || !Array.isArray(c.nodes) || !Array.isArray(c.edges)) throw Error('Canvas must contain nodes and edges arrays.'); const ids=new Set(c.nodes.map(n=>n.id)); if(ids.size!==c.nodes.length) throw Error('Canvas contains duplicate node IDs.'); c.edges.forEach(e=>{if(!ids.has(e.fromNode)||!ids.has(e.toNode)) throw Error(`Edge ${e.id||''} points to a missing node.`)}); return c; }
  function snapshot() { history.push(JSON.stringify(canvas)); if(history.length>50) history.shift(); future=[]; updateHistory(); }
  function restore(s) { canvas=JSON.parse(s); selected=null; render(); scheduleSave(); }
  function updateHistory(){document.getElementById('undo').disabled=!history.length;document.getElementById('redo').disabled=!future.length;}
  function commit(fn){snapshot();fn();render();scheduleSave();}
  function node(id){return canvas.nodes.find(n=>n.id===id);}
  function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function render(){
    world.innerHTML=''; edges.innerHTML='<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#64748b"/></marker></defs>';
    canvas.nodes.forEach(n=>{const el=document.createElement('article');el.className='card'+(selected===n.id?' selected':'')+(filter&&!(`${n.text} ${n.section||''}`.toLowerCase().includes(filter))?' hidden':'');el.dataset.id=n.id;el.style.left=n.x+'px';el.style.top=n.y+'px';el.style.width=(n.width||280)+'px';el.style.minHeight=(n.height||150)+'px';el.style.borderTopColor=COLORS[n.color]||COLORS['1'];const parts=String(n.text||'').split('\n');const title=(parts.find(x=>x.trim())||n.section||'Untitled').replace(/^#\s*/,'');el.innerHTML=`<span class="status">${esc(n.status||'draft')}</span><h3>${esc(title)}</h3><div class="body">${esc(parts.slice(1).join('\n').trim()||'Add a short idea…')}</div>${n.path?`<span class="tag">${esc(n.path)}${n.anchor?`#${esc(n.anchor)}`:''}</span>`:''}`;el.addEventListener('pointerdown',startDrag);el.addEventListener('click',()=>{selected=n.id;renderInspector();render()});world.appendChild(el);});
    canvas.edges.forEach(e=>{const a=node(e.fromNode),b=node(e.toNode);if(!a||!b)return;const x1=a.x+a.width/2,y1=a.y+a.height/2,x2=b.x+b.width/2,y2=b.y+b.height/2;const line=document.createElementNS('http://www.w3.org/2000/svg','path');line.classList.add('edge');if(selected===e.id)line.classList.add('selected');line.setAttribute('d',`M ${x1} ${y1} L ${x2} ${y2}`);line.style.pointerEvents='stroke';line.addEventListener('click',ev=>{ev.stopPropagation();selected=e.id;renderInspector();render()});edges.appendChild(line);});
    edges.style.transform=`translate(${pan.x}px,${pan.y}px) scale(${scale})`;world.style.transform=`translate(${pan.x}px,${pan.y}px) scale(${scale})`;document.getElementById('empty').classList.toggle('hidden',canvas.nodes.length>0);renderInspector();
  }
  function renderInspector(){const n=node(selected);if(!n){inspector.innerHTML='<p class="muted">Select a card to edit it. Click Connect, then two cards to draw a directed edge.</p>';return}inspector.innerHTML=`<div class="field"><label>Title</label><input id="f-title" value="${esc(String(n.text||'').split('\n')[0].replace(/^#\s*/,'')||n.section||'')}"/></div><div class="field"><label>Section / type</label><select id="f-section">${SECTIONS.map(s=>`<option ${s===n.section?'selected':''}>${s}</option>`).join('')}<option value="Custom" ${n.section==='Custom'?'selected':''}>Custom</option></select></div><div class="field"><label>Core</label><textarea id="f-body">${esc(String(n.text||'').replace(/^#.*?\n\n?/,'').trim())}</textarea></div><div class="field"><label>Status</label><select id="f-status"><option ${n.status==='draft'?'selected':''}>draft</option><option ${n.status==='ready'?'selected':''}>ready</option><option ${n.status==='blocked'?'selected':''}>blocked</option></select></div><div class="field"><label>Repository path</label><input id="f-path" value="${esc(n.path||'')}" placeholder="paper.tex or notes.md"/></div><div class="field"><label>Anchor</label><input id="f-anchor" value="${esc(n.anchor||'')}" placeholder="section or line"/></div><div class="actions"><button id="apply">Apply</button><button id="delete" class="danger">Delete</button></div>`;document.getElementById('apply').onclick=()=>commit(()=>{n.section=document.getElementById('f-section').value;n.text=`# ${document.getElementById('f-title').value.trim()||n.section}\n\n${document.getElementById('f-body').value}`;n.status=document.getElementById('f-status').value;n.path=document.getElementById('f-path').value;n.anchor=document.getElementById('f-anchor').value});document.getElementById('delete').onclick=()=>commit(()=>{canvas.nodes=canvas.nodes.filter(x=>x.id!==n.id);canvas.edges=canvas.edges.filter(e=>e.fromNode!==n.id&&e.toNode!==n.id);selected=null});}
  function addCard(){commit(()=>{const n={id:uid('node'),type:'text',x:180-pan.x/scale,y:150-pan.y/scale,width:280,height:170,color:'1',text:'# New idea\n\nDescribe the claim or experiment.',section:'Custom',status:'draft',path:'',anchor:''};canvas.nodes.push(n);selected=n.id});}
  function startDrag(ev){if(ev.button!==0)return;const el=ev.currentTarget,n=node(el.dataset.id);selected=n.id;drag={n,startX:ev.clientX,startY:ev.clientY,x:n.x,y:n.y};el.setPointerCapture(ev.pointerId);snapshot();}
  function moveDrag(ev){if(!drag)return;drag.n.x=drag.x+(ev.clientX-drag.startX)/scale;drag.n.y=drag.y+(ev.clientY-drag.startY)/scale;render();}
  function endDrag(){if(!drag)return;drag=null;scheduleSave();}
  function scheduleSave(){clearTimeout(saveTimer);saveState.textContent='Unsaved changes';saveTimer=setTimeout(save,450);}
  let saveChain = Promise.resolve();
  function save(){
    try {
      valid(canvas);
      const payload=JSON.stringify(canvas,null,2)+'\n';
      saveChain=saveChain.catch(()=>{}).then(async()=>{
        if(window.canvasHost&&window.canvasHost.writeCanvas){
          await window.canvasHost.writeCanvas(window.canvasPath||'.canvas',payload);
        }else if(window.location.protocol==='http:'||window.location.protocol==='https:'){
          const response=await fetch('/api/canvas',{method:'PUT',headers:{'Content-Type':'application/json'},body:payload});
          if(!response.ok)throw Error((await response.json()).error||'Save failed ('+response.status+')');
        }else{
          window.parent.postMessage({type:'canvas:save',payload:{path:window.canvasPath||'.canvas',contents:payload}},'*');
          saveState.textContent='Preview only';
          return;
        }
        saveState.textContent='Saved';
      }).catch(e=>{saveState.textContent='Save error';notify(e.message);});
    }catch(e){saveState.textContent='Save error';notify(e.message);}
  }
  function notify(msg){if(window.canvasHost&&window.canvasHost.notify)window.canvasHost.notify({type:'canvas:error',payload:{message:msg}});}
  document.getElementById('add').onclick=addCard;document.getElementById('empty-add').onclick=addCard;document.getElementById('connect').onclick=()=>{mode=mode?.kind==='connect'?null:{kind:'connect',from:null};document.getElementById('connect').classList.toggle('active',!!mode);};
  document.getElementById('search').oninput=e=>{filter=e.target.value.toLowerCase();render()};document.getElementById('undo').onclick=()=>{if(!history.length)return;future.push(JSON.stringify(canvas));restore(history.pop())};document.getElementById('redo').onclick=()=>{if(!future.length)return;history.push(JSON.stringify(canvas));restore(future.pop())};
  viewport.addEventListener('click',e=>{if(mode?.kind==='connect'&&e.target.classList.contains('card')){const id=e.target.dataset.id;if(!mode.from){mode.from=id;selected=id;render();return}if(mode.from!==id){const from=mode.from;commit(()=>canvas.edges.push({id:uid('edge'),fromNode:from,toNode:id,fromSide:'right',toSide:'left',label:'supports'}));mode=null;document.getElementById('connect').classList.remove('active');}}});
  viewport.addEventListener('wheel',e=>{e.preventDefault();scale=Math.max(.45,Math.min(2,scale*(e.deltaY<0?1.08:.92)));render()},{passive:false});viewport.addEventListener('pointerdown',e=>{if(e.target!==viewport)return;viewport.classList.add('panning');drag={pan:true,startX:e.clientX,startY:e.clientY,x:pan.x,y:pan.y};viewport.setPointerCapture(e.pointerId)});viewport.addEventListener('pointermove',e=>{if(drag&&drag.pan){pan.x=drag.x+e.clientX-drag.startX;pan.y=drag.y+e.clientY-drag.startY;render()}else moveDrag(e)});viewport.addEventListener('pointerup',()=>{if(drag&&drag.pan){drag=null;viewport.classList.remove('panning')}else endDrag()});
  document.addEventListener('keydown',e=>{if((e.key==='Delete'||e.key==='Backspace')&&selected&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){commit(()=>{canvas.nodes=canvas.nodes.filter(n=>n.id!==selected);canvas.edges=canvas.edges.filter(x=>x.fromNode!==selected&&x.toNode!==selected);selected=null})}});
  window.addEventListener('message',e=>{const m=e.data||{};if(m.type==='canvas:init'){try{canvas=valid(typeof m.payload.contents==='string'?JSON.parse(m.payload.contents):m.payload);window.canvasPath=m.payload.path||'.canvas';pathLabel.textContent=window.canvasPath;render();}catch(err){notify(err.message)}}});
  window.researchCanvas={load(c,path){canvas=valid(c);window.canvasPath=path||'.canvas';pathLabel.textContent=window.canvasPath;render()},getCanvas:()=>canvas};
  async function initialize(){
    canvas=seed();
    render();
    try{
      let contents;
      if(window.canvasHost&&window.canvasHost.readCanvas){
        contents=await window.canvasHost.readCanvas(window.canvasPath||'.canvas');
      }else if(window.location.protocol==='http:'||window.location.protocol==='https:'){
        const response=await fetch('/api/canvas',{cache:'no-store'});
        if(!response.ok)throw Error('Load failed ('+response.status+')');
        contents=await response.text();
      }
      if(contents){
        canvas=valid(typeof contents==='string'?JSON.parse(contents):contents);
        window.canvasPath='.canvas';
        pathLabel.textContent='.canvas';
        render();
        saveState.textContent='Ready';
      }else if(!window.canvasHost){
        saveState.textContent='Preview only';
      }
    }catch(e){saveState.textContent='Load error';notify(e.message);}
  }
  initialize();
}());
