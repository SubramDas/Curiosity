// Run through the connected Penpot MCP execute_code tool, not in the app.
// Creates new Search pages only; refuses to overwrite a previous review.
if (penpot.currentFile?.id !== '129977ce-683b-806a-8008-c8f2a3fe903e') throw Error('Connect New File 1 first.');
if (penpotUtils.getPageByName('Curiosity — Search · Desktop')?.root.children.length) throw Error('Search review already exists. Inspect it before continuing.');
const desktopSource = penpotUtils.findShapeById('c5f19b81-2139-8092-8008-ca1dc3e5adb9');
const mobileSource = penpotUtils.findShapeById('c5f19b81-2139-8092-8008-ca1ddef87b83');
const photos = penpotUtils.findShapes(s => s.fills?.some?.(f => f.fillImage), desktopSource);
const C = { ink:'#17221D', muted:'#627169', green:'#176B4C', pale:'#EAF4EE', line:'#DEE6E0', gray:'#F4F6F5', white:'#FFFFFF', amber:'#80551D', warm:'#FFF7E9' };
// Use the exact family ID: findByName('Roboto') also matches Roboto Mono.
const states = ['Start a search','Checking your search','Choose a learning angle','Entertainment redirect','Clarify your learning goal','Learning results','No suitable results','Search check unavailable'];
const queries = ['Search something you want to learn','How GPUs work','Football','Funny videos','Funny videos','How GPUs work — funny explanations','GPU memes explained','How GPUs work'];
storage.searchDesign = { fileId:penpot.currentFile.id, pages:[], boards:[], links:[], version:1 };
const links = [], boards = {};
function rect(b,n,x,y,w,h,fill=C.white,r=12,stroke) {
  const s=penpot.createRectangle(); s.name=n;s.resize(w,h);s.x=b.x+x;s.y=b.y+y;s.fills=[{fillColor:fill,fillOpacity:1}];s.borderRadius=r;
  if(stroke)s.strokes=[{strokeColor:stroke,strokeOpacity:1,strokeWidth:1,strokeStyle:'solid',strokeAlignment:'inner'}];
  b.appendChild(s);return s;
}
function text(b,n,x,y,w,h,size=16,color=C.ink,weight='400') {
  const s=penpot.createText(n);s.fontFamily='Roboto';s.fontId='gfont-roboto';s.fontVariantId=weight==='400'?'regular':weight;s.fontWeight=weight;s.name=n;s.fontSize=String(size);s.lineHeight='1.35';s.resize(w,h);s.x=b.x+x;s.y=b.y+y;s.fills=[{fillColor:color,fillOpacity:1}];b.appendChild(s);return s;
}
function button(b,label,x,y,w,target,primary=true) {
  const bg=rect(b,label+' / button',x,y,w,48,primary?C.green:C.gray,10);
  const t=text(b,label,x+16,y+13,w-32,24,15,primary?C.white:C.ink,'500');
  if(target!==undefined)links.push({shapes:[bg,t],from:b,target});return bg;
}
function choice(b,title,subtitle,x,y,w,target) {
  const bg=rect(b,title+' / choice',x,y,w,84,C.white,12,C.line);
  const t=text(b,title,x+18,y+14,w-58,26,17,C.ink,'500');
  text(b,subtitle,x+18,y+46,w-48,25,14,C.muted);
  const arrow=text(b,'→',x+w-35,y+23,24,30,22,C.green);
  links.push({shapes:[bg,t,arrow],from:b,target});
}
function shell(page,m,i) {
  const source=m?mobileSource:desktopSource,b=penpot.createBoard();
  b.name=`Search · ${String(i+1).padStart(2,'0')} · ${states[i]}`;b.resize(m?390:1440,m?960:1000);b.x=m?(i%4)*470:(i%2)*1560;b.y=m?Math.floor(i/4)*1080:Math.floor(i/2)*1120;b.fills=[{fillColor:C.white,fillOpacity:1}];page.root.appendChild(b);
  rect(b,'Header',0,0,m?390:1440,64,C.white,0);
  rect(b,'Header divider',0,63,m?390:1440,1,C.line,0);
  text(b,'☰',m?16:24,19,28,30,23,C.ink);
  rect(b,'Brand mark',m?52:70,22,22,22,C.green,4);
  text(b,'▷',m?53:71,19,24,27,23,C.white);
  text(b,'curiosity',m?82:100,22,130,32,23,C.ink,'600');
  if(m){
    text(b,'Account',316,24,60,24,13,C.green);
    rect(b,'Bottom navigation',0,888,390,72,C.white,0);rect(b,'Bottom divider',0,888,390,1,C.line,0);
    ['Home','Shorts','Topics','Ask'].forEach((label,j)=>{text(b,['⌂','▷','◇','?'][j],24+j*98,900,45,25,22,C.muted);text(b,label,18+j*98,932,65,20,12,C.muted);});
  }else{
    rect(b,'Sidebar',0,64,232,936,C.white,0);
    const nav=[['⌂','Home',112],['✦','Explore map',160],['▷','Short videos',208],['↻','Continue watching',256]];
    for(const [icon,label,y]of nav){text(b,icon,26,y,26,28,21,C.muted);text(b,label,62,y+4,154,25,14,C.ink,'500');}
    rect(b,'Sidebar divider',20,314,192,1,C.line,0);text(b,'Your Universes',24,338,180,26,15,C.ink,'500');
    ['Science & Technology','Commerce & Business','Arts & Humanities'].forEach((label,j)=>{text(b,'◎',26,392+j*56,26,28,21,C.muted);text(b,label,58,397+j*56,158,25,13,C.ink,'500');});
    text(b,'Follow your curiosity.\nFind something to learn.',24,592,184,62,13,C.muted);rect(b,'Teacher divider',20,678,192,1,C.line,0);text(b,'Ask your teacher',26,704,190,28,14,C.ink,'500');
    rect(b,'Search field',380,10,620,44,C.gray,24);text(b,queries[i],402,23,536,26,16,i===0?C.muted:C.ink);
    const search=rect(b,'Search action',950,10,50,44,C.pale,24);text(b,'→',966,19,26,30,22,C.green);links.push({shapes:[search],from:b,target:1});
    text(b,'Sign in',1324,24,90,24,14,C.green);
    const chips=[['Trending',86],['Science & Technology',178],['Commerce & Business',180],['Arts & Humanities',160]];let tx=256;
    for(const [label,cw]of chips){rect(b,label+' filter',tx,80,cw,44,C.gray,12);text(b,label,tx+13,94,cw-24,24,13,C.ink,'500');tx+=cw+8;}
  }
  if(m){rect(b,'Search field',16,80,358,48,C.gray,24);text(b,queries[i],32,94,290,24,15,i===0?C.muted:C.ink);const a=text(b,'→',340,91,26,28,22,C.green);links.push({shapes:[a],from:b,target:1});}
  else {const action=penpotUtils.findShape(s=>s.name==='Search action',b);if(action)links.push({shapes:[action],from:b,target:1});}
  boards[(m?'m':'d')+i]=b;storage.searchDesign.boards.push({id:b.id,name:b.name,pageId:page.id,mobile:m,state:i,width:b.width,height:b.height});return b;
}
function heading(b,m,kicker,title,description) {
  const x=m?16:288,w=m?358:1040,y=m?156:166;
  text(b,kicker.toUpperCase(),x,y,w,22,12,C.green,'600');
  text(b,title,x,y+34,w,m?76:52,m?27:36,C.ink,'600');
  text(b,description,x,y+(m?118:98),w,m?66:48,16,C.muted);
}
function render(page,m,i) {
  const b=shell(page,m,i),x=m?16:288,w=m?358:1040,cy=m?360:358;
  if(i===0){
    heading(b,m,'Follow your curiosity','What would you like to learn?','Explore any subject. Find explanations, practical skills, and new ideas.');
    choice(b,'How GPUs work','Understand the technology behind the screen.',x,cy,w,1);
    choice(b,'Football','Choose rules, tactics, or history.',x,cy+100,w,2);
    choice(b,'Funny videos','See how Curiosity guides this search.',x,cy+200,w,3);
    rect(b,'Learning promise',x,cy+316,w,94,C.pale);text(b,'Learning can be fun.',x+18,cy+330,w-36,28,18,C.green,'500');text(b,'Funny explanations are welcome here.',x+18,cy+363,w-36,25,15,C.muted);
  } else if(i===1){
    heading(b,m,'Finding your direction','Finding a learning angle…','Your search is saved above. You can change it at any time.');
    rect(b,'Checking card',x,cy,w,154,C.pale);text(b,'Looking for explanations and useful skills',x+20,cy+24,w-40,60,m?18:22,C.green,'500');
    rect(b,'Progress track',x+20,cy+110,w-40,5,C.line,3);rect(b,'Progress indicator',x+20,cy+110,(w-40)*0.42,5,C.green,3);
    button(b,'Change search',x,cy+182,m?w:180,0,false);
    // Only the prototype advances automatically; this does not imply live AI.
    b.addInteraction('after-delay',{type:'navigate-to',destination:boards[(m?'m':'d')+0]},8000);
  } else if(i===2){
    heading(b,m,'Football','What would you like to learn?','Choose a direction. We’ll find videos that explain it.');
    choice(b,'Learn the rules','Offside, fouls, and how a match works.',x,cy,w,5);
    choice(b,'Understand tactics','Formations, positioning, and team strategy.',x,cy+100,w,5);
    choice(b,'Explore football history','How the game became a global sport.',x,cy+200,w,5);
    button(b,'Something else',x,cy+310,m?w:180,0,false);
  } else if(i===3){
    heading(b,m,'A different direction','Let’s find something to learn.','“Funny videos” is mainly entertainment. Try a learning angle instead.');
    choice(b,'Why do we find things funny?','Explore the psychology of humor.',x,cy,w,5);
    choice(b,'Learn to write comedy','Discover timing, surprise, and storytelling.',x,cy+100,w,5);
    button(b,'I meant a learning topic',x,cy+204,m?w:248,4,false);
    rect(b,'Break explanation',x,cy+278,w,112,C.pale);text(b,'A little fun, along the way.',x+18,cy+294,w-36,30,18,C.green,'500');text(b,'Short, topic-related breaks appear while you learn.',x+18,cy+333,w-36,56,15,C.muted);
  } else if(i===4){
    heading(b,m,'Tell us a little more','What do you want to understand?','Your original search stays above. Add a learning goal to help us find the right videos.');
    text(b,'Your learning goal',x,cy,w,26,15,C.ink,'500');rect(b,'Learning goal input',x,cy+38,w,120,C.white,12,C.line);
    text(b,'I want to understand how comedians use timing.',x+16,cy+56,w-32,76,16,C.muted);
    button(b,'Find learning videos',x,cy+182,m?w:220,5);button(b,'Back to search',x,cy+244,m?w:180,0,false);
    text(b,'Be specific: a concept, a skill, or a question.',x,cy+322,w,60,14,C.muted);
  } else if(i===5){
    heading(b,m,'Learning results','How GPUs work','Explanations with a little humor. Results from every Universe, together.');
    rect(b,'Results note',x,m?322:314,w,48,C.pale);text(b,'Focused on learning · AI filtering can make mistakes',x+14,m?336:328,w-28,26,m?12:14,C.green);
    const count=m?2:3,cw=m?w:330,start=m?390:394;
    for(let j=0;j<count;j++){
      const cx=m?x:x+j*350,yy=m?start+j*232:start;
      const imageShape=rect(b,'Individual video thumbnail '+(j+1),cx,yy,cw,m?140:180,C.gray);
      if(photos[j])imageShape.fills=photos[j].fills;
      rect(b,'Duration backing',cx+cw-60,yy+(m?108:148),48,24,C.ink,4);text(b,['6:24','4:10','8:16'][j],cx+cw-55,yy+(m?112:152),40,18,12,C.white);
      text(b,['How GPUs work: a visual explanation','Parallel processing, explained with humor','Why graphics cards need so many cores'][j],cx,yy+(m?150:194),cw,m?44:50,16,C.ink,'500');
      text(b,'Science & Technology – Graphics & GPUs',cx,yy+(m?194:250),cw,26,m?12:13,C.green);
      text(b,'Illustrative creator · YouTube',cx,yy+(m?216:280),cw,22,12,C.muted);
    }
    if(!m){text(b,'Looking for another direction?',x,740,w,30,20,C.ink,'500');button(b,'Change search',x,790,180,0,false);}
  } else if(i===6){
    heading(b,m,'No suitable results','Try a different learning angle.','We couldn’t find suitable learning videos for this search.');
    choice(b,'How GPUs render a game','Understand how an image reaches your screen.',x,cy,w,5);
    choice(b,'Why graphics glitches happen','Learn what causes unusual visual effects.',x,cy+100,w,5);
    button(b,'Change search',x,cy+208,m?w:180,0,false);
    text(b,'Funny explanations are welcome. Pure entertainment stays in topic-related breaks.',x,cy+294,w,76,15,C.muted);
  } else {
    heading(b,m,'Search paused','We couldn’t check this search.','Your search is still here. Try again, or explore a learning topic below.');
    button(b,'Try again',x,cy,m?w:160,1);button(b,'Change search',m?x:x+176,m?cy+64:cy,m?w:180,0,false);
    text(b,'Explore a learning topic',x,cy+150,w,30,20,C.ink,'500');choice(b,'How GPUs work','Return to available learning results.',x,cy+196,w,5);
  }
  return b;
}
for(const mobile of [false,true]){
  const name=mobile?'Curiosity — Search · Mobile':'Curiosity — Search · Desktop';const page=penpotUtils.getPageByName(name)??penpot.createPage();page.name=name;await penpot.openPage(page);storage.searchDesign.pages.push({id:page.id,name:page.name});
  for(let i=0;i<states.length;i++)render(page,mobile,i);
}
// Duplicate contextual results so choices retain the selected intent in the prototype.
for(const mobile of [false,true]){
  const prefix=mobile?'m':'d',page=penpotUtils.getPageById(storage.searchDesign.pages[mobile?1:0].id);await penpot.openPage(page);
  for(const [offset,query,title] of [[0,'Football rules for beginners','Learn the rules of football'],[1,'Why do we find things funny?','The psychology of humor'],[2,'How comedians use timing','Learn how comedy timing works']]){
    const source=boards[prefix+5],b=source.clone();page.root.appendChild(b);b.name='Search · '+(9+offset)+' · '+title;b.x=mobile?offset*470:offset*1560;b.y=mobile?2160:4480;
    const all=penpotUtils.findShapes(s=>s.type==='text',b);
    const replace=(old,next)=>{for(const s of all)if(s.characters===old)s.characters=next;};
    replace(queries[5],query);replace('How GPUs work',title);replace('Explanations with a little humor. Results from every Universe, together.','Videos to explore your chosen learning direction.');
    const titles=offset===0?['Football rules: a beginner’s guide','Offside, explained simply','Fouls and free kicks explained']:offset===1?['Why surprise makes us laugh','The psychology of a good joke','How humor connects people']:['How comedians use timing','Build a joke: setup and surprise','Practice the pause before a punchline'];
    ['How GPUs work: a visual explanation','Parallel processing, explained with humor','Why graphics cards need so many cores'].forEach((t,j)=>replace(t,titles[j]));
    replace('Science & Technology – Graphics & GPUs',offset===0?'Arts & Humanities – Sport & culture':offset===1?'Science & Technology – Psychology':'Arts & Humanities – Comedy');
    boards[prefix+'r'+offset]=b;storage.searchDesign.boards.push({id:b.id,name:b.name,pageId:page.id,mobile,state:8+offset,width:b.width,height:b.height});
  }
}
for(const mobile of [false,true]){
await penpot.openPage(storage.searchDesign.pages[mobile?1:0].id);
for(const l of links.filter(l=>(l.from.width===390)===mobile)){
  const m=l.from.width===390,prefix=m?'m':'d';let destination=boards[prefix+l.target];
  if(l.target===5){const label=l.shapes.find(s=>s.type==='text')?.characters??'';destination=boards[prefix+'r'+(l.from===boards[prefix+2]?0:l.from===boards[prefix+3]&&label.startsWith('Why')?1:2)];if(l.from===boards[prefix+6])destination=boards[prefix+5];}
  for(const s of l.shapes)s.addInteraction('click',{type:'navigate-to',destination});storage.searchDesign.links.push({from:l.from.id,to:destination.id});
}
}
// Checking has an explicit prototype outcome; it is not a real AI operation.
for(const prefix of ['d','m']){await penpot.openPage(storage.searchDesign.pages[prefix==='m'?1:0].id);const b=boards[prefix+1];for(const i of [...b.interactions])b.removeInteraction(i);b.addInteraction('after-delay',{type:'navigate-to',destination:boards[prefix+5]},1600);}
return storage.searchDesign;
