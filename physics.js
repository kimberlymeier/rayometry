/* Pure geometrical optics. Coordinates use x right, y down; angles are radians. */
(function (root) {
  'use strict';
  const EPS = 1e-7;
  const add = (a,b) => ({x:a.x+b.x,y:a.y+b.y});
  const sub = (a,b) => ({x:a.x-b.x,y:a.y-b.y});
  const mul = (a,s) => ({x:a.x*s,y:a.y*s});
  const dot = (a,b) => a.x*b.x+a.y*b.y;
  const length = a => Math.hypot(a.x,a.y);
  const unit = a => mul(a,1/length(a));
  const rotate = (p,a) => ({x:p.x*Math.cos(a)-p.y*Math.sin(a),y:p.x*Math.sin(a)+p.y*Math.cos(a)});
  const direction = a => ({x:Math.cos(a),y:Math.sin(a)});
  const local = (p,b) => rotate(sub(p,b),-b.angle);
  const cross=(a,b)=>a.x*b.y-a.y*b.x;
  // Vertices follow the outline in positive signed-area order (clockwise on screen).
  // Rectangles use the same polygon path as the prism presets.
  function vertices(b){return b.vertices||[
    {x:-b.width/2,y:-b.height/2},{x:b.width/2,y:-b.height/2},
    {x:b.width/2,y:b.height/2},{x:-b.width/2,y:b.height/2}
  ];}
  function curvedGeometry(b){
    const halfHeight=b.halfHeight??b.radius,sag=b.sag??halfHeight;
    const radius=(halfHeight*halfHeight+sag*sag)/(2*sag);
    return {halfHeight,sag,radius,center:{x:sag-radius,y:0}};
  }
  function worldVertices(b){
    if(b.shape==='semicircle'){
      const g=curvedGeometry(b),r=g.radius,points=[{x:0,y:-g.halfHeight},{x:0,y:g.halfHeight}];
      for(const angle of [0,Math.PI/2,Math.PI,3*Math.PI/2]){const p=add(g.center,rotate(mul(direction(angle),r),-b.angle));if(p.x>=-EPS)points.push(p);}
      return points.map(p=>add(b,rotate(p,b.angle)));
    }
    return vertices(b).map(p=>add(b,rotate(p,b.angle)));}
  function location(p,b) {
    const q=local(p,b);
    if(b.shape==='semicircle'){
      const g=curvedGeometry(b),radius=length(sub(q,g.center));if(q.x< -EPS||radius>g.radius+EPS)return 'outside';
      return Math.abs(q.x)<=EPS||Math.abs(radius-g.radius)<=EPS?'boundary':'inside';
    }
    const v=vertices(b);let inside=false;
    for(let i=0,j=v.length-1;i<v.length;j=i++){
      const a=v[j],c=v[i],edge=sub(c,a),relative=sub(q,a),size=length(edge);
      if(Math.abs(cross(edge,relative))/size<=EPS&&dot(relative,edge)>=-EPS*size&&dot(sub(q,c),edge)<=EPS*size)return 'boundary';
      if((a.y>q.y)!==(c.y>q.y)&&q.x<(c.x-a.x)*(q.y-a.y)/(c.y-a.y)+a.x)inside=!inside;
    }
    return inside?'inside':'outside';
  }
  function intersectSemicircle(origin,dir,b){
    const p=local(origin,b),d=rotate(dir,-b.angle),g=curvedGeometry(b),r=g.radius,h=g.halfHeight,hits=[];
    function hit(t,normal,face,corner){if(t>EPS)hits.push({t,point:add(origin,mul(dir,t)),normal:rotate(normal,b.angle),face,corner});}
    if(Math.abs(d.x)>1e-14){const t=-p.x/d.x,y=p.y+t*d.y;if(Math.abs(y)<=h+EPS)hit(t,{x:-1,y:0},'flat',Math.abs(Math.abs(y)-h)<=EPS);}
    const relative=sub(p,g.center),projection=dot(relative,d),discriminant=projection*projection-dot(relative,relative)+r*r;
    // A tangent only touches the arc; it does not cross into a different medium.
    if(discriminant>EPS*EPS){
      const root=Math.sqrt(discriminant);
      for(const t of [-projection-root,-projection+root]){
        const point=add(p,mul(d,t));if(point.x>=-EPS)hit(t,unit(sub(point,g.center)),'arc',Math.abs(point.x)<=EPS);
      }
    }
    hits.sort((a,b)=>a.t-b.t);return hits[0]||null;
  }
  function intersect(origin,dir,b) {
    if(b.shape==='semicircle')return intersectSemicircle(origin,dir,b);
    const p=local(origin,b),d=rotate(dir,-b.angle),v=vertices(b),hits=[];
    const area=v.reduce((sum,a,i)=>sum+cross(a,v[(i+1)%v.length]),0);
    for(let i=0;i<v.length;i++){
      const a=v[i],edge=sub(v[(i+1)%v.length],a),denominator=cross(d,edge),size=length(edge);
      if(Math.abs(denominator)<1e-14*size)continue;
      const relative=sub(a,p),t=cross(relative,edge)/denominator,u=cross(relative,d)/denominator;
      if(t>EPS&&u>=-EPS/size&&u<=1+EPS/size){
        const normal=rotate(mul(unit({x:edge.y,y:-edge.x}),Math.sign(area)),b.angle);
        hits.push({t,point:add(origin,mul(dir,t)),normal,
          face:b.vertices?'edge'+i:['y-1','x1','y1','x-1'][i],
          corner:Math.min(Math.abs(u),Math.abs(1-u))*size<=EPS});
      }
    }
    hits.sort((a,b)=>a.t-b.t);
    return hits[0]||null;
  }
  // normal points into the incident medium, opposite the incoming direction.
  function snell(incoming,normal,n1,n2) {
    if(![n1,n2].every(n=>Number.isFinite(n)&&n>0)) throw new Error('Indices must be finite and positive.');
    const d=unit(incoming); let n=unit(normal);
    if(dot(d,n)>0) n=mul(n,-1);
    const cosI=Math.max(0,Math.min(1,-dot(d,n)));
    const tangent=add(d,mul(n,cosI)), sinI=length(tangent);
    const sinT=sinI===0?0:sinI*n1/n2;
    const incidence=Math.atan2(sinI,cosI);
    if(sinT>1+1e-12) return {direction:unit(add(d,mul(n,2*cosI))),normal:n,incidence,outgoingAngle:incidence,tir:true,critical:false};
    const s=Math.abs(sinT-1)<=1e-12?1:Math.min(1,sinT), c=Math.sqrt(Math.max(0,1-s*s));
    const transmitted=sinI===0?mul(n,-1):sub(mul(tangent,s/sinI),mul(n,c));
    return {direction:unit(transmitted),normal:n,incidence,outgoingAngle:Math.asin(s),tir:false,critical:s===1};
  }
  function edgeDistance(p,d,bounds) {
    const values=[];
    if(d.x>1e-14) values.push((bounds.width-p.x)/d.x);
    if(d.x< -1e-14) values.push(-p.x/d.x);
    if(d.y>1e-14) values.push((bounds.height-p.y)/d.y);
    if(d.y< -1e-14) values.push(-p.y/d.y);
    return Math.max(0,Math.min(...values.filter(t=>t>=-EPS)));
  }
  function trace(origin,directionVector,block,outsideIndex,bounds,maxHits=20) {
    const segments=[],events=[]; let p={...origin}, d=unit(directionVector);
    const start=location(p,block); let inside=start==='inside';
    if(start==='boundary') return {segments,events,warning:'Source on a boundary. Move it slightly.'};
    for(let count=0;count<maxHits;count++) {
      const hit=intersect(p,d,block), edge=edgeDistance(p,d,bounds);
      if(!hit || hit.t>edge+EPS) {segments.push({from:p,to:add(p,mul(d,edge))});return {segments,events};}
      segments.push({from:p,to:hit.point});
      if(hit.corner) return {segments,events,warning:'Ray hits a corner. Adjust its position or angle slightly.'};
      const n1=inside?block.index:outsideIndex,n2=inside?outsideIndex:block.index;
      const result=snell(d,inside?mul(hit.normal,-1):hit.normal,n1,n2);
      events.push({...hit,...result,incoming:d,n1,n2});
      p=hit.point; d=result.direction;
      if(result.critical) {segments.push({from:p,to:add(p,mul(d,edgeDistance(p,d,bounds)))});return {segments,events};}
      if(!result.tir) inside=!inside;
    }
    return {segments,events,warning:'Stopped after 20 surface interactions (trapped ray).'};
  }
  const api={EPS,add,sub,mul,dot,length,unit,rotate,direction,curvedGeometry,vertices,worldVertices,location,intersect,snell,edgeDistance,trace};
  root.Optics=api;
  if(typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
