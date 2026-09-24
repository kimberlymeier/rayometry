/* Physical scale and measuring aids. These never change the traced rays. */
(function(root){
  'use strict';
  const P=root.Optics,mmPerUnit=.2,gridStep=25;
  const mm=distance=>distance*mmPerUnit;
  function distance(a,b){return mm(P.length(P.sub(b,a)));}
  function setRadius(s,radiusMM){
    if(s.block.shape!=='semicircle'||!Number.isFinite(radiusMM))return false;
    const h=P.curvedGeometry(s.block).halfHeight,r=radiusMM/mmPerUnit;
    const max=(h*h+(h/5)**2)/(2*h/5);
    if(r<h||r>max)return false;
    // Stable sag formula, avoiding subtraction of almost equal quantities.
    return root.BenchScene.setCurveDepth(s,h*h/(r+Math.sqrt(Math.max(0,r*r-h*h))));
  }
  function extensions(s,paths){
    if(s.block.shape!=='semicircle')return [];
    return paths.flatMap(path=>{
      const [entry,exit]=path.events;
      if(path.events.length!==2||entry.face!=='arc'||exit.face!=='flat'||entry.tir||exit.tir||entry.critical||exit.critical)return [];
      return [{from:exit.point,to:P.add(exit.point,P.mul(entry.direction,P.edgeDistance(exit.point,entry.direction,s))),direction:entry.direction}];
    });
  }
  function crossings(lines,s,label){
    const out=[],cross=(a,b)=>a.x*b.y-a.y*b.x;
    for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++){
      const a=lines[i],b=lines[j],den=cross(a.direction,b.direction);if(Math.abs(den)<1e-10)continue;
      const delta=P.sub(b.from,a.from),t=cross(delta,b.direction)/den,u=cross(delta,a.direction)/den;
      const point=P.add(a.from,P.mul(a.direction,t));
      if(t>=0&&u>=0&&point.x>=0&&point.x<=s.width&&point.y>=0&&point.y<=s.height&&!out.some(p=>P.length(P.sub(p,point))<1e-5))out.push({...point,label});
    }
    return out;
  }
  function targets(s,paths){
    const out=[];
    if(s.block.shape==='semicircle'){
      const g=P.curvedGeometry(s.block);
      out.push({...P.add(s.block,P.rotate(g.center,s.block.angle)),label:'C'},
        {...P.add(s.block,P.rotate({x:g.sag,y:0},s.block.angle)),label:'A'});
    }
    paths.forEach(path=>path.events.forEach(e=>out.push({...e.point,label:'Surface hit'})));
    const outgoing=paths.flatMap(path=>{
      const e=path.events[path.events.length-1];
      return e&&!e.tir&&!e.critical&&!path.warning?[{from:e.point,direction:e.direction}]:[];
    });
    out.push(...crossings(outgoing,s,'Ray crossing'));
    if(s.extensions)out.push(...crossings(extensions(s,paths),s,'Extended-ray crossing'));
    return out.filter(p=>p.x>=0&&p.x<=s.width&&p.y>=0&&p.y<=s.height);
  }
  function snap(point,s,paths){
    const clamped={x:Math.max(0,Math.min(s.width,point.x)),y:Math.max(0,Math.min(s.height,point.y))};
    if(!s.ruler.snap)return clamped;
    const nearest=targets(s,paths).sort((a,b)=>P.length(P.sub(a,clamped))-P.length(P.sub(b,clamped)))[0];
    return nearest&&P.length(P.sub(nearest,clamped))<=12?{...nearest}:clamped;
  }
  root.BenchMeasurements={mmPerUnit,gridStep,mm,distance,setRadius,extensions,targets,snap};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.BenchMeasurements;
})(typeof globalThis!=='undefined'?globalThis:this);
