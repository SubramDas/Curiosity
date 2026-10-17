// Additive desktop-only review. Run in the connected Penpot plugin.
const page = penpotUtils.getPageByName('curiosity-desktop-universe');
if (!page) throw new Error('Connect the file containing curiosity-desktop-universe.');
await penpot.openPage(page);
const source = page.root.children.find(s => s.getPluginData('universe-review-key') === 'd-watch');
const home = page.root.children.find(s => s.getPluginData('universe-review-key') === 'd-home');
if (!source || !home) throw new Error('The existing desktop Universe screens are required.');
const images = penpotUtils.findShapes(s => s.fills?.some(f => f.fillImage), home).map(s => s.fills.find(f => f.fillImage));
const C = { ink:'#17221D', muted:'#627169', green:'#176B4C', soft:'#EAF4EE', line:'#E3E9E5', gray:'#F4F6F4', white:'#FFFFFF' };
const boards = {};
const links = [];
let b;
const previous = page.root.children.filter(s => s.type === 'board' && !s.getPluginData('related-universe-review'));
const top = Math.max(...previous.map(s => s.y + s.height)) + 180;
function rect(name,x,y,w,h,color=C.white,r=10,parent=b) {
  const s=penpot.createRectangle(); parent.appendChild(s);s.name=name;s.x=b.x+x;s.y=b.y+y;s.resize(w,h);s.borderRadius=r;s.fills=[{fillColor:color}];return s;
}
function text(name,value,x,y,w,size=16,weight=400,color=C.ink,parent=b) {
  const s=penpot.createText(value);parent.appendChild(s);s.name=name;s.x=b.x+x;s.y=b.y+y;s.fontId='gfont-roboto';s.fontFamily='Roboto';s.fontWeight=String(weight);s.fontSize=String(size);s.lineHeight='1.5';s.fills=[{fillColor:color}];s.resize(w,size*1.5);s.growType='auto-height';return s;
}
function icon(name,path,x,y,color=C.green,size=20,parent=b) {
  const s=penpot.createShapeFromSvg(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`);parent.appendChild(s);s.name=name;s.x=b.x+x;s.y=b.y+y;s.resize(size,size);return s;
}
function photo(name,x,y,w,h,index=0,parent=b) {const r=rect(name,x,y,w,h,C.gray,12,parent);r.fills=[images[index%images.length]];return r;}
function go(shape,key){links.push([shape,key]);}
function makeBoard(key,name,index) {
  const existing=page.root.children.find(s=>s.getPluginData('related-universe-review')===key);
  if(existing){boards[key]=existing;return false;}
  b=penpot.createBoard();b.name='Related Universes · '+name;b.x=index*1560;b.y=top;b.resize(1440,1100);b.fills=[{fillColor:C.white}];b.clipContent=true;b.setPluginData('related-universe-review',key);boards[key]=b;
  for(const child of source.children.filter(s=>s.y+s.height<=source.y+84||s.x+s.width<=source.x+232.1)) {
    if(child.name==='menu icon') continue;
    const c=child.clone();b.appendChild(c);c.x=b.x+child.x-source.x;c.y=b.y+child.y-source.y;
    for(const s of [c,...penpotUtils.findShapes(()=>true,c)]) for(const i of [...(s.interactions||[])]) i.remove();
    if(c.name==='Sidebar') c.resize(232,1036);
    if(['Home brand target','Brand mark','curiosity'].includes(c.name)||(c.name==='play icon'&&c.y<b.y+64))c.x-=40;
    if(c.name.endsWith(' navigation'))c.fills=[{fillColor:c.name==='Home navigation'?C.soft:C.white}];
    if(c.type==='text'&&c.characters==='Continue watching'){c.characters='Watch history';c.name='Watch history';}
  }
  return true;
}
const P={chevron:'<path d="m6 9 6 6 6-6"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>'};
function pill(x,y,count,key,opened) {
  const r=rect('Related Universe count · '+count,x,y,54,28,opened?C.green:C.soft,8);
  const t=text('Related Universe count label','+'+count,x+10,y+5,24,12,600,opened?C.white:C.green);
  const i=icon('Related Universe disclosure',P.chevron,x+34,y+8,opened?C.white:C.green,12);
  if(opened)i.rotation=180;
  for(const s of [r,t,i])go(s,key);
}
function card(x,y,index,title,subject,creator,count,key,opened) {
  photo('Video thumbnail · '+title,x,y,352,198,index);
  rect('Video duration badge',x+298,y+166,44,23,C.ink,5);text('Video duration',index===0?'6:24':index===1?'8:16':'7:42',x+303,y+168,36,11,500,C.white);
  text('Video title',title,x,y+216,352,18,600);
  text('Primary Universe and topic',subject,x,y+278,count?286:352,12,500,C.green);
  if(count)pill(x+298,y+275,count,key,opened);
  text('Video creator',creator,x,y+326,352,13,400,C.muted);
}
function feed(key) {
  const tabs=[['Trending',108],['Science & Technology',196],['Commerce & Business',198],['Arts & Humanities',180]];
  let x=280;
  for(let i=0;i<tabs.length;i++){const [label,w]=tabs[i];rect(label+' tab',x,88,w,38,i===0?C.soft:C.gray,9);text(label+' tab label',label,x+14,98,w-24,13,500,i===0?C.green:C.ink);x+=w+10;}
  text('Feed heading','For your curiosity',280,148,1000,24,600);
  card(280,206,0,'How GPUs power the AI boom: chips to companies','Science & Technology – Graphics & GPUs','Tech Explained · YouTube',1,key==='one'?'closed':'one',key==='one');
  card(664,206,1,'Why we spend: the psychology behind buying','Commerce & Business – Consumer behaviour','Money Explained · YouTube',0,null,false);
  card(1048,206,2,'How AI is changing creative work','Science & Technology – Artificial intelligence','Ideas Lab · YouTube',2,key==='two'?'closed':'two',key==='two');
  text('More ideas heading','Keep exploring',280,602,1000,22,600);
  card(280,650,3,'The patterns hidden in everyday life','Science & Technology – Mathematics','Everyday Science · YouTube',0,null,false);
  card(664,650,4,'How a story can change your mind','Arts & Humanities – Storytelling','The Story Room · YouTube',0,null,false);
  card(1048,650,5,'Where do good ideas come from?','Arts & Humanities – Creative thinking','Ideas Lab · YouTube',0,null,false);
}
function popover(x,y,names) {
  // Transparent dismissal layer models outside-click without dimming the feed.
  const outside=rect('Outside click · close related Universes',0,64,1440,1036,C.white,0);outside.fills=[{fillColor:C.white,fillOpacity:0}];go(outside,'closed');
  const p=penpot.createBoard();b.appendChild(p);p.name='Related Universe popover · '+names.length+' connections';p.x=b.x+x;p.y=b.y+y;p.resize(320,names.length===1?164:222);p.borderRadius=14;p.fills=[{fillColor:C.white}];p.strokes=[{strokeColor:C.line,strokeWidth:1,strokeStyle:'solid',strokeAlignment:'inner'}];p.shadows=[{style:'drop-shadow',offsetX:0,offsetY:8,blur:24,spread:0,color:{color:C.ink,opacity:0.14}}];
  text('Popover title','Also related to',x+20,y+17,232,17,600,C.ink,p);
  const close=rect('Close related Universes button',x+272,y+10,36,36,C.gray,8,p);const closeIcon=icon('Close related Universes',P.close,x+281,y+19,C.muted,18,p);go(close,'closed');go(closeIcon,'closed');
  text('Popover description','Other connections for this video.',x+20,y+52,280,13,400,C.muted,p);
  for(let i=0;i<names.length;i++) {
    const yy=y+88+i*58;
    rect('Related Universe row · '+names[i],x+16,yy,288,48,C.gray,9,p);
    icon('Universe icon',P.globe,x+29,yy+14,C.green,20,p);
    text('Related Universe name',names[i],x+61,yy+14,220,14,500,C.ink,p);
  }
}
const states=[['closed','01 · Collapsed count',0],['one','02 · +1 open / related Universe',1],['two','03 · +2 open / right edge',2]];
for(const [key,title,index] of states)if(makeBoard(key,title,index)) {
  feed(key);
  if(key==='one')popover(578,519,['Commerce & Business']);
  if(key==='two')popover(1080,519,['Commerce & Business','Arts & Humanities']);
}
for(const [shape,key] of links)shape.addInteraction('click',{type:'navigate-to',destination:boards[key]});
storage.topicPopoverBoards=boards;
penpot.selection=[boards.one];penpot.viewport.zoomIntoView([boards.one]);
return Object.entries(boards).map(([key,s])=>({key,id:s.id,name:s.name,x:s.x,y:s.y,width:s.width,height:s.height}));
