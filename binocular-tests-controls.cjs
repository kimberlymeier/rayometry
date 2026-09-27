const fs=require('fs'),vm=require('vm'),assert=require('assert');
const elements=new Map();
class Element{
 constructor(id){this.id=id;this.value='';this.checked=['bv-plane','bv-markers'].includes(id);this.attrs={};this.handlers={};this.labels=[{textContent:id}];}
 get valueAsNumber(){return this.value===''?NaN:Number(this.value);}
 addEventListener(n,f){this.handlers[n]=f;}
 setAttribute(n,v){this.attrs[n]=String(v);}
 removeAttribute(n){delete this.attrs[n];}
 setPointerCapture(){}
 getScreenCTM(){return {inverse:()=>({})};}
}
const document={activeElement:null,getElementById(id){if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);}};
const ctx=vm.createContext({document,console,DOMPoint:class{constructor(x,y){this.x=x;this.y=y;}matrixTransform(){return this;}}});
for(const f of ['binocular-geometry.js','binocular-app.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+f,'utf8'),ctx);
const $=id=>document.getElementById(id),world=$('bv-world'),reset=()=>$('bv-reset').handlers.click();
function input(id,value){const el=$(id);el.value=String(value);document.activeElement=el;el.handlers.input();document.activeElement=null;}
function drag(side,x,y,end='pointerup'){world.handlers.pointerdown({button:0,target:{closest:()=>({dataset:{drag:side}})},preventDefault(){},pointerId:1});world.handlers.pointermove({clientX:x,clientY:y});world.handlers[end]();}
let count=0;function test(name,fn){reset();fn();count++;console.log('PASS '+name);}
test('Default rendering centers target in both views',()=>{assert.equal($('bv-summary').textContent,'Left eye: target centered. Right eye: target centered.');});
test('Numeric input reproduces PDF one-eye fixation',()=>{input('bv-right-angle',-Math.atan(1/3)*180/Math.PI);assert.equal($('bv-summary').textContent,'Left eye: target centered. Right eye: target right of center.');});
test('Invalid and empty input preserves geometry and flags field',()=>{const old=world.innerHTML;for(const value of ['','99','nonsense']){input('bv-x',value);assert.equal(world.innerHTML,old);assert.equal($('bv-x').attrs['aria-invalid'],'true');assert($('bv-error').textContent);}input('bv-x',1);assert.equal($('bv-x').attrs['aria-invalid'],'false');assert.equal($('bv-error').textContent,'');});
test('Target drag updates both position controls without turning eyes',()=>{const left=$('bv-left-angle').value,right=$('bv-right-angle').value;drag('target',568,310);assert.equal($('bv-x').value,1);assert.equal($('bv-z').value,5);assert.equal($('bv-left-angle').value,left);assert.equal($('bv-right-angle').value,right);});
test('Eye direction drag is independent and bounded',()=>{const right=$('bv-right-angle').value;drag('left',900,450);assert.equal($('bv-left-angle').value,45);assert.equal($('bv-right-angle').value,right);});
test('Target drag is bounded; cancellation ends editing',()=>{drag('target',2000,-200,'pointercancel');assert.equal($('bv-x').value,3);assert.equal($('bv-z').value,10);world.handlers.pointermove({clientX:520,clientY:260});assert.equal($('bv-x').value,3);});
test('Plane and marker toggles are independent of perceptual slices',()=>{const view=$('bv-left-view').innerHTML;$('bv-plane').checked=false;$('bv-plane').handlers.change();assert(!world.innerHTML.includes('<rect'));assert(world.innerHTML.includes('bv-fixation-marker'));$('bv-markers').checked=false;$('bv-markers').handlers.change();assert(!world.innerHTML.includes('bv-fixation-marker'));assert.equal($('bv-left-view').innerHTML,view);});
test('Reset restores drawing, visibility and valid controls',()=>{const before=world.innerHTML;input('bv-x',2);input('bv-z','');$('bv-plane').checked=false;reset();assert.equal(world.innerHTML,before);assert.equal($('bv-error').textContent,'');assert(!$('bv-z').attrs['aria-invalid']);assert($('bv-plane').checked);});
test('Visual axes extend beyond target toward the top, never below eyes',()=>{for(const angle of [-45,0,45]){input('bv-left-angle',angle);input('bv-right-angle',angle);const paths=[...world.innerHTML.matchAll(/class="bv-forward-extension" d="M([^ ]+) ([^ ]+) L([^ ]+) ([^"]+)"/g)];assert.equal(paths.length,2);for(const p of paths){assert(Number(p[4])<Number(p[2]));assert(Number.isFinite(Number(p[4])));}assert(!world.innerHTML.includes('bv-backward-axis'));}assert.equal(Number(world.attrs.viewBox.split(' ')[1])+Number(world.attrs.viewBox.split(' ')[3]),620);});
test('Retinal panels update independently and keep their fovea fixed',()=>{
 const left=$('bv-left-retina').innerHTML;
 assert.equal($('bv-left-retina-position').textContent,'Target on fovea');
 input('bv-right-angle',-Math.atan(1/3)*180/Math.PI);
 assert.equal($('bv-right-retina-position').textContent,'Target left of fovea');
 assert.equal($('bv-left-retina').innerHTML,left);
 assert($('bv-right-retina').innerHTML.includes('class="bv-fovea" d="M260 195 V224"'));
 reset();assert.equal($('bv-right-retina-position').textContent,'Target on fovea');
});
test('Eye drag snaps to exact fixation and releases on either side',()=>{
 for(const side of ['left','right']){
  const eye=side==='left'?-1:1,angle=Math.atan2(-eye,6);
  for(const delta of [-1,1]){
   const a=angle+delta*Math.PI/180;
   drag(side,520+48*eye+115*Math.sin(a),550-115*Math.cos(a));
   assert.equal($(`bv-${side}-position`).textContent,'Target centered');
   assert.equal($(`bv-${side}-retina-position`).textContent,'Target on fovea');
  }
  const away=angle+3*Math.PI/180;
  drag(side,520+48*eye+115*Math.sin(away),550-115*Math.cos(away));
  assert.notEqual($(`bv-${side}-position`).textContent,'Target centered');
 }
});
test('Target zero snap releases and numerical entries stay exact',()=>{
 drag('target',524,262);assert.equal($('bv-x').value,0);
 drag('target',530,262);assert(Number($('bv-x').value)>0.12);
 input('bv-x',0.05);assert.equal(Number($('bv-x').value),0.05);
 input('bv-left-angle',10);assert.equal(Number($('bv-left-angle').value),10);
});
test('Snap does not exceed eye rotation limits for unreachable targets',()=>{
 input('bv-x',3);input('bv-z',2);drag('left',900,450);
 assert.equal(Number($('bv-left-angle').value),45);
 assert.notEqual($('bv-left-position').textContent,'Target centered');
});
test('Companion objects render in world and each linked view; extremes show edge cues',()=>{
 for(const id of ['bv-world','bv-left-view','bv-right-view','bv-left-retina','bv-right-retina']){
  for(const kind of ['apple','tree'])assert($(id).innerHTML.includes(`data-scene-object="${kind}"`));
 }
 input('bv-x',3);input('bv-z',2);input('bv-left-angle',-45);
 assert($('bv-left-retina').innerHTML.includes('bv-retinal-edge'));
 reset();assert(!$('bv-left-retina').innerHTML.includes('bv-retinal-edge'));
});
function choose(id,value){$(id).value=value;$(id).handlers.change();}
test('Prism starts absent, zero power is neutral, and controls synchronize',()=>{
 assert($('bv-prism-power').disabled);assert.equal($('bv-prism-eye').value,'none');
 const view=$('bv-right-view').innerHTML;choose('bv-prism-eye','right');
 assert(!$('bv-prism-power').disabled);assert.equal($('bv-right-view').innerHTML,view);
 input('bv-prism-slider',8.5);assert.equal(Number($('bv-prism-power').value),8.5);
 input('bv-prism-power',12);assert.equal(Number($('bv-prism-slider').value),12);
 assert(world.innerHTML.includes('class="bv-prism"'));assert(!world.innerHTML.includes('bv-apparent-direction'));
 assert.equal((world.innerHTML.match(/class="bv-light-path"/g)||[]).length,0);
});
test('Prism power changes only selected eye views, never eye directions or target',()=>{
 const left=$('bv-left-view').innerHTML,retina=$('bv-left-retina').innerHTML;
 const pose=['bv-x','bv-z','bv-left-angle','bv-right-angle'].map(id=>$(id).value);
 choose('bv-prism-eye','right');input('bv-prism-power',10);
 assert.equal($('bv-left-view').innerHTML,left);assert.equal($('bv-left-retina').innerHTML,retina);
 assert.equal($('bv-right-position').textContent,'Target left of center');assert.equal($('bv-right-retina-position').textContent,'Target right of fovea');
 assert.deepEqual(['bv-x','bv-z','bv-left-angle','bv-right-angle'].map(id=>$(id).value),pose);
 choose('bv-prism-base','in');assert.equal($('bv-right-position').textContent,'Target right of center');
 choose('bv-prism-eye','left');assert.equal($('bv-right-position').textContent,'Target centered');assert.equal($('bv-left-position').textContent,'Target left of center');
});
test('Prism invalid input is rejected and removing or resetting prism restores scene',()=>{
 const original=$('bv-right-view').innerHTML;choose('bv-prism-eye','right');input('bv-prism-power',10);const before=world.innerHTML;
 for(const value of ['',-1,21,'invalid']){input('bv-prism-power',value);assert.equal(world.innerHTML,before);assert.equal($('bv-prism-power').attrs['aria-invalid'],'true');}
 input('bv-prism-slider',5);assert(!$('bv-prism-power').attrs['aria-invalid']);assert.equal($('bv-prism-error').textContent,'');
 choose('bv-prism-eye','none');assert.equal($('bv-right-view').innerHTML,original);assert(!world.innerHTML.includes('class="bv-prism"'));assert($('bv-prism-power').disabled);
 choose('bv-prism-eye','left');assert.equal(Number($('bv-prism-power').value),5);reset();assert.equal($('bv-prism-eye').value,'none');assert.equal(Number($('bv-prism-power').value),0);
});
test('Eye handle snaps to apparent star through prism',()=>{
 choose('bv-prism-eye','right');input('bv-prism-power',10);
 const s=ctx.BinocularGeometry.defaults();s.prism={eye:'right',base:'out',power:10};const a=ctx.BinocularGeometry.evaluate(s).right.apparentBearing;
 drag('right',568+115*Math.sin(a+.005),550-115*Math.cos(a+.005));
 assert.equal($('bv-right-position').textContent,'Target centered');assert.equal($('bv-right-retina-position').textContent,'Target on fovea');
});
test('Prism fixed face and apex stay in place while power pivots the other face',()=>{
 choose('bv-prism-eye','right');
 const face=()=>world.innerHTML.match(/class="bv-prism-fixed-face" d="([^"]+)"/)[1];
 const original=face();input('bv-prism-power',10);assert.equal(face(),original);
 input('bv-prism-power',20);assert.equal(face(),original);
 assert(world.innerHTML.includes('class="bv-foveated-path"'));
 assert(!world.innerHTML.includes('data-light-object="apple"'));assert(!world.innerHTML.includes('data-light-object="tree"'));
});
test('World uses only eye-colored foveated paths and dashed eye directions',()=>{
 choose('bv-prism-eye','left');input('bv-prism-power',18);
 assert.equal((world.innerHTML.match(/class="bv-foveated-path"/g)||[]).length,2);
 assert.equal((world.innerHTML.match(/class="bv-eye-direction"/g)||[]).length,2);
 assert(!world.innerHTML.includes('#b56b16'));assert(!world.innerHTML.includes('bv-apparent-direction'));
 const match=world.innerHTML.match(/class="bv-foveated-path" data-eye="left" d="([^"]+)"/);
 assert.equal((match[1].match(/ L/g)||[]).length,2);
});
test('Prism slider snaps to exact star fixation, releases, and leaves numeric input exact',()=>{
 for(const side of ['left','right'])for(const base of ['in','out']){
  reset();choose('bv-prism-eye',side);choose('bv-prism-base',base);
  input(`bv-${side}-angle`,(side==='left'?1:-1)* (base==='out'?18:6));
  const s=ctx.BinocularGeometry.defaults();s.angles[side]=Number($(`bv-${side}-angle`).value)*Math.PI/180;s.prism={eye:side,base,power:0};
  const exact=ctx.BinocularGeometry.alignmentPower(s);assert(exact>0&&exact<20);
  for(const delta of [-.2,.2]){input('bv-prism-slider',exact+delta);assert.equal($(`bv-${side}-position`).textContent,'Target centered');assert.equal($(`bv-${side}-retina-position`).textContent,'Target on fovea');}
  input('bv-prism-slider',exact+.6);assert.notEqual($(`bv-${side}-retina-position`).textContent,'Target on fovea');
  input('bv-prism-power',exact+.1);assert.notEqual($(`bv-${side}-retina-position`).textContent,'Target on fovea');
 }
});
test('Requested labels are absent from world view',()=>{
 choose('bv-prism-eye','left');input('bv-prism-power',10);
 for(const text of ['base','apex','left','right','target plane','left fixation','right fixation'])assert(!world.innerHTML.includes(`>${text}</text>`));
 assert(world.innerHTML.includes('>left eye</text>'));assert(world.innerHTML.includes('>target</text>'));
});
console.log(`${count} binocular control checks passed (DOM fixture; visual browser review still required).`);
