/* Pure binocular geometry: x right, z forward, angles in radians from forward. */
(function(root) {
  'use strict';
  const limits = Object.freeze({x:3, minDepth:2, maxDepth:10, angle:Math.PI/4});
  const eyes = Object.freeze({left:-1, right:1});
  const bearing = (eyeX,target) => Math.atan2(target.x-eyeX,target.z);
  function defaults() {
    const target={x:0,z:6};
    return {target, angles:{left:bearing(eyes.left,target),right:bearing(eyes.right,target)},prism:{eye:'none',base:'out',power:0}};
  }
  const prismDepth=1; // Schematic eye-to-prism separation; not a clinical vertex distance.
  function prismDeviation(power){
    if(!Number.isFinite(power)||power<0||power>20)throw new RangeError('Prism amount must be from 0 to 20 Δ.');
    return Math.atan(power/100);
  }
  function baseDirection(side,base){
    if(!['left','right'].includes(side)||!['in','out'].includes(base))throw new RangeError('Invalid prism eye or base.');
    return (side==='left'?-1:1)*(base==='out'?1:-1);
  }
  function prismFor(state,side){
    const prism=state.prism;
    if(!prism)return null;
    if(!['none','left','right'].includes(prism.eye))throw new RangeError('Invalid prism placement.');
    prismDeviation(prism.power);
    if(!['in','out'].includes(prism.base))throw new RangeError('Invalid prism base.');
    return prism.eye===side?{power:prism.power,baseSign:baseDirection(side,prism.base)}:null;
  }
  function tracePrism(eyeX,target,prism){
    const physicalBearing=bearing(eyeX,target);
    if(!prism)return {apparentBearing:physicalBearing,prismPoint:null,deviation:0};
    const deviation=prismDeviation(prism.power);
    if(![-1,1].includes(prism.baseSign)||target.z<=prismDepth)throw new RangeError('Invalid prism geometry.');
    // Reverse ray from eye through an ideal thin angular deflector. Solve the
    // crossing so the forward ray is continuous and turns toward the base.
    let hitX=eyeX+prismDepth*Math.tan(physicalBearing);
    if(deviation>0){
      const span=Math.abs(target.x-eyeX)+target.z+10;
      let lo=Math.min(eyeX,target.x)-span,hi=Math.max(eyeX,target.x)+span;
      for(let i=0;i<64;i++){
        const mid=(lo+hi)/2;
        const outgoing=Math.atan2(mid-eyeX,prismDepth);
        const incoming=Math.atan2(target.x-mid,target.z-prismDepth);
        if(outgoing-incoming+prism.baseSign*deviation>0)hi=mid;else lo=mid;
      }
      hitX=(lo+hi)/2;
    }
    return {apparentBearing:deviation===0?physicalBearing:Math.atan2(hitX-eyeX,prismDepth),prismPoint:{x:hitX,z:prismDepth},deviation};
  }
  function evaluateEye(eyeX,angle,target,prism=null) {
    if (![eyeX,angle,target.x,target.z].every(Number.isFinite) || target.z<=0 || Math.abs(angle)>limits.angle) {
      throw new RangeError('Use finite positions, positive depth, and eye directions within ±45°.');
    }
    const targetBearing=bearing(eyeX,target);
    const intersection={x:eyeX+target.z*Math.tan(angle),z:target.z};
    const light=tracePrism(eyeX,target,prism);
    const apparentX=light.deviation===0?target.x:eyeX+target.z*Math.tan(light.apparentBearing);
    const angularOffset=light.apparentBearing-angle;
    // Eye-fixed schematic unit retina: the light continues opposite the target bearing.
    // Fovea stays at (0, -1); x remains rightward in the top-down view.
    const retinalAngle=-angularOffset;
    const retinalPosition={x:Math.sin(retinalAngle),z:-Math.cos(retinalAngle)};
    return {intersection,targetBearing,...light,apparentX,angularOffset,physicalSliceOffset:target.x-intersection.x,sliceOffset:apparentX-intersection.x,retinalAngle,retinalPosition};
  }
  function alignmentPower(state){
    const side=state.prism?.eye;
    if(!['left','right'].includes(side))return null;
    const angle=state.angles[side],hitX=eyes[side]+prismDepth*Math.tan(angle);
    const incoming=Math.atan2(state.target.x-hitX,state.target.z-prismDepth);
    const deviation=(incoming-angle)*baseDirection(side,state.prism.base);
    if(deviation < -1e-12 || deviation > prismDeviation(20)+1e-12)return null;
    return Math.max(0,Math.min(20,100*Math.tan(deviation)));
  }
  function foveatedPath(state,side){
    const eye={x:eyes[side],z:0},angle=state.angles[side],prism=prismFor(state,side);
    const prismPoint=prism?{x:eye.x+prismDepth*Math.tan(angle),z:prismDepth}:null;
    const origin=prismPoint||eye;
    const sceneBearing=angle+(prism?prism.baseSign*prismDeviation(prism.power):0);
    const intersection={x:origin.x+(state.target.z-origin.z)*Math.tan(sceneBearing),z:state.target.z};
    return {eye,prismPoint,sceneBearing,intersection};
  }
  const sceneOffsets=Object.freeze({apple:-0.9,star:0,tree:0.9});
  function scene(state) {
    return Object.entries(sceneOffsets).map(([kind,offset])=>{
      const target={x:state.target.x+offset,z:state.target.z};
      return {kind,target,eyes:Object.fromEntries(Object.entries(eyes).map(([side,x])=>[side,evaluateEye(x,state.angles[side],target,prismFor(state,side))]))};
    });
  }
  function evaluate(state) {
    return Object.fromEntries(Object.entries(eyes).map(([side,x])=>[side,evaluateEye(x,state.angles[side],state.target,prismFor(state,side))]));
  }
  const api={limits,eyes,bearing,defaults,evaluateEye,evaluate,scene,sceneOffsets,prismDepth,prismDeviation,baseDirection,prismFor,tracePrism,foveatedPath,alignmentPower};
  if(typeof module==='object' && module.exports) module.exports=api;
  root.BinocularGeometry=api;
})(typeof globalThis!=='undefined'?globalThis:this);
