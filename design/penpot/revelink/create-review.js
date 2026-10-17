// Run in the connected Penpot plugin. Adds one new brand page; preserves app designs.
const stage = storage.revelinkStage || 'all';
const pageName = 'Revelink — Brand explorations';
let page = penpotUtils.getPageByName(pageName);
if (!page) { page=penpot.createPage();page.name=pageName; }
await penpot.openPage(page);
const C={ink:'#17221D',muted:'#627169',green:'#176B4C',mint:'#55BF95',soft:'#EAF4EE',line:'#E3E9E5',gray:'#F5F8F6',white:'#FFFFFF'};
const concepts=[
  {key:'play',name:'Connected Play',note:'Video play, built from connected knowledge nodes.',recommended:true},
  {key:'book',name:'Open Book',note:'An open book for knowledge, with a connected centre.'},
  {key:'r',name:'Linked R',note:'A compact R, ending in a knowledge-graph node.'},
  {key:'orbit',name:'Discovery Orbit',note:'A video at the centre of a connected discovery path.'},
];
const tagline='Watch. Discover. Connect the dots.';
const boards={};let b;
function rect(name,x,y,w,h,color=C.white,r=0,parent=b){const s=penpot.createRectangle();parent.appendChild(s);s.name=name;s.x=b.x+x;s.y=b.y+y;s.resize(w,h);s.borderRadius=r;s.fills=[{fillColor:color}];return s;}
function text(name,value,x,y,w,size=16,weight=400,color=C.ink,family='Roboto',align='left',parent=b){
 const s=penpot.createText(value);parent.appendChild(s);s.name=name;s.x=b.x+x;s.y=b.y+y;
 const font=penpot.fonts.findAllByName(family).find(f=>f.name===family);if(!font)throw Error('Font unavailable: '+family);
 font.applyToText(s,font.variants.find(v=>v.fontWeight===String(weight)&&v.fontStyle==='normal'));
 s.fontSize=String(size);s.lineHeight='1.4';s.fills=[{fillColor:color}];s.align=align;s.resize(w,size*1.4);s.growType='auto-height';return s;
}
function symbolSvg(key,color=C.green,accent=C.mint){
 const common=`fill="none" stroke="${color}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"`;
 const paths={
  play:`<path d="M18 14 50 32 18 50Z" ${common}/><circle cx="18" cy="14" r="5.5" fill="${color}"/><circle cx="18" cy="50" r="5.5" fill="${color}"/><circle cx="50" cy="32" r="5.5" fill="${accent}"/>`,
  book:`<path d="M32 19C25 12 14 11 7 15v34c8-4 17-2 25 4 8-6 17-8 25-4V15c-7-4-18-3-25 4Zm0 0v34" ${common}/><circle cx="32" cy="14" r="4.5" fill="${accent}"/>`,
  r:`<path d="M17 52V12h15c21 0 21 23 0 23H17m15 0 16 17" ${common}/><circle cx="48" cy="52" r="5.5" fill="${accent}"/>`,
  orbit:`<path d="M49 17a23 23 0 1 0 2 28" ${common}/><path d="m25 21 17 11-17 11Z" fill="${color}"/><circle cx="49" cy="17" r="5" fill="${accent}"/><circle cx="51" cy="45" r="4" fill="${color}"/>`,
 };
 return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">${paths[key]}</svg>`;
}
function symbol(key,x,y,size=64,color=C.green,accent=C.mint,parent=b){const s=penpot.createShapeFromSvg(symbolSvg(key,color,accent));parent.appendChild(s);s.name='Symbol · '+concepts.find(c=>c.key===key).name;s.x=b.x+x;s.y=b.y+y;s.resize(size,size);for(const child of penpotUtils.findShapes(t=>t.strokes?.length,s)){child.strokes=child.strokes.map(stroke=>({...stroke,strokeWidth:(stroke.strokeWidth||0)*size/64}));}return s;}
function wordmark(x,y,size=48,color=C.ink,w=320,parent=b){return text('Revelink wordmark','Revelink',x,y,w,size,700,color,'Manrope','left',parent);}
function board(key,title,x,y,w,h,color=C.white){
 b=page.root.children.find(s=>s.getPluginData('revelink-brand-review')===key);
 if(b){boards[key]=b;return false;}
 b=penpot.createBoard();b.name='Revelink · '+title;b.x=x;b.y=y;b.resize(w,h);b.fills=[{fillColor:color}];b.clipContent=true;b.setPluginData('revelink-brand-review',key);boards[key]=b;return true;
}
if((stage==='all'||stage==='overview')&&board('overview','01 · Four logo directions',0,0,1440,1100,C.gray)){
 text('Review eyebrow','REVELINK / BRAND EXPLORATIONS',48,40,1200,12,600,C.green,'Manrope');
 text('Page title','One name. Four directions.',48,78,1300,42,700,C.ink,'Manrope');
 text('Review description','A new symbol and wordmark for video, knowledge and connected discovery.',48,144,1300,17,400,C.muted);
 for(let i=0;i<concepts.length;i++){
  const c=concepts[i],x=i%2===0?48:744,y=i<2?208:608;
  const card=rect(c.name+' concept card',x,y,648,360,C.white,20);card.strokes=[{strokeColor:C.line,strokeWidth:1,strokeStyle:'solid',strokeAlignment:'inner'}];
  text(c.name+' option title',String(i+1).padStart(2,'0')+' / '+c.name,x+28,y+24,410,19,600,C.ink,'Manrope');
  if(c.recommended){rect('Recommended badge',x+464,y+22,156,30,C.soft,15);text('Recommended','Recommended',x+477,y+29,132,12,600,C.green,'Manrope');}
  symbol(c.key,x+152,y+109,72);wordmark(x+246,y+115,48,C.ink,360);
  text(c.name+' tagline',tagline,x+40,y+216,568,16,400,C.muted,'Roboto','center');
  rect(c.name+' divider',x+28,y+266,592,1,C.line);
  text(c.name+' meaning',c.note,x+28,y+288,592,15,400,C.muted);
 }
 text('Palette note','Same green family as the app. Editable vector symbols. Manrope wordmark.',48,1018,1344,15,400,C.muted);
}
if((stage==='all'||stage==='applications')&&board('header','02 · In the desktop header',1560,0,1440,1100,C.gray)){
 text('Header review eyebrow','REVELINK / IN THE APP',48,40,1200,12,600,C.green,'Manrope');
 text('Header review title','A clean replacement for Curiosity.',48,78,1300,38,700,C.ink,'Manrope');
 text('Header review description','The header uses the symbol + Revelink. The tagline stays on welcome screens and brand material.',48,144,1320,16,400,C.muted);
 for(let i=0;i<concepts.length;i++){
  const c=concepts[i],y=246+i*182;
  text(c.name+' header title',String(i+1).padStart(2,'0')+' / '+c.name,48,y-42,1300,18,600,C.ink,'Manrope');
  const frame=rect(c.name+' desktop header',48,y,1344,72,C.white,12);frame.strokes=[{strokeColor:C.line,strokeWidth:1,strokeStyle:'solid',strokeAlignment:'inner'}];
  symbol(c.key,76,y+20,32);wordmark(120,y+16,25,C.ink,180);
  const search=rect(c.name+' search field',380,y+14,640,44,C.gray,22);search.strokes=[{strokeColor:C.line,strokeWidth:1,strokeStyle:'solid',strokeAlignment:'inner'}];
  text(c.name+' search placeholder','Search anything you’re curious about',400,y+27,542,14,400,C.muted);
  const searchIcon=penpot.createShapeFromSvg(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${C.green}" stroke-width="1.7"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg>`);b.appendChild(searchIcon);searchIcon.name='Search icon';searchIcon.x=b.x+980;searchIcon.y=b.y+y+25;searchIcon.resize(22,22);
  const sign=rect(c.name+' account button',1260,y+14,108,44,C.white,22);sign.strokes=[{strokeColor:C.line,strokeWidth:1,strokeStyle:'solid',strokeAlignment:'inner'}];text(c.name+' account label','Sign in',1287,y+26,66,14,500,C.green);
 }
 text('Compact header note','Shown at desktop header size: a 32px symbol and a 25px wordmark. No AI suffix or extra badge.',48,1034,1344,14,400,C.muted);
}
if((stage==='all'||stage==='applications')&&board('scale','03 · Small icons and dark backgrounds',0,1240,1440,1100,C.gray)){
 text('Scale review eyebrow','REVELINK / SMALL & REVERSED',48,40,1200,12,600,C.green,'Manrope');
 text('Scale review title','Recognisable beyond the header.',48,78,1300,38,700,C.ink,'Manrope');
 text('Scale review description','App icons, browser-size marks and a white wordmark on a dark background.',48,144,1300,17,400,C.muted);
 text('App icon column label','APP ICON',296,200,80,11,600,C.muted,'Manrope','center');
 text('32px column label','32px',448,200,48,11,600,C.muted,'Manrope','center');
 text('24px column label','24px',532,200,48,11,600,C.muted,'Manrope','center');
 text('16px column label','16px',608,200,48,11,600,C.muted,'Manrope','center');
 for(let i=0;i<concepts.length;i++){
  const c=concepts[i],y=246+i*182;
  text(c.name+' scale title',String(i+1).padStart(2,'0')+' / '+c.name,48,y+34,226,18,600,C.ink,'Manrope');
  rect(c.name+' app icon',296,y+18,80,80,C.green,18);symbol(c.key,304,y+26,64,C.white,C.white);
  symbol(c.key,456,y+42,32,C.green,C.green);symbol(c.key,544,y+46,24,C.green,C.green);symbol(c.key,624,y+50,16,C.green,C.green);
  rect(c.name+' dark specimen',744,y,648,136,C.ink,16);symbol(c.key,780,y+29,48,C.white,C.mint);wordmark(848,y+30,34,C.white,466);text(c.name+' reverse tagline',tagline,848,y+87,466,15,400,'#C9D9D0');
 }
 text('Small-size note','One-colour marks keep the shape clear at small sizes. These are review specimens, not installed app assets.',48,1034,1344,14,400,C.muted);
}
for(const s of page.root.children.filter(s=>s.getPluginData('revelink-brand-review'))) boards[s.getPluginData('revelink-brand-review')]=s;
storage.revelinkPage=page;storage.revelinkBoards=boards;storage.revelinkSymbolSvg=symbolSvg;
penpot.selection=[boards.overview||Object.values(boards)[0]];penpot.viewport.zoomIntoView(penpot.selection);
return {pageId:page.id,pageName:page.name,boards:Object.entries(boards).map(([key,s])=>({key,id:s.id,name:s.name,width:s.width,height:s.height}))};
