// Run in the connected Penpot plugin. Additive desktop history review only.
const page = penpotUtils.getPageByName('curiosity-desktop-universe');
if (!page) throw new Error('Connect the desktop Universe file.');
await penpot.openPage(page);
const source = page.root.children.find(s => s.getPluginData('universe-review-key') === 'd-watch');
if (!source) throw new Error('Existing desktop watch screen required.');
const images = penpotUtils.findShapes(s => s.fills?.some(f => f.fillImage), source).map(s => s.fills.find(f => f.fillImage));
const shortsSource = page.root.children.find(s => s.getPluginData('universe-review-key') === 'd-shorts');
const portrait = penpotUtils.findShapes(s => s.fills?.some(f => f.fillImage), shortsSource).map(s => s.fills.find(f => f.fillImage))[0] || images[0];
const C = {ink:'#17221D',muted:'#627169',green:'#176B4C',soft:'#EAF4EE',line:'#E3E9E5',gray:'#F4F6F4',white:'#FFFFFF'};
const boards = {};
const pending = [];
const old = page.root.children.filter(s => s.type === 'board' && !s.getPluginData('watch-history-review'));
const top = Math.max(...old.map(s => s.y+s.height))+180;
let b;
function rect(name,x,y,w,h,color=C.white,r=10,parent=b) {
  const s=penpot.createRectangle();parent.appendChild(s);s.name=name;s.x=b.x+x;s.y=b.y+y;s.resize(w,h);s.borderRadius=r;s.fills=[{fillColor:color}];return s;
}
function text(name,value,x,y,w,size=16,weight=400,color=C.ink,parent=b) {
  const s=penpot.createText(value);parent.appendChild(s);s.name=name;s.x=b.x+x;s.y=b.y+y;s.fontId='gfont-roboto';s.fontFamily='Roboto';s.fontWeight=String(weight);s.fontSize=String(size);s.lineHeight='1.5';s.fills=[{fillColor:color}];s.resize(w,size*1.5);s.growType='auto-height';return s;
}
function icon(name,path,x,y,color=C.white,size=20,parent=b) {
  const s=penpot.createShapeFromSvg(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`);parent.appendChild(s);s.name=name;s.x=b.x+x;s.y=b.y+y;s.resize(size,size);return s;
}
function link(s,key) {pending.push([s,key]);}
function button(label,x,y,w,key,primary=true,parent=b) {
  const s=rect(label+' action',x,y,w,44,primary?C.green:C.soft,10,parent);
  const t=text(label+' label',label,x+16,y+11,w-32,14,500,primary?C.white:C.green,parent);
  if(key){link(s,key);link(t,key);}return s;
}
function photo(name,x,y,w,h,fill,parent=b) {const s=rect(name,x,y,w,h,C.gray,10,parent);s.fills=[fill];return s;}
function board(key,title,index) {
  const existing=page.root.children.find(s=>s.getPluginData('watch-history-review')===key);
  if(existing){boards[key]=existing;return false;}
  b=penpot.createBoard();b.name='Watch history · '+title;b.x=index*1560;b.y=top;b.resize(1440,1100);b.fills=[{fillColor:C.white}];b.clipContent=true;b.setPluginData('watch-history-review',key);boards[key]=b;
  const shell=source.children.filter(s=>s.y+s.height<=source.y+84 || s.x+s.width<=source.x+232.1);
  for(const child of shell){
    const c=child.clone();b.appendChild(c);c.x=b.x+child.x-source.x;c.y=b.y+child.y-source.y;
    for(const d of [c,...penpotUtils.findShapes(()=>true,c)]) for(const i of [...(d.interactions||[])]) i.remove();
    if(c.name==='Sidebar') c.resize(232,1036);
    if(c.name.endsWith(' navigation')) c.fills=[{fillColor:c.name==='Continue watching navigation'?C.soft:C.white}];
    if(c.type==='text' && c.characters==='Continue watching'){c.characters='Watch history';c.name='Watch history navigation label';c.fills=[{fillColor:C.green}];c.fontWeight='500';link(c,'all');}
    if(c.name==='Continue watching navigation'){c.name='Watch history navigation';link(c,'all');}
  }
  return true;
}
function row(y,short,completed=false) {
  const r=penpot.createBoard();b.appendChild(r);r.name=short?'History card · unfinished Short':completed?'History card · completed video':'History card · unfinished long video';r.x=b.x+280;r.y=b.y+y;r.resize(1100,166);r.fills=[{fillColor:C.white}];r.borderRadius=14;r.strokes=[{strokeColor:C.line,strokeWidth:1,strokeStyle:'solid',strokeAlignment:'inner'}];
  rect('Thumbnail background',296,y+14,240,135,C.gray,8,r);
  const thumb=photo(short?'Short thumbnail · portrait':'Video thumbnail',short?378:296,y+14,short?76:240,135,short?portrait:images[completed?1:0],r);if(!completed) link(thumb,short?'short':'long');
  if(!short){rect('Duration badge',484,y+119,44,22,C.ink,4,r);text('Duration',completed?'8:16':'6:24',489,y+121,37,11,500,C.white,r);}
  rect('Playback progress track',296,y+145,240,4,C.line,2,r);rect('Saved playback progress',296,y+145,completed?240:short?106:86,4,completed?C.muted:C.green,2,r);
  text('History video title',short?'Why do GPUs have so many cores?':completed?'How computers learn from examples':'How GPUs work: a visual explanation',560,y+18,560,20,600,C.ink,r);
  text('Universe and topic',completed?'Science & Technology – Artificial intelligence':'Science & Technology – Graphics & GPUs',560,y+56,560,13,500,C.green,r);
  text('Creator and format',short?'Tech Explained · Short · 0:45':completed?'Computing Lab · Video · 8:16':'Tech Explained · Video · 6:24',560,y+84,560,13,400,C.muted,r);
  text('Playback status',completed?'Watched · Yesterday':short?'Watched 0:20 of 0:45 · 0:25 left':'Watched 2:18 of 6:24 · 4:06 left',560,y+119,560,13,400,C.muted,r);
  button(completed?'Watch again':short?'Resume · 00:20':'Resume · 02:18',1164,y+58,192,completed?null:short?'short':'long',!completed,r);
}
if(board('all','01 · All videos / Resume actions',0)) {
  text('Page title','Watch history',280,108,900,30,600);
  text('Page description','Your watched videos and Shorts, all in one place.',280,159,1000,16,400,C.muted);
  text('Resume explanation','Resume picks up where you stopped. Finished videos are ready to watch again.',280,198,1060,14,400,C.muted);
  text('Today heading','Today',280,258,1000,19,600);row(300,false);row(490,true);
  text('Yesterday heading','Yesterday',280,706,1000,19,600);row(748,false,true);
}
if(board('long','02 · Resume a video / saved position',1)) {
  button('← Watch history',280,104,174,'all',false);
  text('Video resume confirmation','Picking up where you left off',480,115,800,15,500,C.green);
  photo('Resumed video · illustrative player',280,186,704,396,images[0]);
  rect('Official player controls',280,538,704,44,C.ink,0);
  icon('Pause', '<path d="M8 5v14M16 5v14"/>',298,550);
  text('Saved playback time','2:18 / 6:24',338,551,300,13,500,C.white);
  rect('Player timeline',298,535,666,3,C.line,0);rect('Player progress',298,535,239,3,C.green,0);
  text('Video title','How GPUs work: a visual explanation',280,610,704,24,600);
  text('Universe label','Science & Technology – Graphics & GPUs',280,654,704,14,500,C.green);
  text('Creator','Tech Explained · YouTube',280,688,704,14,400,C.muted);
  rect('Teacher panel',1012,186,368,396,C.gray,16);
  text('Teacher heading','Ask your teacher',1036,212,320,22,600);
  text('Teacher context','About: How GPUs work',1036,258,320,14,400,C.muted);
  text('Teacher prompt','Want a quick recap before you continue?',1036,317,310,18,500);
  rect('Question field',1036,432,320,106,C.white,12);text('Question placeholder','Ask about this video…',1052,448,285,16,400,C.muted);
  text('No separate resume step','Playback resumes at 02:18. Use the player controls to pause or seek.',280,748,704,15,400,C.muted);
}
if(board('short','03 · Resume a Short / clean feed',2)) {
  button('← Watch history',280,104,174,'all',false);
  text('Short resume confirmation','Picking up where you left off',480,115,800,15,500,C.green);
  photo('Resumed Short · portrait player',444,190,292,520,portrait);
  rect('Official Short controls',444,666,292,44,C.ink,0);icon('Pause','<path d="M8 5v14M16 5v14"/>',461,678);text('Short saved playback time','0:20 / 0:45',502,678,180,13,500,C.white);
  rect('Short timeline',456,663,268,3,C.line,0);rect('Short saved progress',456,663,119,3,C.green,0);
  text('Short format','SHORT',804,207,540,12,600,C.green);
  text('Short title','Why do GPUs have so many cores?',804,246,500,28,600);
  text('Short subject','Science & Technology – Graphics & GPUs',804,356,500,14,500,C.green);
  text('Short creator','Tech Explained · YouTube · 0:45',804,393,500,14,400,C.muted);
  text('Resume behavior','Resumed at 00:20',804,462,500,20,600);
  text('Short playback help','Keep watching from your saved position. Scroll for the next Short.',804,505,490,16,400,C.muted);
  button('Ask about this Short',804,600,206,null,false);
}
for(const [shape,key] of pending) shape.addInteraction('click',{type:'navigate-to',destination:boards[key]});
penpot.selection=[boards.all];
storage.historyBoards=boards;
return Object.entries(boards).map(([key,s])=>({key,id:s.id,name:s.name,x:s.x,y:s.y,width:s.width,height:s.height}));
