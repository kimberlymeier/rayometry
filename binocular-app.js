(function(){
  'use strict';
  const G=BinocularGeometry,$=id=>document.getElementById(id),world=$('bv-world');
  const colors={left:'#176482',right:'#ed168a'},fills={left:'#48afd3',right:'#f47dbc'};
  let state=G.defaults(),drag=null;
  // A closer default framing enlarges the eyes and their separation together.
  const scale=48, eyeY=550;
  const sx=x=>520+x*scale, sy=z=>eyeY-z*scale;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const star=(x,y,r=14)=>Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,d=i%2?r*.43:r;return `${x+Math.cos(a)*d},${y+Math.sin(a)*d}`;}).join(' ');
  // Reusable vector symbols avoid platform-dependent emoji and external assets.
  function symbol(kind,x,y,size=22){
    const shape=kind==='star'?`<polygon points="${star(0,0,1)}" fill="#151b1c"/>`:kind==='apple'?'<path d="M0 -.55 C-.9 -1 -1.1 .3 -.55 .8 Q-.25 1 0 .8 Q.4 1 .65 .55 C1.1 -.15 .7 -.9 0 -.55Z" fill="#8db497"/><path d="M0 -.5 Q-.15 -.95 .15 -1.1 M.08 -.82 Q.55 -1.3 .65 -.85 Q.35 -.55 .08 -.82" fill="#8db497" stroke="#769a7e" stroke-width=".1"/>':'<path d="M-.14 .4 H.14 V1 H-.14Z" fill="#b6a18e"/><path d="M0 -1 L.6 -.2 H.35 L.85 .5 H-.85 L-.35 -.2 H-.6Z" fill="#8aafa0"/>';
    return `<g data-scene-object="${kind}" transform="translate(${x} ${y}) scale(${size})">${shape}</g>`;
  }
  const position=offset=>Math.abs(offset)<1e-8?'centered':offset<0?'left of center':'right of center';
  const fields=[{id:'bv-x',min:-3,max:3,get:()=>state.target.x,set:v=>state.target.x=v},{id:'bv-z',min:2,max:10,get:()=>state.target.z,set:v=>state.target.z=v},...['left','right'].map(side=>({id:`bv-${side}-angle`,min:-45,max:45,get:()=>state.angles[side]*180/Math.PI,set:v=>state.angles[side]=v*Math.PI/180}))];
  function sync(){
    fields.forEach(f=>{if(document.activeElement!==$(f.id))$(f.id).value=Number(f.get().toFixed(4));});
    $('bv-prism-eye').value=state.prism.eye;$('bv-prism-base').value=state.prism.base;
    if(document.activeElement!==$('bv-prism-power'))$('bv-prism-power').value=Number(state.prism.power.toFixed(4));
    $('bv-prism-slider').value=state.prism.power;
    for(const id of ['bv-prism-base','bv-prism-power','bv-prism-slider'])$(id).disabled=state.prism.eye==='none';
    $('bv-prism-legend').hidden=false;
    $('bv-prism-status').textContent=state.prism.eye==='none'?'No prism.':`${state.prism.eye==='left'?'Left':'Right'} eye · base ${state.prism.base} · ${Number(state.prism.power.toFixed(4))} Δ${state.prism.power===0?' · no deviation':''}`;
  }
  function render(){
    const objects=G.scene(state),data=G.evaluate(state),tx=sx(state.target.x),ty=sy(state.target.z),showPlane=$('bv-plane').checked;
    // Continue visual axes beyond the target toward the top of the world view.
    const top=ty-130,extensionY=top+16;
    const apparentEnvelope=['left','right'].flatMap(side=>['in','out'].map(base=>Math.abs(G.foveatedPath({...state,prism:{eye:side,base,power:20}},side).intersection.x)*scale+65));
    const extent=Math.max(220,...apparentEnvelope,...objects.map(o=>Math.abs(o.target.x)*scale+35),...Object.entries(G.eyes).map(([side,x])=>Math.abs(x*scale+(eyeY-extensionY)*Math.tan(state.angles[side]))+65));
    world.setAttribute('viewBox',`${520-extent} ${top} ${extent*2} ${620-top}`);
    let s='';
    if(showPlane)s+=`<rect x="${520-extent}" y="${ty-90}" width="${tx-(520-extent)}" height="180" fill="#d4edc7"/><rect x="${tx}" y="${ty-90}" width="${520+extent-tx}" height="180" fill="#ffffcc"/><path d="M${520-extent} ${ty} H${520+extent}" stroke="#ed773b" stroke-width="2" stroke-dasharray="12 8"/>`;
    for(const side of ['left','right']){
      const foveated=G.foveatedPath(state,side),fx=sx(foveated.intersection.x);
      const ex=sx(G.eyes[side]),a=state.angles[side],ix=sx(data[side].intersection.x),hx=ex+Math.sin(a)*115,hy=eyeY-Math.cos(a)*115,c=colors[side];
      s+=`<path class="bv-forward-extension" d="M${ix} ${ty} L${ex+(eyeY-extensionY)*Math.tan(a)} ${extensionY}" stroke="${c}" stroke-width="2.5" stroke-dasharray="9 7" fill="none"/><path class="bv-eye-direction" d="M${ex} ${eyeY} L${ix} ${ty}" stroke="${c}" stroke-width="2.5" stroke-dasharray="9 7" fill="none"/><path class="bv-foveated-path" data-eye="${side}" d="M${ex} ${eyeY}${foveated.prismPoint?` L${sx(foveated.prismPoint.x)} ${sy(foveated.prismPoint.z)}`:''} L${fx} ${ty}" stroke="${c}" stroke-width="4" fill="none"/><circle cx="${ex}" cy="${eyeY}" r="30" fill="${fills[side]}" stroke="${c}" stroke-width="2"/><path d="M${ex-Math.sin(a)*30} ${eyeY+Math.cos(a)*30} L${ex+Math.sin(a)*30} ${eyeY-Math.cos(a)*30}" stroke="${c}" stroke-width="4"/><text x="${ex}" y="${eyeY+49}" text-anchor="middle">${side} eye</text>`;
      if($('bv-markers').checked)s+=`<circle cx="${fx}" cy="${ty}" class="bv-fixation-marker" r="4" fill="${c}"/>`;
      s+=`<g data-drag="${side}"><circle cx="${hx}" cy="${hy}" r="23" fill="transparent"/><circle class="bv-handle" cx="${hx}" cy="${hy}" r="11" stroke="${c}"/></g>`;
    }
    if(state.prism.eye!=='none'){
      const side=state.prism.eye,ex=sx(G.eyes[side]);
      // Keep the eye-side foveal crossing inside the fixed prism face.
      const reach=[Math.abs(G.prismDepth*Math.tan(state.angles[side])*scale)];
      const halfWidth=Math.max(32,...reach.map(x=>x+12)),left=ex-halfWidth,right=ex+halfWidth,py=sy(G.prismDepth);
      const sign=G.baseDirection(side,state.prism.base),baseX=sign>0?right:left,apexX=sign>0?left:right;
      const thickness=(right-left)*state.prism.power/100;
      s+=`<g class="bv-prism"><polygon points="${apexX},${py} ${baseX},${py} ${baseX},${py-thickness}" fill="#ded0ea" fill-opacity=".8" stroke="#88509f" stroke-width="2"/><path class="bv-prism-fixed-face" d="M${apexX} ${py} H${baseX}" stroke="#623377" stroke-width="2.5"/><path d="M${baseX} ${py-thickness} V${py}" stroke="#623377" stroke-width="4"/></g>`;
    }
    for(const object of objects)if(object.kind!=='star')s+=symbol(object.kind,sx(object.target.x),ty,18);
    s+=`<g data-drag="target"><circle cx="${tx}" cy="${ty}" r="25" fill="transparent"/><polygon points="${star(tx,ty,21)}" fill="#151b1c"/><text x="${tx}" y="${ty+43}" text-anchor="middle" class="bv-label">target</text></g>`;
    world.innerHTML=s;
    // Fixed close view: objects may leave the frame rather than forcing a zoom-out.
    const sliceScale=100;
    for(const side of ['left','right']){
      const offset=data[side].sliceOffset,x=260+offset*sliceScale,split=clamp(x,30,490),c=colors[side];
      $( `bv-${side}-view`).innerHTML=`<defs><clipPath id="bv-${side}-slice-clip"><rect x="30" y="32" width="460" height="210"/></clipPath></defs><rect x="30" y="32" width="${split-30}" height="210" fill="#d4edc7"/><rect x="${split}" y="32" width="${490-split}" height="210" fill="#ffffcc"/><rect x="30" y="32" width="460" height="210" fill="none" stroke="#ed773b" stroke-width="2.5" stroke-dasharray="12 8" vector-effect="non-scaling-stroke"/><path class="bv-center" d="M260 12 V268" vector-effect="non-scaling-stroke"/><path d="M247 274 L260 253 L273 274" fill="${c}"/><g clip-path="url(#bv-${side}-slice-clip)"><polygon points="${star(x,137,34)}" fill="#151b1c"/></g>`;
      $(`bv-${side}-view`).innerHTML+=`<g clip-path="url(#bv-${side}-slice-clip)">${objects.filter(o=>o.kind!=='star').map(o=>symbol(o.kind,260+o.eyes[side].sliceOffset*sliceScale,137,28)).join('')}</g>`;
      $(`bv-${side}-position`).textContent=`Target ${position(offset)}${x<30||x>490?' · outside view':''}`;
      const retina=data[side].retinalPosition;
      const retinalMagnification=3,edge=55*Math.PI/180,radius=235,centerY=-40,edgeX=radius*Math.sin(edge),edgeY=centerY+radius*Math.cos(edge);
      let retinalDrawing=`<path class="bv-retinal-arc" d="M${260-edgeX} ${edgeY} A${radius} ${radius} 0 0 0 ${260+edgeX} ${edgeY}" fill="none" stroke="${c}" stroke-width="3" vector-effect="non-scaling-stroke"/><path class="bv-fovea" d="M260 195 V224" stroke="${c}" stroke-width="3" vector-effect="non-scaling-stroke"/>`;
      for(const object of objects){
        const angle=object.eyes[side].retinalAngle*retinalMagnification;
        if(Math.abs(angle)>edge)continue;
        retinalDrawing+=symbol(object.kind,260+radius*Math.sin(angle),centerY+radius*Math.cos(angle),object.kind==='star'?30:25);
      }
      for(const sign of [-1,1])if(objects.some(o=>o.eyes[side].retinalAngle*retinalMagnification*sign>edge)){
        const ex=260+sign*edgeX;
        retinalDrawing+=`<path class="bv-retinal-edge" d="M${ex-sign*9} ${edgeY+14} L${ex+sign*5} ${edgeY-2} L${ex-sign*10} ${edgeY-5}" fill="none" stroke="${c}" stroke-width="3"/>`;
      }
      $(`bv-${side}-retina`).innerHTML=retinalDrawing;
      const retinalLabel=Math.abs(data[side].retinalAngle)<1e-8?'Target on fovea':`Target ${retina.x<0?'left':'right'} of fovea`;
      $(`bv-${side}-retina-position`).textContent=retinalLabel;
      $(`bv-${side}-retina`).setAttribute('aria-label',`${side} retina: ${retinalLabel.toLowerCase()}. Magnified around the fovea, fixed at the bottom center.`);
      $(`bv-${side}-view`).setAttribute('aria-label',`${side} eye: target ${position(offset)}. Target-plane slice centered where eye points.`);
    }
    $('bv-summary').textContent=`Left eye: target ${position(data.left.sliceOffset)}. Right eye: target ${position(data.right.sliceOffset)}.`;
    sync();
  }
  fields.forEach(f=>{
    const el=$(f.id);
    el.addEventListener('input',()=>{
      const value=el.valueAsNumber,valid=Number.isFinite(value)&&value>=f.min&&value<=f.max;
      el.setAttribute('aria-invalid',String(!valid));
      if(!valid){$('bv-error').textContent=`${el.labels[0].textContent}: enter a number from ${f.min} to ${f.max}.`;return;}
      f.set(value);$('bv-error').textContent='';render();
    });
  });
  for(const id of ['bv-prism-eye','bv-prism-base'])$(id).addEventListener('change',()=>{
    if(id==='bv-prism-eye')state.prism.eye=$(id).value;else state.prism.base=$(id).value;
    $('bv-prism-power').removeAttribute('aria-invalid');$('bv-prism-error').textContent='';render();
  });
  for(const id of ['bv-prism-power','bv-prism-slider'])$(id).addEventListener('input',()=>{
    const value=$(id).valueAsNumber;
    if(!Number.isFinite(value)||value<0||value>20){$('bv-prism-power').setAttribute('aria-invalid','true');$('bv-prism-error').textContent='Enter a prism amount from 0 to 20 Δ.';return;}
    const exact=G.alignmentPower(state);
    state.prism.power=id==='bv-prism-slider' && exact!==null && Math.abs(value-exact)<=0.35?exact:value;
    $('bv-prism-power').removeAttribute('aria-invalid');$('bv-prism-error').textContent='';
    if(id==='bv-prism-slider')$('bv-prism-power').value=Number(state.prism.power.toFixed(4));
    render();
  });
  const point=e=>{const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(world.getScreenCTM().inverse());return {x:(p.x-520)/scale,z:(eyeY-p.y)/scale};};
  function move(e){
    const p=point(e);
    if(drag==='target'){
      const x=clamp(p.x,-3,3);
      state.target={x:Math.abs(x)<=0.12?0:x,z:clamp(p.z,2,10)};
    }else{
      const angle=clamp(Math.atan2(p.x-G.eyes[drag],p.z),-G.limits.angle,G.limits.angle);
      const onTarget=G.evaluate(state)[drag].apparentBearing;
      // Snap the state itself, not just the drawing; moving away releases it.
      state.angles[drag]=Math.abs(onTarget)<=G.limits.angle && Math.abs(angle-onTarget)<=1.5*Math.PI/180?onTarget:angle;
    }
    render();
  }
  world.addEventListener('pointerdown',e=>{const hit=e.target.closest('[data-drag]');if(!hit||e.button!==0)return;e.preventDefault();drag=hit.dataset.drag;world.setPointerCapture(e.pointerId);});
  world.addEventListener('pointermove',e=>{if(drag)move(e);});
  const end=()=>{drag=null;};
  world.addEventListener('pointerup',end);world.addEventListener('pointercancel',end);world.addEventListener('lostpointercapture',end);
  ['bv-plane','bv-markers'].forEach(id=>$(id).addEventListener('change',render));
  $('bv-reset').addEventListener('click',()=>{state=G.defaults();drag=null;$('bv-prism-error').textContent='';$('bv-prism-power').removeAttribute('aria-invalid');$('bv-plane').checked=true;$('bv-markers').checked=true;$('bv-error').textContent='';fields.forEach(f=>$(f.id).removeAttribute('aria-invalid'));render();});
  render();
})();
