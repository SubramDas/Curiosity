// Run once through Penpot execute_code. Desktop Universe review only.
const page=penpotUtils.getPageByName('curiosity-desktop-universe');
if(!page)throw new Error('Desktop Universe page is not connected.');
await penpot.openPage(page);
if(page.getPluginData('desktop-label-review')==='complete')throw new Error('This review is already applied; inspect before editing again.');
await penpot.currentFile.saveVersion('Curiosity — before desktop label and resume review');
const boards=page.root.children.filter(s=>s.getPluginData('universe-review-key'));
storage.desktopReviewBefore={};
let moved=0;
for(const board of boards){
 if(board.getPluginData('universe-review-key')==='d-shorts')continue;
 const texts=penpotUtils.findShapes(s=>s.type==='text',board);
 const photos=penpotUtils.findShapes(s=>s.name==='Illustrative thumbnail',board);
 const rectangles=penpotUtils.findShapes(s=>s.type==='rectangle',board);
 for(const photo of photos.filter(s=>s.width<500&&s.width>250)){
  const label=texts.find(s=>s.characters.includes(' – ')&&Math.abs(s.x-photo.x)<1&&Math.abs(s.y-(photo.y-38))<1);
  const bottom=photo.y+photo.height;
  const title=texts.find(s=>Math.abs(s.x-photo.x)<1&&s.y>bottom&&s.y<bottom+35);
  const creator=texts.find(s=>s.characters.endsWith(' · YouTube')&&Math.abs(s.x-photo.x)<1&&s.y>bottom&&s.y<bottom+110);
  if(!title||!creator)throw new Error('Video metadata not found on '+board.name);
  const related=texts.find(s=>s.characters.startsWith('Also related to')&&Math.abs(s.x-photo.x)<1&&s.y>bottom&&s.y<bottom+130);
  const badge=rectangles.find(s=>s.name==='Duration badge'&&Math.abs(s.y-(bottom-28))<1&&Math.abs(s.x-(photo.x+photo.width-56))<1);
  const duration=texts.find(s=>Math.abs(s.y-(bottom-25))<1&&Math.abs(s.x-(photo.x+photo.width-51))<1);
  photo.y-=38;if(badge)badge.y-=38;if(duration)duration.y-=38;title.y-=38;
  title.resize(title.width,44);title.growType='fixed';
  if(label){label.y=title.y+50;label.resize(label.width,20);label.growType='fixed';creator.y=label.y+26;moved++;}
  else creator.y=title.y+50;
  if(related)related.y=creator.y+23;
 }
 if(board.getPluginData('universe-review-key')==='d-watch'){
  const player=photos.find(s=>s.width>500);
  const bottom=player.y+player.height;
  const title=texts.find(s=>Math.abs(s.x-player.x)<1&&s.y>bottom&&s.y<bottom+50);
  const creator=texts.find(s=>s.characters==='Tech Explained · YouTube'&&s.y>bottom);
  const label=texts.find(s=>s.characters==='Science & Technology – Graphics & GPUs');
  label.y=title.y+40;label.resize(player.width,20);label.growType='fixed';creator.y=label.y+28;
  board.setPluginData('playback-design','Normal card click opens official player at last saved position; no separate app Resume button.');moved++;
 }
}
for(const key of ['d-home','d-science','d-search']){
 const board=boards.find(s=>s.getPluginData('universe-review-key')===key);
 const photo=penpotUtils.findShapes(s=>s.name==='Illustrative thumbnail'&&s.width===370,board)[0];
 const add=(name,w,color)=>{const s=penpot.createRectangle();board.appendChild(s);s.name=name;s.resize(w,3);s.x=photo.x;s.y=photo.y+photo.height-3;s.fills=[{fillColor:color}];return s;};
 add('Playback progress track',photo.width,'#E3E9E5');add('Playback progress / saved at 2:18',photo.width*(138/384),'#176B4C');
 photo.setPluginData('playback-design','Click video normally; continue from saved 2:18 of 6:24. No extra app Resume button.');
}
page.setPluginData('desktop-label-review','complete');
const validation=penpot.currentFile.validate();if(validation.length)throw new Error(JSON.stringify(validation));
const version='Curiosity — Desktop Universe labels and seamless resume';
await penpot.currentFile.saveVersion(version);
penpot.viewport.zoomIntoView([boards.find(s=>s.getPluginData('universe-review-key')==='d-home')]);
return {pageId:page.id,pageName:page.name,labelsMoved:moved,savedVersion:version,validationErrors:validation};
