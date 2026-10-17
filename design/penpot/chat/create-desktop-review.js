// Run only in the connected Penpot plugin. Adds review boards without editing
// existing Universe screens. Namespaced keys make partial runs resumable.
const page = penpotUtils.getPageByName('curiosity-desktop-universe');
if (!page) throw new Error('Connect the file containing curiosity-desktop-universe.');
await penpot.openPage(page);
const source = page.root.children.find(s => s.getPluginData('universe-review-key') === 'd-watch');
if (!source) throw new Error('The existing desktop Watch board is required.');
const images = penpotUtils.findShapes(s => s.fills?.some(f => f.fillImage), source).map(s => s.fills.find(f => f.fillImage));
if (images.length < 2) throw new Error('The existing illustrative thumbnails are required.');
const keys = ['answer','long','videos','expanded','history'];
const existing = page.root.children.filter(s => s.getPluginData('chat-readability-review'));
const boards = Object.fromEntries(existing.map(s => [s.getPluginData('chat-readability-review'),s]));
const oldBoards = page.root.children.filter(s => s.type === 'board' && !s.getPluginData('chat-readability-review'));
const startY = Math.max(...oldBoards.map(s => s.y + s.height)) + 180;
if (!existing.length) await penpot.currentFile.saveVersion('Curiosity — before desktop chat readability review');
const C = {ink:'#17221D',muted:'#627169',green:'#176B4C',soft:'#EAF4EE',line:'#E3E9E5',gray:'#F4F6F4',white:'#FFFFFF'};
let b, target;
const links = [];
storage.chatPendingLinks ??= [];
function rect(name,x,y,w,h,color=C.white,r=10,parent=target){
  const s=penpot.createRectangle();parent.appendChild(s);s.name=name;s.x=b.x+x;s.y=b.y+y;s.resize(w,h);s.borderRadius=r;s.fills=[{fillColor:color}];return s;
}
function text(name,value,x,y,w,size=16,weight=400,color=C.ink,line=1.55,parent=target){
  const s=penpot.createText(value);parent.appendChild(s);s.name=name;s.x=b.x+x;s.y=b.y+y;s.fontId='gfont-roboto';s.fontFamily='Roboto';s.fontWeight=String(weight);s.fontSize=String(size);s.lineHeight=String(line);s.fills=[{fillColor:color}];s.resize(w,size*line);s.growType='auto-height';return s;
}
function icon(name,path,x,y,color=C.green,size=20,parent=target){
  const s=penpot.createShapeFromSvg(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`);parent.appendChild(s);s.name=name;s.x=b.x+x;s.y=b.y+y;s.resize(size,size);return s;
}
const P={expand:'<path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5"/>',back:'<path d="m9 6-6 6 6 6M3 12h17"/>',send:'<path d="m3 3 19 9-19 9 4-9-4-9ZM7 12h15"/>',play:'<path d="m8 5 11 7-11 7Z"/>',down:'<path d="M12 4v16m-6-6 6 6 6-6"/>',pause:'<path d="M8 5v14M16 5v14"/>',copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v13h5"/>'};
function button(label,x,y,w,key,soft=true,parent=target){const r=rect(label+' button',x,y,w,34,soft?C.soft:C.green,8,parent);text(label+' label',label,x+12,y+7,w-24,13,500,soft?C.green:C.white,1.3,parent);if(key)links.push([r,key]);return r;}
function photo(name,x,y,w,h,index=0,parent=target){const r=rect(name,x,y,w,h,C.gray,8,parent);r.fills=[images[index%images.length]];return r;}
function makeBoard(key,title,index){
 b=penpot.createBoard();b.name='Chat · '+title;b.x=(index%3)*1560;b.y=startY+Math.floor(index/3)*1220;b.resize(1440,1100);b.fills=[{fillColor:C.white}];b.clipContent=true;b.setPluginData('chat-readability-review',key);boards[key]=b;target=b;
 const shell=source.children.filter(s=>s.y+s.height<=source.y+84||s.x+s.width<=source.x+232.1);
 for(const child of shell){const c=child.clone();b.appendChild(c);c.x=b.x+child.x-source.x;c.y=b.y+child.y-source.y;if(c.name==='Sidebar')c.resize(232,1036);}
 return b;
}
function videoArea(){
 target=b;
 photo('Selected video · illustrative player',256,108,680,383,0);
 rect('Official player controls',256,451,680,40,C.ink,0);icon('Pause',P.pause,272,460,C.white,20);text('Player time','2:18 / 6:24',310,462,180,12,400,C.white,1.3);
 text('Video title','How GPUs work: a visual explanation',256,514,680,23,600);
 text('Video classification','Science & Technology – Graphics & GPUs',256,555,680,14,500,C.green);
 text('Video creator','Tech Explained · YouTube',256,585,680,14,400,C.muted);
 button('Explain this part · 02:18',256,626,230,'answer');
 text('Related videos heading','Keep exploring',256,702,650,22,600);
 photo('Related video thumbnail',256,750,326,183,1);
 text('Related video title','How computers learn from examples',256,948,326,16,600);
 text('Related video subject','Science & Technology – Artificial intelligence',256,1001,326,13,500,C.green);
 text('Related video creator','Computing Lab · 8:16',256,1030,326,13,400,C.muted);
}
function panel(expanded=false){
 const x=expanded?520:960,w=expanded?896:456;
 const frame=penpot.createBoard();b.appendChild(frame);frame.name=expanded?'Expanded teacher panel':'Teacher panel · wider reading space';frame.x=b.x+x;frame.y=b.y+108;frame.resize(w,960);frame.borderRadius=16;frame.fills=[{fillColor:C.white}];frame.strokes=[{strokeColor:C.line,strokeWidth:1,strokeStyle:'solid',strokeAlignment:'inner'}];frame.clipContent=true;target=frame;
 text('Teacher title','Ask your teacher',x+24,130,w-200,22,600);
 if(expanded){button('Back to video',x+w-154,126,130,'videos');}else{button('Expand',x+w-108,126,84,'expanded');}
 text('Current video context','About: How GPUs work',x+24,168,w-48,13,400,C.muted);
 rect('Panel header divider',x,204,w,1,C.line,0);
 // This native clipped board defines the scrollable conversation viewport.
 const viewport=penpot.createBoard();frame.appendChild(viewport);viewport.name='Conversation viewport · scroll only this area';viewport.x=b.x+x;viewport.y=b.y+218;viewport.resize(w,620);viewport.fills=[];viewport.clipContent=true;target=viewport;
 return {x,w,frame,viewport};
}
function composer(p){
 target=p.frame;const x=p.x,w=p.w;
 rect('Composer divider',x,852,w,1,C.line,0);
 button('Explain simply',x+24,871,130,'answer');button('Example',x+164,871,94,'answer');button('Go deeper',x+268,871,108,'long');
 const box=rect('Fixed follow-up input',x+24,922,w-48,90,C.gray,12);text('Follow-up placeholder','Ask a follow-up…',x+40,938,w-128,16,400,C.muted);
 const send=rect('Send question button',x+w-80,944,40,40,C.green,10);icon('Send',P.send,x+w-70,954,C.white);
 text('AI note','AI can make mistakes. Check important details.',x+24,1030,w-48,12,400,C.muted);
}
function question(p,value){rect('Your question bubble',p.x+24,232,p.w-48,94,C.gray,12);text('You label','YOU',p.x+40,243,p.w-80,11,600,C.muted);text('Your question',value,p.x+40,265,p.w-80,16,500,C.ink,1.5);text('Teacher response label','TEACHER · ABOUT THIS VIDEO',p.x+24,347,p.w-48,11,600,C.green);}
function simpleAnswer(p){
 question(p,'Why can a GPU do so much work at once?');
 text('Answer heading','Many small jobs, done together.',p.x+24,380,p.w-64,20,600,C.ink,1.4);
 text('Answer introduction','A GPU has many processing units. They can work on similar tasks at the same time.',p.x+24,449,p.w-70,16,400,C.ink,1.6);
 text('CPU point','CPU: a few flexible workers handling complex tasks.',p.x+24,548,p.w-70,16,500,C.ink,1.6);
 text('GPU point','GPU: many workers handling smaller, similar tasks.',p.x+24,624,p.w-70,16,500,C.ink,1.6);
 text('Concrete example','For an image, each worker can help calculate a different group of pixels.',p.x+24,700,p.w-70,16,400,C.ink,1.6);
 button('Watch this part · 02:18',p.x+24,787,218,'answer');
}
function longAnswer(p){
 question(p,'Explain parallel processing with an example.');
 text('Answer heading','Think of a team colouring a picture.',p.x+24,380,p.w-70,20,600,C.ink,1.4);
 text('Answer introduction','One person could colour every pixel. A large team can split the picture into smaller pieces.',p.x+24,451,p.w-70,16,400,C.ink,1.6);
 text('Section one','1. Split the work',p.x+24,557,p.w-70,18,600);
 text('Section one explanation','The program divides a large job into many small tasks that can run together.',p.x+24,594,p.w-70,16,400,C.ink,1.6);
 text('Section two','2. Run similar tasks together',p.x+24,696,p.w-70,18,600);
 text('Section two explanation','Each GPU worker performs the same kind of calculation on different data.',p.x+24,733,p.w-70,16,400,C.ink,1.6);
 rect('Conversation scroll track',p.x+p.w-12,236,4,584,C.gray,2);rect('Scroll thumb · start of new answer',p.x+p.w-12,236,4,154,C.muted,2);
 text('Remaining answer section','3. Bring the results together',p.x+24,840,p.w-70,18,600);
}
function videoCard(p,y,index,title,creator,duration){
 const x=p.x+24,w=p.w-48;
 rect('Suggested video card',x,y,w,132,C.gray,12);photo('Suggestion thumbnail · '+title,x+12,y+12,116,70,index);
 rect('Duration background',x+82,y+62,38,18,C.ink,4);text('Video duration',duration,x+85,y+64,32,10,500,C.white,1.2);
 text('Suggestion title',title,x+142,y+12,w-156,15,600,C.ink,1.4);
 text('Suggestion creator',creator,x+142,y+64,w-156,12,400,C.muted);
 button('Watch video',x+142,y+89,116,'answer');
}
function videosAnswer(p){
 question(p,'Can you suggest a video that shows this visually?');
 text('Answer heading','See it in action.',p.x+24,380,p.w-64,20,600,C.ink,1.4);
 text('Answer introduction','These videos may help you picture how a GPU shares the work.',p.x+24,420,p.w-70,16,400,C.ink,1.6);
 button('Watch this part · 02:18',p.x+24,480,218,'answer');
 text('Suggested videos heading','Videos to explore',p.x+24,531,p.w-48,17,600);
 videoCard(p,566,0,'Parallel processing, explained','Tech Explained','6:24');
 videoCard(p,706,1,'CPU and GPU: working together','Computing Lab','8:16');
}
function expanded(){
 target=b;rect('Video companion background',256,108,240,960,C.gray,14);photo('Video stays available while expanded',268,124,216,122,0);
 text('Companion video title','How GPUs work',272,269,208,17,600);text('Companion video creator','Tech Explained',272,306,208,13,400,C.muted);text('Companion time','Paused at 02:18 / 06:24',272,339,208,13,400,C.muted);
 button('Return to video',272,385,192,'videos');text('Companion topic','Science & Technology',272,451,208,13,500,C.green);
 const p=panel(true);question(p,'Explain parallel processing with an example.');
 text('Expanded answer heading','A GPU works like a team sharing a big job.',p.x+24,380,p.w-76,24,600,C.ink,1.4);
 text('Expanded answer introduction','Imagine colouring a huge picture. One person can do every pixel in order, or a team can divide the picture into pieces and work at the same time.',p.x+24,431,p.w-94,17,400,C.ink,1.65);
 text('Expanded section heading','How that maps to a GPU',p.x+24,551,p.w-76,20,600);
 text('Expanded point one','1. Split the job into many smaller calculations.',p.x+24,596,p.w-94,17,400,C.ink,1.65);
 text('Expanded point two','2. Let many processing units work on similar calculations together.',p.x+24,640,p.w-94,17,400,C.ink,1.65);
 text('Expanded point three','3. Combine those results to build the final image.',p.x+24,684,p.w-94,17,400,C.ink,1.65);
 rect('Expanded answer takeaway',p.x+24,744,p.w-48,76,C.soft,10);text('Takeaway','A GPU is fast when a problem has lots of similar work that can happen in parallel.',p.x+40,760,p.w-80,17,500,C.green,1.5);
 composer(p);
}
function history(p){
 question(p,'How is a CPU different from a GPU?');
 text('Earlier response label','EARLIER IN THIS CONVERSATION',p.x+24,380,p.w-48,11,600,C.muted);
 text('Earlier answer heading','Different tools for different jobs.',p.x+24,416,p.w-70,20,600,C.ink,1.4);
 text('Earlier answer text','A CPU is built for flexible, varied tasks. A GPU is built for large amounts of similar work.',p.x+24,491,p.w-70,16,400,C.ink,1.6);
 text('Earlier answer example','A game might use the CPU for logic and the GPU to draw the scene.',p.x+24,599,p.w-70,16,400,C.ink,1.6);
 button('1 new answer ↓',p.x+122,780,190,'answer');
 rect('History scroll track',p.x+p.w-12,236,4,584,C.gray,2);rect('Scroll thumb · reading earlier messages',p.x+p.w-12,348,4,140,C.muted,2);
}
const titles=['01 · Readable answer','02 · Long answer / start visible','03 · Suggestions with thumbnails','04 · Expanded chat / video companion','05 · Reading history / new answer'];
for(let i=0;i<keys.length;i++){
 const key=keys[i];if(boards[key]||(storage.chatRunKeys&&!storage.chatRunKeys.includes(key)))continue;
 makeBoard(key,titles[i],i);
 if(key==='expanded'){expanded();continue;}
 videoArea();const p=panel();
 if(key==='answer')simpleAnswer(p);
 if(key==='long')longAnswer(p);
 if(key==='videos')videosAnswer(p);
 if(key==='history')history(p);
 composer(p);
}
storage.chatPendingLinks.push(...links);
storage.chatPendingLinks=storage.chatPendingLinks.filter(([shape,key])=>{if(!boards[key])return true;shape.addInteraction('click',{type:'navigate-to',destination:boards[key]});return false;});
storage.chatReadabilityBoards=boards;
return {fileId:penpot.currentFile.id,pageId:page.id,boards:Object.entries(boards).map(([key,s])=>({key,id:s.id,name:s.name,bounds:s.bounds}))};
