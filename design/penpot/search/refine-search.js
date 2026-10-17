// Apply only to the recorded Search review; preserves earlier project pages.
const review=storage.searchDesign;
if(!review||penpot.currentFile.id!==review.fileId)throw Error('Search review is not connected.');
for(const info of review.pages){
  await penpot.openPage(info.id);const page=penpot.currentPage,m=info.name.endsWith('Mobile');
  const records=review.boards.filter(r=>r.pageId===page.id),find=state=>page.getShapeById(records.find(r=>r.state===state).id);
  const rewire=(s,to)=>{for(const old of [...s.interactions])s.removeInteraction(old);s.addInteraction('click',{type:'navigate-to',destination:to});};
  const replace=(b,old,next)=>{for(const t of b.children.filter(s=>s.type==='text'&&s.characters===old))t.characters=next;};
  const titles={8:['Football rules: a beginner’s guide','Offside, explained simply','Fouls and free kicks explained'],9:['Why surprise makes us laugh','The psychology of a good joke','How humor connects people'],10:['How comedians use timing','Build a joke: setup and surprise','Practice the pause before a punchline']};
  // Make a result destination for each football choice.
  for(const [state,title,query,cards] of [[11,'Understand football tactics','Football tactics for beginners',['Football formations, explained','How pressing works','Why positioning matters']],[12,'Explore football history','The history of football',['How modern football began','How the rules evolved','The story of the World Cup']]]){
    let b=page.root.children.find(s=>s.name==='Search · '+(state+1)+' · '+title);
    if(!b){b=find(8).clone();b.name='Search · '+(state+1)+' · '+title;b.x=m?(state-8)*470:(state-11)*1560;b.y=m?2160:5600;
      replace(b,'Football rules for beginners',query);replace(b,'Learn the rules of football',title);titles[8].forEach((old,j)=>replace(b,old,cards[j]));
      const record={id:b.id,name:b.name,pageId:page.id,mobile:m,state,width:b.width,height:b.height};review.boards.push(record);records.push(record);
    }
  }
  // Explain the selected learning goal without showing unrelated GPU thumbnails.
  for(const r of records.filter(r=>r.state>=8)){
    const b=page.getShapeById(r.id);
    for(const s of b.children.filter(s=>s.name.startsWith('Individual video thumbnail'))){
      const football=[8,11,12].includes(r.state),x=s.x-b.x,y=s.y-b.y,w=s.width,h=s.height;
      s.fills=[{fillColor:football?'#EAF4EE':'#F2EEFA',fillOpacity:1}];
      const art=penpot.createShapeFromSvg(football?'<svg xmlns="http://www.w3.org/2000/svg" width="140" height="100" viewBox="0 0 140 100"><rect x="4" y="4" width="132" height="92" rx="8" fill="none" stroke="#176B4C" stroke-width="2"/><path d="M70 4v92M4 29h20v42H4m132-42h-20v42h20" fill="none" stroke="#176B4C" stroke-width="2"/><circle cx="70" cy="50" r="18" fill="none" stroke="#176B4C" stroke-width="2"/><circle cx="44" cy="30" r="6" fill="#176B4C"/><circle cx="96" cy="70" r="6" fill="#176B4C"/><path d="M52 33l32 27" stroke="#176B4C" stroke-width="2" stroke-dasharray="4 4"/></svg>':'<svg xmlns="http://www.w3.org/2000/svg" width="140" height="100" viewBox="0 0 140 100"><path d="M20 12h100v60H70L48 90V72H20z" fill="none" stroke="#78609B" stroke-width="3"/><circle cx="51" cy="36" r="4" fill="#78609B"/><circle cx="89" cy="36" r="4" fill="#78609B"/><path d="M48 49q22 24 44 0" fill="none" stroke="#78609B" stroke-width="3"/></svg>');
      art.name=football?'Football / editable vector illustration':'Humor / editable vector illustration';b.appendChild(art);art.x=b.x+x+(w-140)/2;art.y=b.y+y+(h-100)/2;
    }
    replace(b,'Illustrative creator · YouTube','Example video · YouTube');
    if(m){const header=b.children.find(s=>s.name==='How GPUs work — funny explanations');if(header&&header.characters.length>36){header.fontSize='14';header.resize(286,38);header.y=b.y+86;}}
  }
  for(const r of records){
    const b=page.getShapeById(r.id);
    for(const s of b.children){
      const n=s.name;
      if(n==='Change search'||n==='Change search / button'||n==='Back to search'||n==='Back to search / button'||n==='Something else'||n==='Something else / button')rewire(s,find(0));
      if(r.state===2){if(n.startsWith('Understand tactics')||n==='→'&&Math.abs(s.y-b.y-(m?483:481))<10)rewire(s,find(11));if(n.startsWith('Explore football history')||n==='→'&&Math.abs(s.y-b.y-(m?583:581))<10)rewire(s,find(12));}
      if(r.state===7&&(n.startsWith('How GPUs work')||n==='→'&&s.y-b.y>500))rewire(s,find(5));
    }
    // Add an explicit in-context home path for the review.
    const brand=b.children.find(s=>s.type==='text'&&s.characters==='curiosity');if(brand)rewire(brand,find(0));
  }
  if(!m&&!review.components){
    const b=find(4),names=['Find learning videos / button','Find learning videos'];
    const c=penpot.library.local.createComponent(b.children.filter(s=>names.includes(s.name)));c.name='Search / Primary action';review.components=[{id:c.id,name:c.name}];
  }
}
return {pages:review.pages,boards:review.boards.length,components:review.components};
