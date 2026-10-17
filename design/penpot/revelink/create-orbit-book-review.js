// Add the founder's Open Book + Discovery Orbit refinement to the existing brand page.
const page=penpotUtils.getPageByName('Revelink — Brand explorations');
if(!page)throw Error('Connect the file containing the Revelink brand page.');
await penpot.openPage(page);
const C={green:'#176B4C',mint:'#55BF95',ink:'#17221D',muted:'#627169',gray:'#F5F8F6',line:'#E3E9E5',white:'#FFFFFF'};
const tagline='Watch. Discover. Connect the dots.';
const old=page.root.children.filter(s=>s.type==='board'&&!s.getPluginData('orbit-book-review'));
const top=Math.max(...old.map(s=>s.y+s.height))+180;
const boards={};let b;
function rect(name,x,y,w,h,color=C.white,r=0,parent=b){const s=penpot.createRectangle();parent.appendChild(s);s.name=name;s.x=b.x+x;s.y=b.y+y;s.resize(w,h);s.borderRadius=r;s.fills=[{fillColor:color}];return s;}
function text(name,value,x,y,w,size=16,weight=400,color=C.ink,family='Roboto',align='left',parent=b){
 const t=penpot.createText(value);parent.appendChild(t);t.name=name;t.x=b.x+x;t.y=b.y+y;
 const f=penpot.fonts.findAllByName(family).find(f=>f.name===family);if(!f)throw Error('Font missing: '+family);
 f.applyToText(t,f.variants.find(v=>v.fontWeight===String(weight)&&v.fontStyle==='normal'));t.fontId=f.fontId;t.fontFamily=family;t.fontWeight=String(weight);t.fontSize=String(size);t.lineHeight='1.4';t.fills=[{fillColor:color}];t.align=align;t.resize(w,size*1.4);t.growType='auto-height';return t;
}
function svg(color=C.green,accent=C.mint){return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><path d="M49 17a23 23 0 1 0 2 28" fill="none" stroke="${color}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M32 25c-4-3-8-3-12-1v16c4-2 8-1 12 3 4-4 8-5 12-3V24c-4-2-8-2-12 1Zm0 0v18" fill="none" stroke="${color}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="49" cy="17" r="5" fill="${accent}"/><circle cx="51" cy="45" r="4" fill="${color}"/></svg>`;}
function symbol(name,x,y,size,color=C.green,accent=C.mint,parent=b){const s=penpot.createShapeFromSvg(svg(color,accent));parent.appendChild(s);s.name=name;s.x=b.x+x;s.y=b.y+y;s.resize(size,size);for(const p of penpotUtils.findShapes(s=>s.strokes?.length,s))p.strokes=p.strokes.map(st=>({...st,strokeWidth:st.strokeWidth*size/64}));return s;}
function wordmark(x,y,size=48,color=C.ink,w=600){return text('Revelink wordmark','Revelink',x,y,w,size,700,color,'Manrope');}
function board(key,title,x,y,w=1440,h=1100){b=page.root.children.find(s=>s.getPluginData('orbit-book-review')===key);if(b){boards[key]=b;return false;}b=penpot.createBoard();b.name='Revelink · Orbit Book · '+title;b.x=x;b.y=y;b.resize(w,h);b.fills=[{fillColor:C.gray}];b.clipContent=true;b.setPluginData('orbit-book-review',key);boards[key]=b;return true;}
function heading(eyebrow,title,description){text('Review eyebrow',eyebrow,48,40,1344,12,600,C.green,'Manrope');text('Review title',title,48,78,1344,38,700,C.ink,'Manrope');text('Review description',description,48,145,1344,17,400,C.muted);}
if(board('logo','01 · Logo and tagline',0,top)){
 heading('REVELINK / ORBIT BOOK','Open Book × Discovery Orbit','Your two preferred directions, combined into one symbol.');
 const frame=rect('Primary logo specimen',48,228,1344,652,C.white,24);frame.strokes=[{strokeColor:C.line,strokeWidth:1,strokeStyle:'solid',strokeAlignment:'inner'}];
 symbol('Orbit Book · primary symbol',464,382,128);wordmark(624,397,80,C.ink,640);
 text('Approved tagline',tagline,272,578,896,25,400,C.muted,'Roboto','center');
 rect('Specimen divider',320,692,800,1,C.line);
 text('Combination description','The open book replaces the play triangle. The orbit and connection nodes remain.',272,730,896,17,400,C.muted,'Roboto','center');
 text('Palette and typography note','Revelink · Manrope wordmark · Green #176B4C · Mint #55BF95',48,1018,1344,15,400,C.muted);
}
if(board('header','02 · Desktop header',1560,top)){
 heading('REVELINK / ORBIT BOOK IN THE APP','The new mark in your desktop header.','A direct replacement for the current app icon and name.');
 const app=rect('Desktop app preview',48,228,1344,748,C.white,16);app.strokes=[{strokeColor:C.line,strokeWidth:1,strokeStyle:'solid',strokeAlignment:'inner'}];
 symbol('Orbit Book · desktop header symbol',76,248,32);wordmark(120,244,25,C.ink,180);
 const search=rect('Search field',380,242,640,44,C.gray,22);search.strokes=[{strokeColor:C.line,strokeWidth:1,strokeStyle:'solid',strokeAlignment:'inner'}];text('Search placeholder','Search anything you’re curious about',400,255,542,14,400,C.muted);
 const searchIcon=penpot.createShapeFromSvg(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${C.green}" stroke-width="1.7"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg>`);b.appendChild(searchIcon);searchIcon.name='Search icon';searchIcon.x=b.x+980;searchIcon.y=b.y+253;searchIcon.resize(22,22);
 const sign=rect('Account button',1260,242,108,44,C.white,22);sign.strokes=[{strokeColor:C.line,strokeWidth:1,strokeStyle:'solid',strokeAlignment:'inner'}];text('Account label','Sign in',1287,254,66,14,500,C.green);
 rect('Header divider',48,300,1344,1,C.line);rect('Sidebar divider',256,301,1,675,C.line);
 rect('Home selected',60,324,184,42,C.soft,9);text('Home navigation','Home',80,335,150,14,500,C.green);
 text('Shorts navigation','Short videos',80,390,150,14);text('History navigation','Watch history',80,440,150,14);
 rect('Sidebar separator',68,496,168,1,C.line);text('Universes heading','Your Universes',80,522,160,15,600);
 text('Science navigation','Science & Technology',80,570,160,13);text('Commerce navigation','Commerce & Business',80,616,160,13);text('Arts navigation','Arts & Humanities',80,662,160,13);
 text('Teacher navigation','Ask a question',80,758,160,14);text('Sidebar caption','Follow your curiosity.',80,906,160,12,400,C.muted);
 const tabs=[['Trending',108],['Science & Technology',196],['Commerce & Business',198],['Arts & Humanities',180]];let tabX=280;
 for(let i=0;i<tabs.length;i++){const [label,w]=tabs[i];rect(label+' tab',tabX,324,w,38,i===0?C.soft:C.gray,9);text(label+' tab label',label,tabX+14,334,w-24,13,500,i===0?C.green:C.ink);tabX+=w+10;}
 text('Feed title','Trending',280,402,1064,25,600,C.ink,'Manrope');text('Feed description','Explore ideas through videos. Follow the connections that interest you.',280,447,1064,15,400,C.muted);
 const sourcePage=penpotUtils.getPageByName('curiosity-desktop-universe');const source=sourcePage?.root.children.find(s=>s.getPluginData('universe-review-key')==='d-home');if(!source)throw Error('Desktop thumbnail references missing.');
 const images=penpotUtils.findShapes(s=>s.fills?.some(f=>f.fillImage),source).map(s=>s.fills.find(f=>f.fillImage));
 const examples=[['How GPUs work: a visual explanation','Science & Technology – Graphics & GPUs','Tech Explained'],['The ideas that shape our money','Commerce & Business – Economics','Money Explained'],['How computers learn from examples','Science & Technology – Artificial intelligence','Computing Lab']];
 for(let i=0;i<examples.length;i++){
  const x=280+i*368;const [title,topic,creator]=examples[i];const image=rect('Video thumbnail · '+title,x,496,344,194,C.gray,12);image.fills=[images[i]];
  text('Video title',title,x,710,344,18,600,C.ink,'Manrope');text('Video topic',topic,x,774,344,12,500,C.green);text('Video creator',creator+' · YouTube',x,826,344,13,400,C.muted);
 }
 text('Header note','Compact header: symbol + Revelink. The tagline stays in larger brand and welcome layouts.',48,1018,1344,14,400,C.muted);
}
if(board('scale','03 · Small icons and dark backgrounds',3120,top)){
 heading('REVELINK / ORBIT BOOK IN USE','One symbol, across sizes.','Light and dark versions, an app icon and browser-size marks.');
 const light=rect('Light logo specimen',48,228,648,292,C.white,20);light.strokes=[{strokeColor:C.line,strokeWidth:1,strokeStyle:'solid',strokeAlignment:'inner'}];
 text('Light specimen label','ON LIGHT',76,250,580,12,600,C.green,'Manrope');symbol('Orbit Book · light symbol',160,298,96);wordmark(280,316,56,C.ink,380);text('Light tagline',tagline,96,434,552,18,400,C.muted,'Roboto','center');
 rect('Dark logo specimen',744,228,648,292,C.ink,20);text('Dark specimen label','ON DARK',772,250,580,12,600,'#C9D9D0','Manrope');symbol('Orbit Book · reversed symbol',856,298,96,C.white,C.mint);wordmark(976,316,56,C.white,380);text('Dark tagline',tagline,792,434,552,18,400,'#C9D9D0','Roboto','center');
 const small=rect('App icon and small size specimen',48,560,1344,394,C.white,20);small.strokes=[{strokeColor:C.line,strokeWidth:1,strokeStyle:'solid',strokeAlignment:'inner'}];
 text('Small specimen title','App icon and small sizes',80,590,1248,22,600,C.ink,'Manrope');
 rect('Orbit Book · app icon background',104,670,128,128,C.green,28);symbol('Orbit Book · app icon symbol',120,686,96,C.white,C.white);text('App icon label','App icon',88,834,160,14,400,C.muted,'Roboto','center');
 for(const [size,x,y] of [[64,402,702],[32,592,718],[24,768,722],[16,936,726]]){symbol('Orbit Book · '+size+'px symbol',x,y,size,C.green,C.green);text(size+'px label',size+'px',x-32+size/2,834,64,14,400,C.muted,'Roboto','center');}
 text('Size note','An open book at the centre, with the same orbit and connection nodes at every size.',80,900,1248,14,400,C.muted);
 text('Editable assets note','Native editable vectors and text. Transparent SVG master included in the handoff.',48,1018,1344,15,400,C.muted);
}
storage.orbitBookPage=page;storage.orbitBookBoards=boards;storage.orbitBookSvg=svg;
penpot.selection=[boards.logo];penpot.viewport.zoomIntoView(penpot.selection);
return {pageId:page.id,pageName:page.name,boards:Object.entries(boards).map(([key,s])=>({key,id:s.id,name:s.name,width:s.width,height:s.height}))};
