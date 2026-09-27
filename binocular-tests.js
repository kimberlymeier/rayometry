(function(){
'use strict';
const G=typeof require==='function'?require('./binocular-geometry.js'):BinocularGeometry;
const results=[];
function assert(v,m='Assertion failed'){if(!v)throw Error(m);}
function close(a,b){assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);}
function test(name,fn){try{fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});}}
const aim=(side,z)=>G.bearing(G.eyes[side],{x:0,z});
for(const [name,lz,rz,lo,ro] of [
 ['Both on target: centered / centered',6,6,0,0],
 ['PDF page 2: left on target, right over-converged: centered / right',6,3,0,1],
 ['Right on target, left over-converged: left / centered',3,6,-1,0],
 ['PDF page 1: both over-converged: left / right',3,3,-1,1],
 ['Both under-converged: right / left',9,9,1/3,-1/3]]) {
 test(name,()=>{const d=G.evaluate({target:{x:0,z:6},angles:{left:aim('left',lz),right:aim('right',rz)}});close(d.left.sliceOffset,lo);close(d.right.sliceOffset,ro);close(d.left.intersection.x,-lo);close(d.right.intersection.x,-ro);close(d.left.intersection.z,6);});
}
test('Off-center fixation centers both views',()=>{const target={x:2,z:5};const d=G.evaluate({target,angles:{left:G.bearing(-1,target),right:G.bearing(1,target)}});for(const side of ['left','right']){close(d[side].sliceOffset,0);close(d[side].angularOffset,0);}});
test('Mirror symmetry reverses offsets and swaps eyes',()=>{const a=G.evaluate({target:{x:2,z:7},angles:{left:.2,right:-.1}}),b=G.evaluate({target:{x:-2,z:7},angles:{left:.1,right:-.2}});close(a.left.sliceOffset,-b.right.sliceOffset);close(a.right.angularOffset,-b.left.angularOffset);});
test('Changing one eye leaves the other result unchanged',()=>{const s=G.defaults(),before=G.evaluate(s);s.angles.left=.4;assert(JSON.stringify(before.right)===JSON.stringify(G.evaluate(s).right));});
test('Target movement preserves directions and slice interpretation',()=>{const s=G.defaults();s.angles={left:0,right:0};s.target={x:1,z:2};const a=G.evaluate(s);s.target.z=10;const b=G.evaluate(s);close(a.left.sliceOffset,b.left.sliceOffset);assert(a.left.angularOffset>b.left.angularOffset);});
test('Continuous passage through centered alignment',()=>{const s=G.defaults(),a=s.angles.left;s.angles.left=a-1e-6;const before=G.evaluate(s).left.sliceOffset;s.angles.left=a+1e-6;const after=G.evaluate(s).left.sliceOffset;assert(before>0&&after<0&&before-after<.0001);});
test('All supported extrema fit fixed world and slice viewports',()=>{for(const x of [-3,3])for(const z of [2,10])for(const angle of [-Math.PI/4,Math.PI/4])for(const eye of [-1,1]){const d=G.evaluateEye(eye,angle,{x,z});assert(Math.abs(d.intersection.x)<=11);assert(Math.abs(d.sliceOffset)<=14);assert(Number.isFinite(d.angularOffset));}});
test('Invalid geometry is rejected',()=>{for(const args of [[0,NaN,{x:0,z:6}],[0,0,{x:0,z:0}],[0,Math.PI/2,{x:0,z:6}]]){let threw=false;try{G.evaluateEye(...args);}catch(e){threw=e instanceof RangeError;}assert(threw);}});
test('Defaults return independent states',()=>{const a=G.defaults();a.target.x=2;close(G.defaults().target.x,0);});
test('Retina centers at fovea for fixation and reverses perceived side',()=>{
 for(const [lz,rz,leftSign,rightSign] of [[6,6,0,0],[6,3,0,-1],[3,6,1,0],[3,3,1,-1],[9,9,-1,1]]){
  const d=G.evaluate({target:{x:0,z:6},angles:{left:aim('left',lz),right:aim('right',rz)}});
  for(const [side,sign] of [['left',leftSign],['right',rightSign]]){
   const r=d[side];close(r.retinalAngle,-r.angularOffset);close(Math.hypot(r.retinalPosition.x,r.retinalPosition.z),1);
   if(sign===0){close(r.retinalPosition.x,0);close(r.retinalPosition.z,-1);}else assert(r.retinalPosition.x*sign>0);
  }
 }
});
test('Retinal image stays finite and on displayed arc throughout allowed range',()=>{
 for(const x of [-3,0,3])for(const z of [2,6,10])for(const a of [-Math.PI/4,0,Math.PI/4])for(const eye of [-1,1]){
  const r=G.evaluateEye(eye,a,{x,z});assert(Math.abs(r.retinalAngle)<110*Math.PI/180);close(Math.hypot(r.retinalPosition.x,r.retinalPosition.z),1);
 }
});
test('Retinal motion passes continuously through the fixed fovea',()=>{
 const angle=aim('left',6),before=G.evaluateEye(-1,angle-1e-6,{x:0,z:6}),after=G.evaluateEye(-1,angle+1e-6,{x:0,z:6});
 assert(before.retinalPosition.x<0&&after.retinalPosition.x>0);assert(after.retinalPosition.x-before.retinalPosition.x<3e-6);
});
test('Three-object scene translates rigidly and each object has its own retinal geometry',()=>{
 const s=G.defaults(),before=G.scene(s);s.target={x:2,z:8};const after=G.scene(s);
 for(let i=0;i<3;i++){close(after[i].target.x-before[i].target.x,2);close(after[i].target.z-before[i].target.z,2);}
 const d=G.scene(G.defaults());
 for(const side of ['left','right']){
  assert(d[0].eyes[side].sliceOffset<d[1].eyes[side].sliceOffset&&d[1].eyes[side].sliceOffset<d[2].eyes[side].sliceOffset);
  assert(d[0].eyes[side].retinalAngle>d[1].eyes[side].retinalAngle&&d[1].eyes[side].retinalAngle>d[2].eyes[side].retinalAngle);
  close(d[1].eyes[side].retinalAngle,0);
 }
});
test('Fixed scene spacing subtends less retinal angle farther away',()=>{
 const s=G.defaults();s.target.z=3;const near=G.scene(s);s.target.z=9;const far=G.scene(s);
 for(const side of ['left','right'])assert(near[0].eyes[side].retinalAngle-near[2].eyes[side].retinalAngle>far[0].eyes[side].retinalAngle-far[2].eyes[side].retinalAngle);
});
test('Prism diopters convert to deviation and validate power',()=>{
 close(G.prismDeviation(0),0);close(Math.tan(G.prismDeviation(20)),.2);
 for(const power of [-1,21,NaN,Infinity]){let threw=false;try{G.prismDeviation(power);}catch(e){threw=true;}assert(threw);}
});
test('Base in/out reverses page direction between eyes',()=>{
 assert(G.baseDirection('left','out')===-1&&G.baseDirection('right','out')===1);
 assert(G.baseDirection('left','in')===1&&G.baseDirection('right','in')===-1);
});
test('Zero prism reproduces all unprismed retinal and perceptual positions exactly',()=>{
 for(const side of ['left','right'])for(const base of ['in','out']){
  const s=G.defaults(),before=G.scene(s);s.prism={eye:side,base,power:0};const after=G.scene(s);
  for(let i=0;i<3;i++)for(const eye of ['left','right'])for(const key of ['sliceOffset','angularOffset','retinalAngle','apparentX'])close(before[i].eyes[eye][key],after[i].eyes[eye][key]);
 }
});
test('All objects shift perceptually toward apex and retinally toward base',()=>{
 for(const side of ['left','right'])for(const base of ['in','out']){
  const s=G.defaults(),before=G.scene(s),sign=G.baseDirection(side,base);s.prism={eye:side,base,power:10};const after=G.scene(s);
  for(let i=0;i<3;i++){
   assert((after[i].eyes[side].sliceOffset-before[i].eyes[side].sliceOffset)*sign<0);
   assert((after[i].eyes[side].retinalAngle-before[i].eyes[side].retinalAngle)*sign>0);
   const other=side==='left'?'right':'left';assert(JSON.stringify(before[i].eyes[other])===JSON.stringify(after[i].eyes[other]));
  }
 }
});
test('Traced rays meet at prism and turn toward base by the specified angle',()=>{
 for(const side of ['left','right'])for(const base of ['in','out'])for(const power of [0,5,20]){
  const s=G.defaults();s.prism={eye:side,base,power};
  for(const o of G.scene(s)){
   const d=o.eyes[side],q=d.prismPoint;
   close(q.z,G.prismDepth);close(Math.atan2(q.x-G.eyes[side],q.z),d.apparentBearing);
   const incoming=Math.atan2(o.target.x-q.x,o.target.z-q.z);
   close(incoming-d.apparentBearing,G.baseDirection(side,base)*G.prismDeviation(power));
   close(G.eyes[side]+o.target.z*Math.tan(d.apparentBearing),d.apparentX);
  }
 }
});
test('PDF over-converged eye reaches fovea with base out, with eye and world fixed',()=>{
 for(const side of ['left','right']){
  const s=G.defaults();s.angles[side]=aim(side,3);
  const a=s.angles[side],q=G.eyes[side]+G.prismDepth*Math.tan(a);
  const incoming=Math.atan2(s.target.x-q,s.target.z-G.prismDepth);
  const power=100*Math.tan(Math.abs(incoming-a));assert(power>0&&power<20);
  const before=JSON.stringify({target:s.target,angles:s.angles});s.prism={eye:side,base:'out',power};
  close(G.evaluate(s)[side].angularOffset,0);close(G.evaluate(s)[side].sliceOffset,0);
  assert(before===JSON.stringify({target:s.target,angles:s.angles}));
 }
});
test('Under-converged eye reaches fovea with base in',()=>{
 const s=G.defaults();s.angles.right=aim('right',9);const a=s.angles.right,q=1+G.prismDepth*Math.tan(a);
 const incoming=Math.atan2(-q,6-G.prismDepth),power=100*Math.tan(Math.abs(incoming-a));
 s.prism={eye:'right',base:'in',power};close(G.evaluate(s).right.retinalAngle,0);
});
test('Mirroring prism and eye preserves signed symmetry',()=>{
 const s=G.defaults();s.target.x=1.3;s.angles={left:.2,right:-.3};s.prism={eye:'left',base:'in',power:12};
 const a=G.evaluate(s);s.target.x=-1.3;s.angles={left:.3,right:-.2};s.prism.eye='right';const b=G.evaluate(s);
 close(a.left.sliceOffset,-b.right.sliceOffset);close(a.left.retinalAngle,-b.right.retinalAngle);
});
test('Prism extremes and near-zero powers remain finite, continuous, and ordered',()=>{
 for(const x of [-3,3])for(const z of [2,10])for(const side of ['left','right'])for(const base of ['in','out']){
  const s=G.defaults();s.target={x,z};s.angles={left:Math.PI/4,right:-Math.PI/4};
  const before=G.scene(s);s.prism={eye:side,base,power:1e-8};const tiny=G.scene(s);
  for(let i=0;i<3;i++)assert(Math.abs(before[i].eyes[side].sliceOffset-tiny[i].eyes[side].sliceOffset)<1e-6);
  s.prism.power=20;const objects=G.scene(s);
  for(const o of objects){const d=o.eyes[side];assert([d.sliceOffset,d.retinalAngle,d.apparentX,d.prismPoint.x].every(Number.isFinite));}
  assert(objects[0].eyes[side].apparentX<objects[1].eyes[side].apparentX&&objects[1].eyes[side].apparentX<objects[2].eyes[side].apparentX);
 }
});
test('Apple and tree can each reach fovea below 20 Δ from default fixation',()=>{
 for(const side of ['left','right'])for(const kind of ['apple','tree']){
  const s=G.defaults(),target=G.scene(s).find(o=>o.kind===kind).target,a=s.angles[side];
  const q=G.eyes[side]+G.prismDepth*Math.tan(a),incoming=Math.atan2(target.x-q,target.z-G.prismDepth);
  const signed=incoming-a,power=100*Math.tan(Math.abs(signed));assert(power>0&&power<20);
  const base=G.baseDirection(side,'out')===Math.sign(signed)?'out':'in';s.prism={eye:side,base,power};
  close(G.scene(s).find(o=>o.kind===kind).eyes[side].retinalAngle,0);
 }
});
test('Foveated world intersection lands exactly on fovea for every prism orientation',()=>{
 for(const side of ['left','right'])for(const base of ['in','out'])for(const power of [0,10,20])for(const angle of [-Math.PI/4,0,Math.PI/4]){
  const s=G.defaults();s.angles[side]=angle;s.prism={eye:side,base,power};
  const path=G.foveatedPath(s,side),image=G.evaluateEye(G.eyes[side],angle,path.intersection,G.prismFor(s,side));
  close(image.retinalAngle,0);close(image.sliceOffset,0);
  close(path.prismPoint.x,G.eyes[side]+G.prismDepth*Math.tan(angle));
 }
});
test('No-prism foveated path follows eye direction and base-out left path goes toward apple',()=>{
 const s=G.defaults();close(G.foveatedPath(s,'left').intersection.x,0);
 s.prism={eye:'left',base:'out',power:18};assert(G.foveatedPath(s,'left').intersection.x<0);
 close(G.foveatedPath(s,'right').intersection.x,0);
});
if(typeof document!=='undefined'){document.getElementById('results').textContent=results.map(r=>`${r.pass?'PASS':'FAIL'} ${r.name}${r.error?': '+r.error:''}`).join('\n');}
if(typeof process!=='undefined'){results.forEach(r=>console.log(`${r.pass?'PASS':'FAIL'} ${r.name}${r.error?': '+r.error:''}`));if(results.some(r=>!r.pass))process.exitCode=1;}
})();
