const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/Classroom-BgQIF8js.js","assets/vendor-nf7bT_Uh.js","assets/three-DiYuzjqT.js","assets/Classroom-Bds8mdnf.css","assets/AuthModal-CEy_i_9q.js","assets/AuthModal-BwAkCM4A.css"])))=>i.map(i=>d[i]);
import{r as A,a as ht,R as mt}from"./vendor-nf7bT_Uh.js";(function(){const r=document.createElement("link").relList;if(r&&r.supports&&r.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))t(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const s of o.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&t(s)}).observe(document,{childList:!0,subtree:!0});function a(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function t(n){if(n.ep)return;n.ep=!0;const o=a(n);fetch(n.href,o)}})();var at={exports:{}},Me={};/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var gt=A,vt=Symbol.for("react.element"),bt=Symbol.for("react.fragment"),St=Object.prototype.hasOwnProperty,yt=gt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,Et={key:!0,ref:!0,__self:!0,__source:!0};function nt(e,r,a){var t,n={},o=null,s=null;a!==void 0&&(o=""+a),r.key!==void 0&&(o=""+r.key),r.ref!==void 0&&(s=r.ref);for(t in r)St.call(r,t)&&!Et.hasOwnProperty(t)&&(n[t]=r[t]);if(e&&e.defaultProps)for(t in r=e.defaultProps,r)n[t]===void 0&&(n[t]=r[t]);return{$$typeof:vt,type:e,key:o,ref:s,props:n,_owner:yt.current}}Me.Fragment=bt;Me.jsx=nt;Me.jsxs=nt;at.exports=Me;var h=at.exports,Fe={},Ye=ht;Fe.createRoot=Ye.createRoot,Fe.hydrateRoot=Ye.hydrateRoot;const xt="modulepreload",Tt=function(e){return"/"+e},Ke={},ot=function(r,a,t){let n=Promise.resolve();if(a&&a.length>0){document.getElementsByTagName("link");const s=document.querySelector("meta[property=csp-nonce]"),c=(s==null?void 0:s.nonce)||(s==null?void 0:s.getAttribute("nonce"));n=Promise.allSettled(a.map(i=>{if(i=Tt(i),i in Ke)return;Ke[i]=!0;const d=i.endsWith(".css"),f=d?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${i}"]${f}`))return;const p=document.createElement("link");if(p.rel=d?"stylesheet":xt,d||(p.as="script"),p.crossOrigin="",p.href=i,c&&p.setAttribute("nonce",c),document.head.appendChild(p),d)return new Promise((b,k)=>{p.addEventListener("load",b),p.addEventListener("error",()=>k(new Error(`Unable to preload CSS for ${i}`)))})}))}function o(s){const c=new Event("vite:preloadError",{cancelable:!0});if(c.payload=s,window.dispatchEvent(c),!c.defaultPrevented)throw s}return n.then(s=>{for(const c of s||[])c.status==="rejected"&&o(c.reason);return r().catch(o)})},je={terminal:{curve:[.115,.165],scanDensity:.44,scanDepth:.3,triadCss:3.2,grille:.34,chroma:1,bar:.045,flicker:.028,grain:.022,noise:0,vignette:.58,mono:0,gain:1.34,halo:.1,sheen:[.55,1,.78],room:[.012,.03,.022],background:"#03100a",filtering:"linear",surface:{mode:"buffer"},redrawMs:0},cinematic:{curve:[.085,.125],scanDensity:.4,scanDepth:.22,triadCss:3.6,grille:.14,chroma:.7,bar:.022,flicker:.02,grain:.055,noise:0,vignette:.74,mono:1,gain:1.16,halo:.2,sheen:[.86,.9,1],room:[.016,.016,.018],background:"#07070a",filtering:"linear",surface:{mode:"cap",width:1280},redrawMs:33},"blue-screen":{curve:[.13,.18],scanDensity:.46,scanDepth:.34,triadCss:3,grille:.3,chroma:1.9,bar:.055,flicker:.042,grain:.038,noise:1,vignette:.6,mono:0,gain:1.22,halo:.16,sheen:[.62,.76,1],room:[.014,.02,.046],background:"#050a24",filtering:"linear",surface:{mode:"cap",width:1600},redrawMs:96},nintendo:{curve:[.07,.1],scanDensity:.34,scanDepth:.26,triadCss:3.4,grille:.2,chroma:.55,bar:.018,flicker:.014,grain:.014,noise:0,vignette:.46,mono:0,gain:1.2,halo:.06,sheen:[.72,.84,1],room:[.02,.024,.04],background:"#0a1030",filtering:"nearest",surface:{mode:"fixed",width:320,height:180},redrawMs:16}},Ne='ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace',wt='"Helvetica Neue", "Inter", Helvetica, Arial, sans-serif',Se=(e,r=2)=>String(Math.floor(e)).padStart(r,"0"),Ue=8,At=[{text:"PICTURE START",corner:"tl"},{text:"MONO · ACADEMY",corner:"bl"},{text:"REEL 02 OF 04",corner:"br"}];function Rt(e,r,a,t){e.beginPath(),e.moveTo(r-t,a),e.lineTo(r+t,a),e.moveTo(r,a-t),e.lineTo(r,a+t),e.stroke(),e.beginPath(),e.arc(r,a,t*.52,0,Math.PI*2),e.stroke()}const Ct=(e,r,a,t)=>{const n=a*.112,o=n,s=a-n,c=s-o,i=r/2,d=o+c/2,f=c*.325,p=(t%Ue+Ue)%Ue,b=p<7,k=Math.max(2,9-Math.ceil(p||1e-4)),R=e.createLinearGradient(0,o,0,s);R.addColorStop(0,"#101013"),R.addColorStop(.55,"#08080a"),R.addColorStop(1,"#0d0d10"),e.setTransform(1,0,0,1,0,0),e.fillStyle=R,e.fillRect(0,0,r,a),e.fillStyle="rgba(236,236,240,0.20)";const S=c/9,U=t*S*2.4%S,D=r*.011,m=S*.34;for(let y=o-S+U;y<s+S;y+=S)e.fillRect(r*.022,y,D,m),e.fillRect(r-r*.022-D,y,D,m);e.strokeStyle="rgba(238,238,244,0.16)",e.lineWidth=Math.max(1,a*.0016),e.beginPath(),e.moveTo(i,o),e.lineTo(i,s),e.moveTo(r*.06,d),e.lineTo(r*.94,d),e.stroke(),e.strokeStyle="rgba(238,238,244,0.30)";for(const y of["tl","tr","bl","br"]){const E=y.endsWith("l")?r*.085:r*.915,L=y.startsWith("t")?o+c*.16:s-c*.16;Rt(e,E,L,a*.024)}if(b){e.strokeStyle="rgba(240,240,246,0.42)",e.lineWidth=Math.max(1.4,a*.0032),e.beginPath(),e.arc(i,d,f,0,Math.PI*2),e.stroke(),e.strokeStyle="rgba(240,240,246,0.22)",e.beginPath(),e.arc(i,d,f*.845,0,Math.PI*2),e.stroke();const y=p%1*Math.PI*2,E=-Math.PI/2;e.fillStyle="rgba(244,244,250,0.085)",e.beginPath(),e.moveTo(i,d),e.arc(i,d,f,E,E+y),e.closePath(),e.fill(),e.strokeStyle="rgba(248,248,252,0.70)",e.lineWidth=Math.max(1.2,a*.0026),e.beginPath(),e.moveTo(i,d),e.lineTo(i+Math.cos(E+y)*f,d+Math.sin(E+y)*f),e.stroke(),e.strokeStyle="rgba(238,238,244,0.34)",e.lineWidth=Math.max(1,a*.002);for(let L=0;L<12;L+=1){const j=E+L/12*Math.PI*2,ne=L%3===0?f*1.055:f*1.028;e.beginPath(),e.moveTo(i+Math.cos(j)*ne,d+Math.sin(j)*ne),e.lineTo(i+Math.cos(j)*f*1.1,d+Math.sin(j)*f*1.1),e.stroke()}e.textAlign="center",e.textBaseline="middle",e.shadowColor="rgba(255,255,255,0.55)",e.shadowBlur=a*.03,e.fillStyle="#f6f6fa",e.font=`700 ${(f*1.28).toFixed(2)}px ${wt}`,e.fillText(String(k),i,d+f*.02),e.shadowBlur=0}else{const y=Math.max(0,1-(p-7)/.1);y>0&&(e.fillStyle=`rgba(250,250,252,${(y*.62).toFixed(3)})`,e.fillRect(0,o,r,c)),e.textAlign="center",e.textBaseline="middle",e.fillStyle="rgba(244,244,248,0.92)";const E=a*.052;e.font=`500 ${E.toFixed(2)}px ${Ne}`;const L="T H E   L O N G   Q U I E T";e.shadowColor="rgba(255,255,255,0.45)",e.shadowBlur=a*.02,e.fillText(L,i,d-E*.78),e.shadowBlur=0,e.font=`400 ${(E*.42).toFixed(2)}px ${Ne}`,e.fillStyle="rgba(232,232,238,0.60)",e.fillText("S C E N E   1 4   ·   T A K E   0 3",i,d+E*.62)}const T=a*.0255;e.font=`500 ${T.toFixed(2)}px ${Ne}`,e.textBaseline="middle",e.fillStyle="rgba(226,226,232,0.66)";for(const y of At){e.textAlign=y.corner.endsWith("l")?"left":"right";const E=y.corner.endsWith("l")?r*.055:r*.945;e.fillText(y.text,E,y.corner.startsWith("t")?o+c*.055:s-c*.055)}const B=Math.floor(t*24);e.textAlign="right",e.fillStyle="rgba(240,240,246,0.82)",e.fillText(`01:${Se(B/1440%60)}:${Se(B/24%60)}:${Se(B%24)}`,r*.945,o+c*.055),e.fillStyle="#000",e.fillRect(0,0,r,n),e.fillRect(0,s,r,n+1)},De=[{text:"SIGNAL HALTED",tone:"head"},{text:""},{text:"A fault was detected in the video subsystem and the raster"},{text:"driver was stopped to prevent damage to the display."},{text:""},{text:"*  If this screen appears again, power the unit down and let"},{text:"   the flyback transformer discharge before restarting."},{text:""},{text:"*  Horizontal deflection module HD-04 reported a bad sync"},{text:"   pulse on line 312 of field 2."},{text:""},{text:"Technical information:",tone:"bright"},{text:""},{text:"***  STOP: 0x0000CA7E  (0x0F13D0C0, 0x00000002, 0xC0000005)"},{text:"***  RASTER.SYS  -  address 8C1FA00E  base at 8C1F0000"},{text:""}],kt=(e,r,a,t)=>{const n=e.createLinearGradient(0,0,0,a);n.addColorStop(0,"#212ec0"),n.addColorStop(.62,"#1a22a4"),n.addColorStop(1,"#141a86"),e.setTransform(1,0,0,1,0,0),e.fillStyle=n,e.fillRect(0,0,r,a);const o=62,s=De.length+4,c=Math.min(a*.88/(s*1.44),r*.82/(o*.6));e.font=`600 ${c.toFixed(2)}px ${Ne}`;const i=e.measureText("M").width||c*.6,d=c*1.44,f=i*o,p=Math.round((r-f)/2),b=Math.round((a-s*d)/2);e.textBaseline="top",e.textAlign="left";const k=De[0].text,R=i*(k.length+4);e.fillStyle="#e9ecff",e.fillRect(Math.round((r-R)/2),b-c*.2,R,d),e.fillStyle="#161d92",e.fillText(k,Math.round((r-R)/2)+i*2,b),e.shadowColor="rgba(196,214,255,0.55)",e.shadowBlur=c*.3;let S=b+d;for(const m of De.slice(1))m.text&&(e.fillStyle=m.tone==="bright"?"#ffffff":m.tone==="dim"?"#aab6f0":"#dfe5ff",e.fillText(m.text,p,S)),S+=d;const U=Math.min(100,Math.floor((t%12+12)%12*22));e.fillStyle="#dfe5ff",e.fillText(U>=100?"Dump of video memory complete.":`Beginning dump of video memory: ${Se(U,2)}%`,p,S),S+=d*2;const D="Press any key to restart the deflection stage ";e.fillText(D,p,S),Math.floor(t*2)%2===0&&e.fillRect(p+i*D.length,S+c*.08,i*.9,c*.96),e.shadowBlur=0},Nt={0:".###.#...##..###.#.###..##...#.###.",1:"..#...##....#....#....#....#...###.",2:".###.#...#....#...#...#...#...#####",3:"####.....#....#.###.....#....#####.",4:"#..#.#..#.#..#.#####...#....#....#.",5:"######....####.....#....##...#.###.",6:".###.#....#....####.#...##...#.###.",7:"#####....#...#...#...#....#....#...",8:".###.#...##...#.###.#...##...#.###.",9:".###.#...##...#.####....#....#.###.",A:".###.#...##...#######...##...##...#",B:"####.#...##...#####.#...##...#####.",C:".#####....#....#....#....#.....####",D:"####.#...##...##...##...##...#####.",E:"######....#....####.#....#....#####",F:"######....#....####.#....#....#....",G:".#####....#....#..###...##...#.####",H:"#...##...##...#######...##...##...#",I:"#####..#....#....#....#....#..#####",J:"....#....#....#....##...##...#.###.",K:"#...##..#.#.#..##...#.#..#..#.#...#",L:"#....#....#....#....#....#....#####",M:"#...###.###.#.##...##...##...##...#",N:"#...###..##.#.##..###...##...##...#",O:".###.#...##...##...##...##...#.###.",P:"####.#...##...#####.#....#....#....",Q:".###.#...##...##...##.#.##..#..##.#",R:"####.#...##...#####.#.#..#..#.#...#",S:".#####....#.....###.....#....#####.",T:"#####..#....#....#....#....#....#..",U:"#...##...##...##...##...##...#.###.",V:"#...##...##...##...##...#.#.#...#..",W:"#...##...##...##...##.#.###.###...#",X:"#...##...#.#.#...#...#.#.#...##...#",Y:"#...##...#.#.#...#....#....#....#..",Z:"#####....#...#...#...#...#....#####"," ":"...................................","-":"...............#####...............",".":"..........................##...##..",":":"......##...##........##...##.......","!":"..#....#....#....#....#.........#..","?":".###.#...#....#..##...#.........#..","(":"..##..#....#....#....#....#.....##.",")":".##.....#....#....#....#....#..##..","/":"....#....#...#...#...#...#....#....","*":".....#.#.#.###.#####.###.#.#.#.....","'":"..#....#..........................."},_e=5,_t=7;function $e(e,r){return e.length?(e.length*(_e+1)-1)*r:0}function W(e,r,a,t,n,o){e.fillStyle=o;let s=a;for(const c of r.toUpperCase()){const i=Nt[c];if(i)for(let d=0;d<_t;d+=1)for(let f=0;f<_e;f+=1)i[d*_e+f]==="#"&&e.fillRect(s+f*n,t+d*n,n,n);s+=(_e+1)*n}}const Mt={1:"#1a1028",2:"#e0402c",3:"#f4f4f4",4:"#2ec4e8",5:"#22304a"},It=["....111111....","...13333331...","..1333333331..","..1355555531..","..1355555531..","..1333333331..","...13333331...","....111111....","...12222221...",".122222222221.",".124444444421.",".122222222221.","..1222222221.."],Lt={a:["...122..221...","...122..221...","..1111..1111.."],b:["..122....221..",".122......221.","1111......1111"],jump:["..122....221..",".1221....1221.",".111......111."]};function Ot(e,r,a,t,n){const o=[...It,...Lt[t]];for(let s=0;s<o.length;s+=1){const c=o[s];for(let i=0;i<c.length;i+=1){const d=Mt[c[i]];d&&(e.fillStyle=d,e.fillRect(r+i,a+s,1,1))}}}function Pt(e,r,a,t){e.fillStyle="#f4f8ff";const n=[[0,4,22,6],[4,1,14,4],[11,2,12,5],[2,8,20,3]];for(const[o,s,c,i]of n)e.fillRect(Math.round(r+o*t),Math.round(a+s*t),Math.round(c*t),Math.round(i*t))}function Be(e,r,a,t,n){e.fillStyle=n;for(let o=0;o<t;o+=1){const s=(t-o)*4;e.fillRect(Math.round(r-s/2),a-(o+1)*3,s,3)}}const Ce=10,Ve=[118,208],Ut=154,Dt=50,$t=22;function Bt(e,r,a){e.fillStyle="#20140c",e.fillRect(r,a,16,16),e.fillStyle="#d8902c",e.fillRect(r+1,a+1,14,14),e.fillStyle="#f0c060",e.fillRect(r+1,a+1,14,3),e.fillStyle="#8a5414",e.fillRect(r+1,a+11,14,3),e.fillStyle="#20140c",e.fillRect(r+6,a+5,4,2),e.fillRect(r+5,a+7,6,2),e.fillRect(r+6,a+9,4,2)}function Gt(e,r,a,t){const n=[8,6,2,6][t],o=n/2,s=n>3?1:0;e.fillStyle="#20140c",e.fillRect(r-o-1,a+1,n+2,8),e.fillRect(r-o,a-1,n,12),e.fillStyle="#ffe070",e.fillRect(r-o,a+1,n,8),e.fillRect(r-o+s,a,n-s*2,10),e.fillStyle="#fff8c8",e.fillRect(r-o+s,a+2,Math.max(1,o-s),4)}const Ft=(e,r,a,t)=>{const n=Ut,o=(t%Ce+Ce)%Ce,s=e.createLinearGradient(0,0,0,n);s.addColorStop(0,"#2440b8"),s.addColorStop(.55,"#5c94fc"),s.addColorStop(1,"#9ecbff"),e.setTransform(1,0,0,1,0,0),e.fillStyle=s,e.fillRect(0,0,r,a);for(let m=0;m<22;m+=1){const T=m*61%r,B=2+m*29%16;e.fillStyle=(m+Math.floor(t*3))%5===0?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.30)",e.fillRect(T,B,1,1)}for(const[m,T,B]of[[6,18,1.25],[3.5,32,.85]]){const y=r+80;for(let E=0;E<3;E+=1)Pt(e,(t*m+E*y/3)%y-50,T+E%2*5,B)}Be(e,48,n,9,"#2f7a3a"),Be(e,268,n,11,"#2f7a3a"),Be(e,160,n,6,"#3e9a48"),e.fillStyle="#3ca03c",e.fillRect(0,n,r,4),e.fillStyle="#2c7a2c",e.fillRect(0,n+4,r,2),e.fillStyle="#a05a28",e.fillRect(0,n+6,r,a-n-6),e.fillStyle="#7c4018";for(let m=n+6;m<a;m+=6){e.fillRect(0,m,r,1);for(let T=m%12===0?0:6;T<r;T+=12)e.fillRect(T,m,1,6)}const c=Math.floor(t*8)%4,i=[0,1,1,0][Math.floor(t*6)%4];for(const m of Ve)Bt(e,m,n-16),Gt(e,m+8,n-32-i,c);const d=Math.round(-24+o/Ce*(r+60));let f=0;for(const m of Ve){const T=(d-(m-28))/Dt;T>0&&T<1&&(f=Math.max(f,Math.sin(T*Math.PI)*$t))}const p=f>.5?"jump":Math.floor(t*9)%2===0?"a":"b";e.fillStyle="rgba(20,16,10,0.20)",e.fillRect(d+2,n-1,10,2),Ot(e,d,n-16-Math.round(f),p);for(const[m,T]of[["PLAYER-1",10],["GEMS 0"+(2+Math.floor(o/4)),96],["WORLD 1-1",174],["TIME "+Se(Math.max(0,384-Math.floor(t*2))%1e3,3),254]])W(e,String(m),Number(T),7,1,"#141428"),W(e,String(m),Number(T),6,1,"#ffffff");const b="RASTER RUN",k=$e(b,3),R=Math.round((r-k)/2);W(e,b,R+3,53,3,"#141028"),W(e,b,R,50,3,"#f8e038");const S=R+t*130%(k+110)-55;e.save(),e.beginPath(),e.rect(S,50,24,21),e.clip(),W(e,b,R,50,3,"#fffce0"),e.restore();const U="(C) 1987 THREEUI",D=Math.round((r-$e(U,1))/2);if(W(e,U,D,79,1,"#0e1430"),W(e,U,D,78,1,"#dfe8ff"),Math.floor(t*1.6)%2===0){const m="PUSH START",T=Math.round((r-$e(m,2))/2);W(e,m,T+2,100,2,"#141028"),W(e,m,T,98,2,"#ffffff")}},jt={cinematic:Ct,"blue-screen":kt,nintendo:Ft},Ht=`attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos,0.0,1.0); }`,zt=`precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uTime;
uniform float uMotion;
uniform vec2 uCurve;
uniform float uScan;
uniform float uScanDepth;
uniform float uTriad;
uniform float uGrille;
uniform float uChroma;
uniform float uBar;
uniform float uFlicker;
uniform float uGrain;
uniform float uNoise;
uniform float uVignette;
uniform float uMono;
uniform float uGain;
uniform float uHalo;
uniform vec3 uSheen;
uniform vec3 uRoom;

float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }

vec2 curve(vec2 uv){
  uv = uv*2.0-1.0;
  vec2 o = uv.yx*uv.yx;
  uv += uv * o * uCurve;
  uv = uv*0.5+0.5;
  return uv;
}

void main(){
  vec2 fuv = gl_FragCoord.xy / uRes;
  vec2 uv = curve(fuv);
  float t = uTime;

  /* analogue transport faults: per-row jitter, a rolling dropout band, and the
     head-switching scramble along the bottom edge of the raster */
  float band = 0.0;
  if (uNoise > 0.001){
    float row = floor(uv.y * 190.0);
    float gate = step(0.905, hash(vec2(row, floor(t*15.0))));
    uv.x += (hash(vec2(row*1.7, floor(t*15.0)+7.0)) - 0.5) * 0.052 * gate * uNoise;
    float pos = fract(uv.y * 0.8 - t * 0.17);
    band = smoothstep(0.075, 0.0, pos);
    uv.x += band * (hash(vec2(floor(uv.y*260.0), floor(t*26.0))) - 0.5) * 0.030 * uNoise;
    float head = smoothstep(0.030, 0.0, uv.y);
    uv.x += head * (hash(vec2(floor(uv.y*520.0), floor(t*22.0))) - 0.32) * 0.075 * uNoise;
    band = max(band, head);
  }

  vec2 inb = step(vec2(0.0), uv) * step(uv, vec2(1.0));
  float inside = inb.x*inb.y;
  vec2 ed = min(uv, 1.0-uv);
  inside *= smoothstep(0.0,0.020, min(ed.x,ed.y));

  vec2 dir = uv-0.5;
  float d2 = dot(dir,dir);
  vec2 ao = dir * (0.0010 + 0.0075*d2) * uChroma;
  vec3 col;
  col.r = texture2D(uTex, uv + ao).r;
  col.g = texture2D(uTex, uv).g;
  col.b = texture2D(uTex, uv - ao).b;

  /* phosphor halation: a wide cheap tap ring so bright glyphs bloom into the
     glass instead of relying on the text canvas alone */
  if (uHalo > 0.001){
    float s = 0.0038;
    vec3 wide = texture2D(uTex, uv + vec2( s, 0.0)).rgb
              + texture2D(uTex, uv + vec2(-s, 0.0)).rgb
              + texture2D(uTex, uv + vec2(0.0,  s)).rgb
              + texture2D(uTex, uv + vec2(0.0, -s)).rgb
              + texture2D(uTex, uv + vec2( s,  s)*0.72).rgb
              + texture2D(uTex, uv + vec2(-s, -s)*0.72).rgb;
    col += wide * (uHalo / 6.0);
  }

  float sl = sin(uv.y*3.14159265*uScan + t*4.0*uMotion);
  col *= mix(1.0 - uScanDepth, 1.0, sl*sl);

  float gx = gl_FragCoord.x * (6.2831853/max(uTriad, 1.0));
  vec3 grille = (1.0-uGrille) + uGrille*cos(gx + vec3(0.0,2.094,4.188));
  col *= mix(vec3(1.0), grille, step(0.001, uGrille));
  col *= uGain;

  float bar = fract(uv.y*0.5 - t*0.07*uMotion);
  bar = smoothstep(0.0,0.05,bar)*smoothstep(0.18,0.05,bar);
  col += bar*uBar*uMotion;

  float sheen = smoothstep(0.55,0.0, distance(uv, vec2(0.50,0.15)));
  col += sheen*0.030*uSheen;

  float vig = smoothstep(0.98,0.30, length((uv-0.5)*vec2(1.05,1.0)));
  col *= mix(1.0-uVignette, 1.0, vig);
  col *= 1.0 - uFlicker*uMotion*sin(t*8.0);

  if (uNoise > 0.001){
    float st = hash(fuv*uRes*0.5 + vec2(floor(t*24.0), floor(t*24.0)*1.7));
    col += (st-0.5)*0.135*uNoise;
    col += band*0.085*uNoise;
  }
  col += (hash(fuv + fract(t*0.37)) - 0.5)*uGrain;

  float luma = dot(col, vec3(0.2126,0.7152,0.0722));
  col = mix(col, vec3(luma), uMono);

  float spill = smoothstep(0.85,0.18, length(fuv-0.5))*0.05;
  vec3 room = uRoom + uSheen*spill*0.42;
  col = mix(room, col, inside);
  col = max(col, uRoom*0.34);
  gl_FragColor = vec4(col,1.0);
}`,Xe={variant:"terminal",speed:1,typeSpeed:1,motion:1,brightness:1,opacity:1,hue:0,saturation:1,userInput:"",inputPrompt:"enter username: "},He=e=>je[e]??je.terminal,l=(e,r="p")=>({t:e,c:r}),z=e=>"·".repeat(e),ve=[[l("CAMPUS MAINFRAME  v9.1.1"),l("   (c) 2026 Batch Node MCA","d")],[l("CONSTRUCT Broadcast  Rev M  S/N NX-0101-0011","d")],[],[l("Hacking Classroom grid nodes "),l(`${z(12)} `,"d"),l("OK","a")],[l("Neural Attendance Jack  0x000 "),l(`${z(10)} `,"d"),l("ONLINE "),l("OK","a")],[l("Pinging student seat signatures "),l(`${z(5)} `,"d"),l("46 ready")],[l("nav0  OPERATOR UPLINK SECURE ","d"),l(`${z(6)} `,"d"),l("READY","a")],[l("vis0  CODE RAIN DECRYPT 256bit ","d"),l("READY","a")],[l("net0  HARDLINE CONNECTION MAX ","d"),l(`${z(4)} `,"d"),l("LINK","a")],[l("red0  ANONYMOUS IDENTITY PROTOCOL ","d"),l(`${z(2)} `,"d"),l("ACTIVE","a")],[l("Mounting /dev/classroom -> DEVCLASS-MCA: "),l(`${z(4)} `,"d"),l("OK","a")],[l("Loading 46-seat visual matrix "),l(`${z(5)} `,"d"),l("OK","a")],[l("Syncing daily poll cutoff [ 08:00 AM ] "),l(`${z(2)} `,"d"),l("OK","a")],[l("Locating anonymous peer sector "),l(`${z(6)} `,"d"),l("100%")],[],[l("SYSTEM GATEWAY  "),l("ONLINE.","h")],[l("press "),l("[ENTER]","a"),l(" to continue with Google if no account","d")],[],[l("enter username: ")]],Ge=[[l("CAMPUS MAINFRAME v9.1"),l(" [MCA]","d")],[l("CONSTRUCT S/N NX-0101-0011","d")],[],[l("Classroom nodes "),l(".... ","d"),l("OK","a")],[l("Neural Attendance "),l(".. ","d"),l("ONLINE","a")],[l("Student seat matrix "),l(". ","d"),l("46 ready")],[l("nav0 OPERATOR "),l("...... ","d"),l("READY","a")],[l("vis0 CODE RAIN "),l("..... ","d"),l("READY","a")],[l("net0 HARDLINE "),l("...... ","d"),l("LINK","a")],[l("red0 ANONYMOUS "),l("..... ","d"),l("ACTIVE","a")],[l("Mount /dev/classroom "),l("OK","a")],[l("Spatial seat matrix "),l(". ","d"),l("OK","a")],[],[l("SYSTEM GATEWAY "),l("ONLINE.","h")],[l("AUTHENTICATE IDENTITY BELOW","a")],[],[l("enter username: ")]],qe={p:{fill:"#8df0b4",glow:"rgba(28,236,132,0.95)"},d:{fill:"#4f9a76",glow:"rgba(28,236,132,0.45)"},a:{fill:"#ffba5e",glow:"rgba(255,150,52,0.95)"},h:{fill:"#eafff3",glow:"rgba(120,255,190,0.95)"}},be=e=>e.reduce((r,a)=>r+a.t.length,0),Wt=Math.max(...ve.map(be)),Yt=1920,Kt=640,Je=24e5;function Ze(e,r,a){const t=e.createShader(r);if(!t)throw new Error("Unable to create CRT shader");if(e.shaderSource(t,a),e.compileShader(t),!e.getShaderParameter(t,e.COMPILE_STATUS))throw new Error(e.getShaderInfoLog(t)??"CRT shader compilation failed");return t}function Vt(e,r,a){const t=r.getContext("webgl",{antialias:!1,alpha:!1,depth:!1,premultipliedAlpha:!1});if(!t)throw new Error("CRT requires WebGL");const n=document.createElement("canvas"),o=n.getContext("2d");if(!o)throw new Error("CRT text canvas unavailable");const s=Ze(t,t.VERTEX_SHADER,Ht),c=Ze(t,t.FRAGMENT_SHADER,zt),i=t.createProgram();if(!i)throw new Error("Unable to create CRT program");if(t.attachShader(i,s),t.attachShader(i,c),t.linkProgram(i),!t.getProgramParameter(i,t.LINK_STATUS))throw new Error(t.getProgramInfoLog(i)??"CRT link failed");t.useProgram(i);const d=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,d),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),t.STATIC_DRAW);const f=t.getAttribLocation(i,"aPos");t.enableVertexAttribArray(f),t.vertexAttribPointer(f,2,t.FLOAT,!1,0,0);const p=C=>t.getUniformLocation(i,C),b=p("uTex"),k=p("uRes"),R=p("uTime"),S=p("uMotion"),U=p("uCurve"),D=p("uScan"),m=p("uScanDepth"),T=p("uTriad"),B=p("uGrille"),y=p("uChroma"),E=p("uBar"),L=p("uFlicker"),j=p("uGrain"),ne=p("uNoise"),u=p("uVignette"),N=p("uMono"),q=p("uGain"),Ee=p("uHalo"),xe=p("uSheen"),it=p("uRoom"),Te=t.createTexture();t.bindTexture(t.TEXTURE_2D,Te),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.uniform1i(b,0);let oe=1,J=1,ue=1,Ie=1,G=14,fe=20,we=0,Z=8,Ae=0,Re=0,pe=0,ie=!1,se=!0,Q=0,he=-1,le=-1,me="",ge="",ce="terminal",w=He(ce),Y=!1;const ze=performance.now(),Le=()=>{t.useProgram(i);const C=Y?.045:w.curve[0],x=Y?.065:w.curve[1];t.uniform2f(U,C,x),t.uniform1f(m,w.scanDepth),t.uniform1f(B,w.grille),t.uniform1f(y,w.chroma),t.uniform1f(E,w.bar),t.uniform1f(L,w.flicker),t.uniform1f(j,w.grain),t.uniform1f(ne,w.noise),t.uniform1f(u,w.vignette),t.uniform1f(N,w.mono),t.uniform1f(q,w.gain),t.uniform1f(Ee,w.halo),t.uniform3f(xe,w.sheen[0],w.sheen[1],w.sheen[2]),t.uniform3f(it,w.room[0],w.room[1],w.room[2]);const g=w.filtering==="nearest"?t.NEAREST:t.LINEAR;t.bindTexture(t.TEXTURE_2D,Te),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,g),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,g)},st=()=>{const C=Y?Ge:ve,x=Math.max(...C.map(be));if(Y){we=Math.max(16,J*.08);const g=Math.min(J*.52,600);fe=Math.max(18,g/C.length),G=Math.max(12,Math.min(fe*.72,oe*.9/(Math.max(x,1)*.62)))}else we=J*.135,fe=J*.74/ve.length,G=Math.max(5,Math.min(fe*.8,oe*.88/(Math.max(Wt,1)*.62)));o.font=`600 ${G.toFixed(2)}px ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace`,Z=o.measureText("M").width||G*.6},de=(C,x)=>{const g=qe[C];o.fillStyle=g.fill,o.shadowColor=x?g.glow:"transparent",o.shadowBlur=x?G*.38:0},lt=(C,x="",g="enter username: ")=>{const _=Y?Ge:ve,I=Math.max(..._.map(be));o.setTransform(1,0,0,1,0,0),o.fillStyle="#03100a",o.fillRect(0,0,oe,J),o.textAlign="left",o.textBaseline="top",o.font=`600 ${G.toFixed(2)}px ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace`;let O=C,P=we;const K=Math.max(16,Math.floor((oe-I*Z)/2));Ae=K,Re=we;for(let V=0;V<_.length;V++){const ee=_[V],ft=V===_.length-1,pt=be(ee),te=C===1/0?1/0:Math.min(O,pt);let H=K,Oe=0;if(ft){const X=g||"enter username: ";de("p",!0),o.fillText(X,H,P),de("p",!1),o.fillText(X,H,P),H+=Z*X.length,x&&(de("h",!0),o.fillText(x,H,P),de("h",!1),o.fillText(x,H,P),H+=Z*x.length)}else for(const X of ee){let re=X.t;if(te!==1/0){const Pe=te-Oe;if(Pe<=0)break;Pe<re.length&&(re=re.slice(0,Pe))}if(re.length&&(de(X.c,!0),o.fillText(re,H,P),de(X.c,!1),o.fillText(re,H,P),H+=Z*re.length),Oe+=X.t.length,te!==1/0&&Oe>=te)break}if(Ae=H,Re=P,te!==1/0&&(O-=te),P+=fe,te!==1/0&&O<=0)break}},ct=()=>{o.shadowColor=qe.p.glow,o.shadowBlur=G*.42,o.fillStyle="#bdf8d2",o.fillRect(Ae,Re+G*.06,Math.max(Z*.92,4),G*.96),o.shadowBlur=0,o.fillRect(Ae,Re+G*.06,Math.max(Z*.92,4),G*.96)},dt=()=>{t.bindTexture(t.TEXTURE_2D,Te),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!0),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,n),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),se=!1},We=()=>{const C=e.getBoundingClientRect();ue=Math.max(1,C.width),Ie=Math.max(1,C.height);const x=Math.min(typeof window>"u"?1:window.devicePixelRatio||1,2);let g=Math.max(Kt,Math.round(Math.min(ue*x,Yt))),_=Math.max(1,Math.round(g*Ie/ue));if(g*_>Je){const ee=Math.sqrt(Je/(g*_));g=Math.round(g*ee),_=Math.round(_*ee)}const I=w.surface,O=I.mode==="fixed"?I.width:I.mode==="cap"?Math.min(g,I.width):g,P=I.mode==="fixed"?I.height:Math.max(1,Math.round(O*_/g)),K=O<768||P>O*1.15||ue<680,V=K!==Y;Y=K,V&&Le(),(r.width!==g||r.height!==_)&&(r.width=g,r.height=_),(n.width!==O||n.height!==P)&&(n.width=O,n.height=P,oe=O,J=P,st(),he=-1,le=-1,Q=0,se=!0),t.useProgram(i),t.viewport(0,0,g,_),t.uniform2f(k,g,_),t.uniform1f(D,Math.max(120,Math.min(Ie*w.scanDensity,900))),t.uniform1f(T,Math.max(2,w.triadCss*g/ue))},ut=(C,x="",g="enter username: ")=>{const _=ie?1/0:Math.floor(pe),I=Math.floor((C-ze)/420)%2===0?1:0,O=ie?I!==le||x!==me||g!==ge:C-Q>42;_===he&&I===le&&x===me&&g===ge&&!O||!ie&&C-Q<=42&&_===he&&I===le&&x===me&&g===ge||(lt(_,x,g),I&&ct(),Q=C,he=_,le=I,me=x,ge=g,se=!0)};return Le(),{resize:We,render(C){const x=a(),g=je[x.variant]?x.variant:"terminal",_=x.userInput??"",I=x.inputPrompt??"enter username: ";g!==ce&&(ce=g,w=He(ce),Le(),pe=0,ie=!1,he=-1,le=-1,Q=0,me="",ge="",We());const O=(C-ze)*.001*x.speed,K=(Y?Ge:ve).reduce((V,ee)=>V+be(ee),0);ce==="terminal"?(ie||(pe+=4.4*x.typeSpeed,pe>=K&&(pe=K,ie=!0)),ut(C,_,I)):(C-Q>=w.redrawMs||se)&&(jt[ce](o,oe,J,O),Q=C,se=!0),se&&dt(),t.useProgram(i),t.uniform1f(R,O),t.uniform1f(S,x.motion),t.drawArrays(t.TRIANGLES,0,3)},dispose(){t.deleteBuffer(d),t.deleteTexture(Te),t.deleteProgram(i),t.deleteShader(s),t.deleteShader(c)}}}function Xt({className:e="",...r}){const a=A.useRef(null),t=A.useRef(null),n=A.useRef({...Xe,...r});n.current={...Xe,...r},A.useEffect(()=>{const s=a.current,c=t.current;if(!s||!c)return;const i=Vt(s,c,()=>n.current);let d=0,f=!0;const p=()=>{i.resize(),i.render(performance.now())},b=S=>{i.render(S),d=f&&!document.hidden?requestAnimationFrame(b):0},k=new ResizeObserver(p),R=new IntersectionObserver(([S])=>{f=(S==null?void 0:S.isIntersecting)??!0,f&&!d&&(d=requestAnimationFrame(b)),!f&&d&&(cancelAnimationFrame(d),d=0)});return k.observe(s),R.observe(s),p(),d=requestAnimationFrame(b),()=>{d&&cancelAnimationFrame(d),k.disconnect(),R.disconnect(),i.dispose()}},[]);const o=n.current;return h.jsx("div",{ref:a,className:`threeui-background crt crt-${o.variant}${e?` ${e}`:""}`,style:{background:He(o.variant).background,opacity:o.opacity,filter:`hue-rotate(${o.hue}deg) saturate(${o.saturation}) brightness(${o.brightness})`},children:h.jsx("canvas",{ref:t})})}const qt=`<!DOCTYPE html>\r
<html lang="en">\r
<head>\r
<meta charset="UTF-8">\r
<meta name="viewport" content="width=device-width, initial-scale=1">\r
<title>SYS.LINK — Uplink Sequence</title>\r
<link rel="preconnect" href="https://fonts.googleapis.com">\r
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\r
<link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@200..700&display=swap" rel="stylesheet">\r
<style>\r
  :root{\r
    /* design canvas: 1200 x 800 units, scaled to fit the viewport */\r
    --s: 1;\r
\r
    --bg:        #030806;\r
    --green:     #2fe07d;\r
    --green-dim: rgba(55,225,130,.26);\r
    --line:      rgba(120,255,185,.46);\r
    --ink-hi:    #d9f4e6;\r
  }\r
\r
  *{box-sizing:border-box;margin:0;padding:0}\r
  html,body{height:100%}\r
  body{\r
    background:var(--bg);\r
    overflow:hidden;\r
    font-family:"Geist Mono",ui-monospace,SFMono-Regular,Menlo,monospace;\r
    -webkit-font-smoothing:antialiased;\r
  }\r
\r
  /* a cold pool of light behind the rig */\r
  .pool{\r
    position:fixed; inset:0; pointer-events:none;\r
    background:radial-gradient(ellipse 60% 44% at 50% 52%,\r
      rgba(24,150,92,.17) 0%, rgba(16,104,66,.08) 38%, rgba(10,58,38,.025) 66%, transparent 100%);\r
  }\r
\r
  /* ── stage ── */\r
  .scene{position:fixed; inset:0; overflow:hidden}\r
  .stage{\r
    position:absolute; left:50%; top:50%; width:1200px; height:800px;\r
    transform:translate(-50%,-50%) scale(var(--s)); transform-origin:center;\r
  }\r
  .stage > *{position:absolute}\r
\r
  /* ── readout plate ── */\r
  .plate{\r
    left:530px; top:270px; width:140px; height:84px;\r
    background:var(--line);\r
    clip-path:polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px);\r
  }\r
  .plate::after{\r
    content:""; position:absolute; inset:1.2px;\r
    background:linear-gradient(180deg,#07251a,#041a12);\r
    clip-path:polygon(13px 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%, 0 13px);\r
  }\r
  .plate.hit{animation:plateHit .5s ease-out}\r
  @keyframes plateHit{0%{background:#c8ffe2}100%{background:var(--line)}}\r
\r
  .brk{width:9px;height:9px;pointer-events:none}\r
  .brk::before,.brk::after{content:""; position:absolute; background:var(--green); opacity:.9}\r
  .brk::before{width:9px;height:1.2px} .brk::after{width:1.2px;height:9px}\r
  .brk.tr{left:661px; top:270px} .brk.tr::before{right:0;top:0} .brk.tr::after{right:0;top:0}\r
  .brk.bl{left:530px; top:345px} .brk.bl::before{left:0;bottom:0} .brk.bl::after{left:0;bottom:0}\r
\r
  .readout{\r
    left:530px; top:284.9px; width:140px; height:0;\r
    text-align:center; line-height:1; white-space:pre;\r
    color:var(--green);\r
    text-shadow:0 0 4px rgba(70,235,145,.6), 0 0 14px rgba(48,210,125,.55), 0 0 36px rgba(32,175,105,.4);\r
    animation:neon 4.3s steps(1,end) infinite;\r
  }\r
  .readout b{font-size:47px; font-weight:280; letter-spacing:2.4px}\r
  .readout u{font-size:15px; font-weight:400; letter-spacing:0; text-decoration:none;\r
             opacity:.62; position:relative; top:-1px; left:3px}\r
  @keyframes neon{\r
    0%,40%{opacity:1} 41%{opacity:.55} 42%{opacity:1}\r
    67%{opacity:1} 68%{opacity:.72} 69.5%{opacity:1} 70.5%{opacity:.42} 71.5%{opacity:1}\r
  }\r
\r
  /* ── progress bar ── */\r
  .haze{left:298px; top:438px; width:0; height:0; pointer-events:none}\r
  .haze i{\r
    position:absolute; left:0; top:0;\r
    width:calc(var(--lit-w,0px) + 250px); height:250px;\r
    transform:translate(-125px,-128px);\r
    background:radial-gradient(ellipse 50% 50% at center,\r
      rgba(56,225,140,.26) 0%, rgba(46,200,126,.17) 22%,\r
      rgba(38,170,108,.082) 45%, rgba(30,140,90,.024) 70%, transparent 100%);\r
    filter:blur(6px);\r
    transition:width .16s linear;\r
  }\r
  .haze i.pulse{animation:hazePulse .3s ease-out}\r
  @keyframes hazePulse{0%{filter:blur(6px) brightness(1.3)}100%{filter:blur(6px) brightness(1)}}\r
\r
  .bar{left:298px; top:420px; width:604px; height:44px;\r
       display:flex; justify-content:space-between; align-items:flex-end}\r
  .tick{width:5.4px; height:32px; background:var(--green-dim); transform:skewX(12deg)}\r
  .tick.mk{height:44px}\r
  .tick.on{\r
    background:#33cf76;\r
    box-shadow:0 0 4px rgba(95,240,155,.6), 0 0 11px rgba(55,205,125,.32), 0 0 24px rgba(40,175,105,.16);\r
  }\r
  .tick.flash{animation:ignite .32s ease-out}\r
  @keyframes ignite{\r
    0%{background:#dcffec; box-shadow:0 0 11px rgba(200,255,225,1),0 0 28px rgba(85,230,150,.85),0 0 54px rgba(50,190,120,.45)}\r
    100%{background:#33cf76; box-shadow:0 0 4px rgba(95,240,155,.6),0 0 11px rgba(55,205,125,.32),0 0 24px rgba(40,175,105,.16)}\r
  }\r
\r
  .barlabel{left:298px; top:396.4px; font-size:20.4px; font-weight:500; letter-spacing:.9px;\r
    line-height:1; color:var(--ink-hi);\r
    text-shadow:0 0 3px rgba(200,250,225,.34), 0 0 11px rgba(120,235,175,.3), 0 0 26px rgba(60,195,130,.22)}\r
\r
  .status{\r
    left:0; top:507px; width:1200px; text-align:center;\r
    font-size:14px; font-weight:500; line-height:1; letter-spacing:1.42px; text-indent:1.42px;\r
    color:#9fd0b6; white-space:pre;\r
    text-shadow:0 0 3px rgba(185,240,215,.3), 0 0 10px rgba(110,220,160,.22);\r
  }\r
  .status .dots{letter-spacing:-1.9px; margin-left:-6px}\r
\r
  /* ── corner markers ── */\r
  .marker{width:0;height:0}\r
  .marker i{position:absolute; background:var(--green); opacity:.72}\r
  .marker .h{width:9px;height:1.2px} .marker .v{width:1.2px;height:9px}\r
  .marker .a-h{left:-17px;top:-17px}  .marker .a-v{left:-17px;top:-17px}\r
  .marker .b-h{left:8px;top:-17px}    .marker .b-v{left:15.8px;top:-17px}\r
  .marker .c-h{left:-17px;top:15.8px} .marker .c-v{left:-17px;top:8px}\r
  .marker .d-h{left:8px;top:15.8px}   .marker .d-v{left:15.8px;top:8px}\r
  .marker .dia{\r
    left:-4px; top:-4px; width:8px; height:8px; opacity:1;\r
    background:var(--green); transform:rotate(45deg);\r
    box-shadow:0 0 6px rgba(70,235,145,.7);\r
    animation:diaPulse 3.2s ease-in-out infinite;\r
  }\r
  @keyframes diaPulse{0%,100%{opacity:.55; transform:rotate(45deg) scale(.8)}50%{opacity:1; transform:rotate(45deg) scale(1)}}\r
  .m-tl{left:274px; top:340px}   .m-tr{left:926px; top:340px}\r
  .m-bl{left:274px; top:508px}   .m-br{left:926px; top:508px}\r
  .m-tr .dia{animation-delay:.5s} .m-bl .dia{animation-delay:1.1s} .m-br .dia{animation-delay:1.6s}\r
\r
  /* ── side rails ── */\r
  .rail{left:0; top:0; width:1200px; height:800px}\r
  .rail.right{transform:scaleX(-1)}\r
  .rail > *{position:absolute}\r
\r
  .rail .wire{left:104px; top:433px; width:92px; height:1.4px; background:rgba(120,255,185,.24)}\r
  .rail .cap{top:428px; height:5px; background:#2bd074; box-shadow:0 0 5px rgba(70,235,145,.6)}\r
  .rail .cap.a{left:104px; width:10px}\r
  .rail .cap.b{left:181px; width:15px; animation:capPulse 2.4s ease-in-out infinite}\r
  @keyframes capPulse{0%,100%{opacity:1}50%{opacity:.5}}\r
\r
  .mod{left:204px; top:404px; width:36px; height:62px}\r
  .mod > *{position:absolute; left:0}\r
  .mod .hatch{top:0; width:36px; height:2px; background:#cfe8da}\r
  .mod .ret{top:8px; left:3px; width:30px; height:30px; border-radius:50%;\r
            border:1.3px solid rgba(206,235,220,.82)}\r
  .mod .ret::before,.mod .ret::after{content:""; position:absolute; background:rgba(206,235,220,.45)}\r
  .mod .ret::before{left:-3.5px; top:13.6px; width:35px; height:1px}\r
  .mod .ret::after{left:13.6px; top:-3.5px; width:1px; height:35px}\r
  .mod .dot{top:12.5px; left:15.5px; width:5px; height:5px; border-radius:50%; background:var(--green);\r
            box-shadow:0 0 6px rgba(70,235,145,.9); animation:diaPulse 2.6s ease-in-out infinite}\r
  .mod .slab{top:46px; width:36px; height:5px; background:#dcefe4;\r
             clip-path:polygon(0 0,100% 0,100% 100%,5px 100%)}\r
  .mod .led{top:55px; height:2.6px; background:#9dc3b0}\r
  .mod .led:nth-of-type(1){left:0;     width:3px}\r
  .mod .led:nth-of-type(2){left:4.5px; width:4px}\r
  .mod .led:nth-of-type(3){left:27px;  width:4px}\r
  .mod .led:nth-of-type(4){left:33px;  width:3px}\r
\r
  /* ── overlays ── */\r
  .scan{position:fixed; inset:0; pointer-events:none; opacity:.18;\r
    background:repeating-linear-gradient(to bottom,\r
      rgba(160,255,205,.05) 0 calc(1px * var(--s)),\r
      transparent calc(1px * var(--s)) calc(3px * var(--s)))}\r
\r
  .grain{position:fixed; inset:-60px; pointer-events:none;\r
    background-repeat:repeat; background-size:80px 80px;\r
    animation:grainShift .6s steps(1,end) infinite}\r
  .grain.mul{mix-blend-mode:overlay; opacity:.40}\r
  .grain.add{opacity:.035; animation-duration:.72s}\r
  @keyframes grainShift{\r
    0%{transform:translate(0,0)}         20%{transform:translate(-22px,14px)}\r
    40%{transform:translate(17px,-19px)} 60%{transform:translate(-13px,-9px)}\r
    80%{transform:translate(9px,21px)}   100%{transform:translate(0,0)}\r
  }\r
\r
  .stage.reset{animation:resetGlitch .42s ease-out}\r
  @keyframes resetGlitch{\r
    0%{filter:brightness(1.8) saturate(.5)} 18%{filter:brightness(.32)}\r
    30%{filter:brightness(1.2)} 100%{filter:none}\r
  }\r
\r
  @media (prefers-reduced-motion: reduce){\r
    .grain,.readout,.marker .dia,.mod .dot,.rail .cap.b{animation:none !important}\r
  }\r
</style>\r
</head>\r
<body>\r
  <div class="pool"></div>\r
\r
  <div class="scene">\r
    <div class="stage" id="stage">\r
\r
      <div class="haze"><i id="haze"></i></div>\r
\r
      <div class="plate" id="plate"></div>\r
      <div class="brk tr"></div><div class="brk bl"></div>\r
      <div class="readout"><b id="num">50</b><u>%</u></div>\r
\r
      <div class="barlabel">UPLINK</div>\r
      <div class="bar" id="bar"></div>\r
      <div class="status">ESTABLISHING SECURE UPLINK<span class="dots" id="dots">...</span></div>\r
\r
      <div class="marker m-tl"><i class="h a-h"></i><i class="v a-v"></i><i class="h b-h"></i><i class="v b-v"></i><i class="h c-h"></i><i class="v c-v"></i><i class="h d-h"></i><i class="v d-v"></i><i class="dia"></i></div>\r
      <div class="marker m-tr"><i class="h a-h"></i><i class="v a-v"></i><i class="h b-h"></i><i class="v b-v"></i><i class="h c-h"></i><i class="v c-v"></i><i class="h d-h"></i><i class="v d-v"></i><i class="dia"></i></div>\r
      <div class="marker m-bl"><i class="h a-h"></i><i class="v a-v"></i><i class="h b-h"></i><i class="v b-v"></i><i class="h c-h"></i><i class="v c-v"></i><i class="h d-h"></i><i class="v d-v"></i><i class="dia"></i></div>\r
      <div class="marker m-br"><i class="h a-h"></i><i class="v a-v"></i><i class="h b-h"></i><i class="v b-v"></i><i class="h c-h"></i><i class="v c-v"></i><i class="h d-h"></i><i class="v d-v"></i><i class="dia"></i></div>\r
\r
      <div class="rail left">\r
        <div class="wire"></div><div class="cap a"></div><div class="cap b"></div>\r
        <div class="mod">\r
          <div class="hatch"></div>\r
          <div class="ret"></div>\r
          <div class="dot"></div>\r
          <div class="slab"></div>\r
          <i class="led"></i><i class="led"></i><i class="led"></i><i class="led"></i>\r
        </div>\r
      </div>\r
      <div class="rail right">\r
        <div class="wire"></div><div class="cap a"></div><div class="cap b"></div>\r
        <div class="mod">\r
          <div class="hatch"></div>\r
          <div class="ret"></div>\r
          <div class="dot"></div>\r
          <div class="slab"></div>\r
          <i class="led"></i><i class="led"></i><i class="led"></i><i class="led"></i>\r
        </div>\r
      </div>\r
\r
    </div>\r
  </div>\r
\r
  <div class="scan"></div>\r
  <div class="grain mul" id="grain"></div>\r
  <div class="grain add" id="grain2"></div>\r
\r
<script>\r
(() => {\r
  const TICKS = 56, MARK_EVERY = 8;\r
\r
  const root = document.documentElement;\r
  const fit = () => root.style.setProperty('--s', Math.min(innerWidth / 1200, innerHeight / 800));\r
  addEventListener('resize', fit, {passive:true});\r
  fit();\r
\r
  /* ---- bar ---- */\r
  const bar = document.getElementById('bar'), ticks = [];\r
  for (let i = 0; i < TICKS; i++){\r
    const t = document.createElement('i');\r
    t.className = 'tick' + ((i + 1) % MARK_EVERY === 0 ? ' mk' : '');\r
    bar.appendChild(t); ticks.push(t);\r
  }\r
\r
  /* ---- grain ---- */\r
  (function grain(){\r
    const N = 160;\r
    const make = fn => {\r
      const c = document.createElement('canvas'); c.width = c.height = N;\r
      const ctx = c.getContext('2d'), img = ctx.createImageData(N, N), d = img.data;\r
      for (let i = 0; i < N * N; i++) fn(d, i * 4);\r
      ctx.putImageData(img, 0, 0); return c.toDataURL();\r
    };\r
    const g = () => (Math.random() + Math.random() + Math.random() + Math.random()) / 4;\r
    document.getElementById('grain').style.backgroundImage =\r
      \`url(\${make((d,o) => { const v = 128 + (g() - .5) * 300;\r
        d[o] = d[o+1] = d[o+2] = Math.max(0, Math.min(255, v)); d[o+3] = 255; })})\`;\r
    document.getElementById('grain2').style.backgroundImage =\r
      \`url(\${make((d,o) => { const v = Math.random();\r
        d[o] = d[o+1] = d[o+2] = 255;\r
        d[o+3] = v < .86 ? 0 : Math.round((v - .86) / .14 * 190); })})\`;\r
  })();\r
\r
  /* ---- progress timeline ---- */\r
  const KF = [\r
    [0,0],[0.045,9],[0.115,9.6],[0.16,22],[0.205,23],[0.30,38],[0.345,39.5],\r
    [0.40,53],[0.475,54],[0.545,68],[0.60,69],[0.665,81],[0.735,82],\r
    [0.80,92],[0.855,93],[0.925,99],[0.985,99.4],[1.0,100]\r
  ];\r
  const RUN = 8600, HOLD = 1600, BLANK = 420, LOOP = RUN + HOLD + BLANK;\r
  const easeOut = x => 1 - Math.pow(1 - x, 2.1);\r
  const valueAt = u => {\r
    if (u >= 1) return 100;\r
    for (let i = 0; i < KF.length - 1; i++){\r
      const [t0,v0] = KF[i], [t1,v1] = KF[i+1];\r
      if (u <= t1) return v0 + (v1 - v0) * easeOut((u - t0) / (t1 - t0));\r
    }\r
    return 100;\r
  };\r
\r
  const PHASES = [\r
    [0,  'INITIALIZING CORE SYSTEMS'],\r
    [24, 'ESTABLISHING SECURE UPLINK'],\r
    [52, 'SYNCHRONIZING NODE ARRAY'],\r
    [78, 'DECRYPTING PAYLOAD STREAM'],\r
    [100,'UPLINK ESTABLISHED']\r
  ];\r
  const phaseFor = p => { let t = PHASES[0][1]; for (const [k,v] of PHASES) if (p >= k) t = v; return t; };\r
\r
  const num   = document.getElementById('num');\r
  const dots  = document.getElementById('dots');\r
  const haze  = document.getElementById('haze');\r
  const stage = document.getElementById('stage');\r
  const plate = document.getElementById('plate');\r
  const stat  = document.querySelector('.status');\r
\r
  const FREEZE = new URLSearchParams(location.search).get('p');\r
  const barW = 604, tickW = 5.4, gap = (barW - TICKS * tickW) / (TICKS - 1), pitch = tickW + gap;\r
\r
  let start = performance.now();\r
  let lastLit = -1, lastPct = -1, lastDots = -1, lastPhase = '', cycle = 0;\r
\r
  function frame(now){\r
    const e = (now - start) % LOOP;\r
    const c = Math.floor((now - start) / LOOP);\r
    if (c !== cycle){\r
      cycle = c;\r
      stage.classList.remove('reset'); void stage.offsetWidth; stage.classList.add('reset');\r
    }\r
\r
    let pct, visible = true;\r
    if (e < RUN)             pct = valueAt(e / RUN);\r
    else if (e < RUN + HOLD) pct = 100;\r
    else { pct = 0; visible = (e - RUN - HOLD) % 220 < 130; }\r
    if (FREEZE !== null){ pct = +FREEZE; visible = true; }\r
\r
    const shown = Math.round(pct);\r
    if (shown !== lastPct){\r
      num.textContent = String(shown);\r
      lastPct = shown;\r
      const ph = phaseFor(shown);\r
      if (ph !== lastPhase){ lastPhase = ph; stat.firstChild.nodeValue = ph; }\r
    }\r
    num.parentElement.style.opacity = visible ? '' : '.22';\r
\r
    const lit = Math.round(pct / 100 * TICKS);\r
    if (lit !== lastLit){\r
      for (let i = 0; i < TICKS; i++){\r
        const on = i < lit;\r
        if (ticks[i].classList.contains('on') !== on) ticks[i].classList.toggle('on', on);\r
      }\r
      if (lit > lastLit && lastLit >= 0 && lit > 0){\r
        const h = ticks[lit - 1];\r
        h.classList.remove('flash'); void h.offsetWidth; h.classList.add('flash');\r
        haze.classList.remove('pulse'); void haze.offsetWidth; haze.classList.add('pulse');\r
      }\r
      haze.style.setProperty('--lit-w', (lit > 0 ? (lit - 1) * pitch + tickW + gap / 2 : 0) + 'px');\r
      if (lit === TICKS){ plate.classList.remove('hit'); void plate.offsetWidth; plate.classList.add('hit'); }\r
      lastLit = lit;\r
    }\r
\r
    const d = shown >= 100 ? 0 : (FREEZE !== null ? 3 : Math.floor(((now - start) / 380) % 4));\r
    if (d !== lastDots){ dots.textContent = '...'.slice(0, d); lastDots = d; }\r
\r
    requestAnimationFrame(frame);\r
  }\r
  requestAnimationFrame(frame);\r
})();\r
<\/script>\r
</body>\r
</html>\r
`;function Qe({className:e="",style:r}){const[a,t]=A.useState(!1);return h.jsx("div",{className:`uplink-loader${e?` ${e}`:""}`,"data-state":a?"ready":"loading",style:{position:"relative",width:"100%",height:"100%",overflow:"hidden",background:"#030806",...r},children:h.jsx("iframe",{title:"SYS.LINK uplink progress loader",srcDoc:qt,sandbox:"allow-scripts",loading:"eager",onLoad:()=>t(!0),style:{position:"absolute",inset:0,display:"block",width:"100%",height:"100%",border:0,background:"#030806"}})})}const et={VITE_SUPABASE_ANON_KEY:"sb_publishable_IW-HGfT3LbTspa15JF3FDw_z_hdGLp0",VITE_SUPABASE_URL:"https://pnfeykttsvkajjqulcko.supabase.co",VITE_TELEGRAM_ADMIN_CHAT_ID:"5308059847",VITE_TELEGRAM_BOT_TOKEN:"8340392545:AAGMqIrBNV4b0FNQC75qCXEf0Gxx-mGzl8c",VITE_TELEGRAM_BOT_USERNAME:"JakpotGamingBot"},ye=typeof import.meta<"u"&&et?et:{},M=ye.VITE_SUPABASE_URL||"",v=ye.VITE_SUPABASE_ANON_KEY||"",tt=ye.VITE_TELEGRAM_BOT_TOKEN||"",rt=ye.VITE_TELEGRAM_ADMIN_CHAT_ID||"",Jt=String(ye.VITE_TELEGRAM_BOT_USERNAME||"JakpotGamingBot").replace(/^@/,"").trim(),$=()=>!!M&&!!v&&!M.includes("your-project-id")&&!v.includes("your-anon-key"),F="college_presence_user",ke=new Map,ae={isConfigured:$,getCurrentUser(){try{const e=localStorage.getItem(F);return e?JSON.parse(e):null}catch{return null}},async checkUsernameAvailability(e){const r=e.trim().toLowerCase();if(!r||r.length<3)return{available:!1,suggestions:[]};if(ke.has(r)){const a=ke.get(r);return{available:a,suggestions:a?[]:this.generateSuggestions(r)}}if(!$()){const t=!["admin","root","neo","matrix","prof"].includes(r);return ke.set(r,t),{available:t,suggestions:t?[]:this.generateSuggestions(r)}}try{const a=await fetch(`${M}/rest/v1/users?username=ilike.${encodeURIComponent(r)}&select=id`,{headers:{apikey:v,Authorization:`Bearer ${v}`}});if(!a.ok)throw new Error("Availability check query failed");const t=await a.json(),n=!t||t.length===0;return ke.set(r,n),{available:n,suggestions:n?[]:this.generateSuggestions(r)}}catch(a){return console.warn("Username query error, defaulting to available:",a),{available:!0,suggestions:[]}}},generateSuggestions(e){const r=e.replace(/[^a-z0-9_]/gi,""),a=Math.floor(10+Math.random()*89);return[`${r}_mca`,`the_${r}`,`${r}_${a}`,`cyber_${r}`]},async getUserByUsername(e){const r=e.trim().toLowerCase();if(!r)return null;if(!$())return{id:"usr_local_"+r,username:r,phoneNumber:"+91 98765 00000",catchphrase:"Local dev student",avatar:r.charAt(0).toUpperCase(),faceScanStatus:"verified"};try{const a=await fetch(`${M}/rest/v1/users?username=ilike.${encodeURIComponent(r)}&select=*`,{headers:{apikey:v,Authorization:`Bearer ${v}`}});if(a.ok){const t=await a.json();if(t&&t.length>0){const n=t[0],o=n.face_scan_status==="verified",s={id:n.id,username:n.username,phoneNumber:n.phone_number,catchphrase:n.catchphrase||"",avatar:n.username.charAt(0).toUpperCase(),avatarUrl:n.avatar_url||void 0,email:n.email,faceScanUrl:n.face_scan_url,faceScanStatus:n.face_scan_status,isApproved:o};return localStorage.setItem(F,JSON.stringify(s)),s}}return null}catch(a){return console.error("Error fetching user by username:",a),null}},async uploadFaceScan(e,r){if(!r)return null;if(!$())return r;try{const a=await(await fetch(r)).blob(),t=`${e.toLowerCase()}_${Date.now()}.jpg`;return(await fetch(`${M}/storage/v1/object/face-scans/${t}`,{method:"POST",headers:{apikey:v,Authorization:`Bearer ${v}`,"Content-Type":"image/jpeg"},body:a})).ok?`${M}/storage/v1/object/public/face-scans/${t}`:(console.warn("Storage upload returned error, using fallback preview"),r)}catch(a){return console.error("Failed to upload face scan to storage bucket:",a),r}},async notifyTelegramAdmin(e){if(!tt||!rt)return console.info("Telegram Bot Token or Admin Chat ID not yet set in .env. Skipping Telegram push."),!1;try{const r=await(await fetch(e.faceScanBase64)).blob(),a=new FormData;a.append("chat_id",rt),a.append("photo",r,"face_scan.jpg");const t=e.username.replace(/^@/,"").trim(),n=e.phoneNumber.trim();return a.append("caption",`🚨 *NEW STUDENT REGISTRATION - DEVCLASS MCA*

👤 *Username:* @${t}
📱 *Phone:* \`${n}\`
💬 *Bio:* _${e.catchphrase||"No catchphrase"}_
📅 *Time:* ${new Date().toLocaleTimeString()}

🔒 *Status:* ⏳ *PENDING ADMIN APPROVAL*
Account is currently restricted (cannot vote or reserve seats).
Review the biometric face scan above and tap below to approve or reject student participation.`),a.append("parse_mode","Markdown"),a.append("reply_markup",JSON.stringify({inline_keyboard:[[{text:"✅ APPROVE STUDENT",callback_data:`approve:${t}:${n}`},{text:"❌ REJECT",callback_data:`reject:${t}:${n}`}]]})),(await fetch(`https://api.telegram.org/bot${tt}/sendPhoto`,{method:"POST",body:a})).ok}catch(r){return console.error("Failed to dispatch alert to Telegram Bot:",r),!1}},async registerStudent(e){var t,n;const r=e.username.trim(),a=e.phoneNumber.trim();if(!r)return{error:"Username is required."};if(!a)return{error:"Phone number is required."};if(!e.faceScanBase64)return{error:"Biometric face scan is required for student verification record."};try{const o=await this.uploadFaceScan(r,e.faceScanBase64);let s;e.customAvatarBase64&&(s=await this.uploadFaceScan(r+"_avatar",e.customAvatarBase64)||void 0),this.notifyTelegramAdmin({username:r,phoneNumber:a,catchphrase:e.catchphrase||"",faceScanBase64:e.faceScanBase64});const c={id:"usr_"+Math.random().toString(36).substring(2,9),username:r,phoneNumber:a,catchphrase:((t=e.catchphrase)==null?void 0:t.trim())||"Ready for tomorrow",avatar:r.charAt(0).toUpperCase(),avatarUrl:s,email:((n=e.email)==null?void 0:n.trim())||void 0,faceScanUrl:o||void 0,faceScanStatus:"pending",isApproved:!1};if($())try{const i=await fetch(`${M}/rest/v1/users`,{method:"POST",headers:{apikey:v,Authorization:`Bearer ${v}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify({username:c.username,phone_number:c.phoneNumber,email:c.email||null,catchphrase:c.catchphrase,avatar_url:c.avatarUrl||null,face_scan_url:c.faceScanUrl,face_scan_status:"pending"})});if(i.ok){const d=await i.json();d&&d[0]&&(c.id=d[0].id)}fetch(`${M}/rest/v1/phone_verifications?phone_number=eq.${encodeURIComponent(a)}`,{method:"DELETE",headers:{apikey:v,Authorization:`Bearer ${v}`}}).catch(d=>console.warn("Cleanup warning:",d))}catch(i){console.warn("Database save failed, using local session:",i)}return localStorage.setItem(F,JSON.stringify(c)),{user:c}}catch(o){return{error:o.message||"Registration failed"}}},async signInWithUsername(e){const r=e.trim();if(!r)return{error:"Username cannot be empty."};if(!$()){const a={id:"user-"+r.toLowerCase().replace(/\s+/g,"-"),username:r,phoneNumber:"+91 98765 00000",catchphrase:"Classroom Batch 2026",avatar:r.charAt(0).toUpperCase(),faceScanStatus:"verified",isApproved:!0};return localStorage.setItem(F,JSON.stringify(a)),{user:a}}try{const a=await fetch(`${M}/rest/v1/users?username=ilike.${encodeURIComponent(r)}&select=*`,{headers:{apikey:v,Authorization:`Bearer ${v}`}});if(!a.ok)throw new Error(`Supabase query error: ${a.statusText}`);const t=await a.json();if(!t||t.length===0)return{error:`No registered account found for "${r}". Please sign up first.`};const n=t[0].face_scan_status==="verified",o={id:t[0].id,username:t[0].username,phoneNumber:t[0].phone_number,catchphrase:t[0].catchphrase||"Active Student",avatar:t[0].username.charAt(0).toUpperCase(),avatarUrl:t[0].avatar_url||void 0,email:t[0].email,faceScanUrl:t[0].face_scan_url,faceScanStatus:t[0].face_scan_status||"pending",isApproved:n};return localStorage.setItem(F,JSON.stringify(o)),{user:o}}catch(a){return console.error("Supabase query error:",a),{error:a.message||"Failed to authenticate user."}}},async updateCatchphrase(e,r){const a=this.getCurrentUser()||{id:e,username:"Student",catchphrase:r};if(a.catchphrase=r,localStorage.setItem(F,JSON.stringify(a)),$())try{await fetch(`${M}/rest/v1/users?id=eq.${encodeURIComponent(e)}`,{method:"PATCH",headers:{apikey:v,Authorization:`Bearer ${v}`,"Content-Type":"application/json"},body:JSON.stringify({catchphrase:r})})}catch(t){console.warn("Failed to patch catchphrase in Supabase:",t)}return a},async checkGoogleCallback(){var t,n,o;const e=window.location.hash,r=window.location.search;if(!e&&!r)return null;let a=null;if(e&&e.includes("access_token=")){const s=e.match(/access_token=([^&]+)/);s&&(a=s[1])}if(!a&&r&&r.includes("code=")){const s=r.match(/code=([^&]+)/);s&&(a=s[1])}if(!a)return null;try{const s=await fetch(`${M}/auth/v1/user`,{headers:{apikey:v,Authorization:`Bearer ${a}`}});if(!s.ok)return null;const c=await s.json();if(!c||!c.id)return null;const i={id:c.id,email:c.email||"",name:((t=c.user_metadata)==null?void 0:t.full_name)||((n=c.user_metadata)==null?void 0:n.name)||"",avatar:((o=c.user_metadata)==null?void 0:o.avatar_url)||""};window.history.replaceState(null,"",window.location.pathname);const d=await fetch(`${M}/rest/v1/users?or=(email.eq.${encodeURIComponent(i.email)},supabase_uid.eq.${encodeURIComponent(i.id)})&select=*`,{headers:{apikey:v,Authorization:`Bearer ${v}`}});if(d.ok){const f=await d.json();if(f&&f.length>0&&f[0].username&&f[0].face_scan_url){const p=f[0].face_scan_status==="verified",b={id:f[0].id,username:f[0].username,phoneNumber:f[0].phone_number,catchphrase:f[0].catchphrase||"",avatar:f[0].username.charAt(0).toUpperCase(),avatarUrl:f[0].avatar_url||void 0,email:f[0].email,faceScanUrl:f[0].face_scan_url,faceScanStatus:f[0].face_scan_status,isApproved:p};return localStorage.setItem(F,JSON.stringify(b)),{existingUser:b,needsSetup:!1}}}return{googleAccount:i,needsSetup:!0}}catch(s){return console.error("Error verifying Google OAuth callback:",s),null}},async signInWithGoogle(){if(!$()){const e={id:"google-user-"+Math.floor(Math.random()*1e3),username:"Student_Google",phoneNumber:"+91 98765 11111",catchphrase:"Logged in via Google OAuth",avatar:"G",email:"student@college.edu",faceScanStatus:"verified"};return localStorage.setItem(F,JSON.stringify(e)),{}}try{const e=encodeURIComponent(window.location.origin),r=`${M}/auth/v1/authorize?provider=google&redirect_to=${e}`;return window.location.href=r,{}}catch(e){return{error:e.message||"Failed to initiate Google sign in"}}},async createPhoneVerificationSession(){const e="VERIFY_"+Math.random().toString(36).substring(2,8).toUpperCase(),r=`https://t.me/${Jt}?start=${e}`;if($())try{await fetch(`${M}/rest/v1/phone_verifications`,{method:"POST",headers:{apikey:v,Authorization:`Bearer ${v}`,"Content-Type":"application/json"},body:JSON.stringify({code:e,verified:!1})})}catch(a){console.warn("Could not register verification session in Supabase:",a)}return{code:e,telegramLink:r}},async checkPhoneVerificationStatus(e){if(!$())return{verified:!1};try{const r=await fetch(`${M}/rest/v1/phone_verifications?code=eq.${encodeURIComponent(e)}&verified=eq.true&select=*`,{headers:{apikey:v,Authorization:`Bearer ${v}`}});if(r.ok){const a=await r.json();if(a&&a.length>0&&a[0].phone_number)return{verified:!0,phoneNumber:a[0].phone_number}}return{verified:!1}}catch{return{verified:!1}}},async verifyPhonePin(e){if(!$())return{valid:!1};try{const r=await fetch(`${M}/rest/v1/phone_verifications?pin=eq.${encodeURIComponent(e.trim())}&select=*`,{headers:{apikey:v,Authorization:`Bearer ${v}`}});if(r.ok){const a=await r.json();if(a&&a.length>0&&a[0].phone_number)return{valid:!0,phoneNumber:a[0].phone_number}}return{valid:!1}}catch{return{valid:!1}}},async updateProfilePicture(e,r){const t={...this.getCurrentUser()||{id:e,username:"student"},avatarUrl:r||void 0};if(localStorage.setItem(F,JSON.stringify(t)),$()&&e)try{await fetch(`${M}/rest/v1/users?id=eq.${encodeURIComponent(e)}`,{method:"PATCH",headers:{apikey:v,Authorization:`Bearer ${v}`,"Content-Type":"application/json"},body:JSON.stringify({avatar_url:r})})}catch(n){console.warn("Failed to sync profile picture to Supabase:",n)}return t},async checkApprovalStatus(e){if(!e||typeof e!="string"){const r=this.getCurrentUser();return(r==null?void 0:r.isApproved)??!1}if(!$()){const r=this.getCurrentUser();return(r==null?void 0:r.isApproved)??!0}try{const r=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e),a=e.replace(/^@/,"").trim(),t=r?`id=eq.${encodeURIComponent(e)}`:`or=(username.ilike.${encodeURIComponent(a)},username.ilike.@${encodeURIComponent(a)})`,n=await fetch(`${M}/rest/v1/users?${t}&select=face_scan_status,avatar_url,username`,{headers:{apikey:v,Authorization:`Bearer ${v}`}});if(n.ok){const o=await n.json();if(o&&o.length>0){const s=o[0].face_scan_status,c=s==="verified",i=this.getCurrentUser();return i&&(i.faceScanStatus=s,i.isApproved=c,o[0].avatar_url&&(i.avatarUrl=o[0].avatar_url),localStorage.setItem(F,JSON.stringify(i))),c}}}catch(r){console.warn("Approval status check warning:",r)}return!1},signOut(){localStorage.removeItem(F)}},Zt=A.lazy(()=>ot(()=>import("./Classroom-BgQIF8js.js"),__vite__mapDeps([0,1,2,3])).then(e=>({default:e.Classroom}))),Qt=A.lazy(()=>ot(()=>import("./AuthModal-CEy_i_9q.js"),__vite__mapDeps([4,1,5])).then(e=>({default:e.AuthModal})));function er(){const[e,r]=A.useState(()=>ae.getCurrentUser()),[a,t]=A.useState(()=>!!ae.getCurrentUser()),[n,o]=A.useState(!1),[s,c]=A.useState("AUTHENTICATING IDENTITY..."),[i,d]=A.useState("username"),[f,p]=A.useState(""),[b,k]=A.useState(""),R=A.useRef(null),S=A.useRef(null),[U,D]=A.useState(0);A.useEffect(()=>{if(typeof window>"u"||!window.visualViewport)return;const u=window.visualViewport,N=()=>{const q=Math.max(0,window.innerHeight-u.height-u.offsetTop);D(q)};return u.addEventListener("resize",N),u.addEventListener("scroll",N),()=>{u.removeEventListener("resize",N),u.removeEventListener("scroll",N)}},[]);const[m,T]=A.useState(!1),[B,y]=A.useState(null);A.useEffect(()=>{(async()=>{const N=await ae.checkGoogleCallback();N&&(N.needsSetup&&N.googleAccount?(y(N.googleAccount),T(!0)):N.existingUser&&j(N.existingUser))})()},[]);const E=async()=>{if(n||a||m)return;if(i==="username"){if(!f.trim()){L();return}d("password"),k(""),setTimeout(()=>{var Ee,xe;(Ee=S.current)==null||Ee.focus(),(xe=R.current)==null||xe.focus()},50);return}const u=f.trim();if(!u){d("username");return}o(!0),c(`AUTHENTICATING @${u.toUpperCase()}...`);const N=await ae.getUserByUsername(u);N?j(N):(c(`@${u.toUpperCase()} NOT FOUND // CONTINUING TO GOOGLE SIGN UP...`),setTimeout(()=>{L()},1500))};A.useEffect(()=>{const u=N=>{var q;if(!(m||a||n)){if(N.key==="Enter"){N.preventDefault(),E();return}if(N.key==="Escape"&&i==="password"){N.preventDefault(),d("username"),k("");return}document.activeElement!==R.current&&((q=R.current)==null||q.focus())}};return window.addEventListener("keydown",u),()=>window.removeEventListener("keydown",u)},[m,a,n,i,f,b]);const L=async()=>{if(!ae.isConfigured()){y({id:"google_local_"+Date.now(),email:"student@college.edu",name:"College Student",avatar:""}),T(!0);return}o(!0),c("CONNECTING TO GOOGLE AUTHENTICATION...");const u=await ae.signInWithGoogle();u.error&&(c(`AUTHENTICATION FAILED: ${u.error.toUpperCase()}`),setTimeout(()=>{o(!1)},3e3))},j=u=>{T(!1),r(u),o(!0),c(u.faceScanStatus==="pending"?`BIOMETRICS DISPATCHED TO TELEGRAM ADMIN // CONNECTING ${u.username.toUpperCase()}...`:`GOOGLE SSO VERIFIED // WELCOME ${u.username.toUpperCase()}...`),setTimeout(()=>{o(!1),t(!0)},3200)},ne=()=>{ae.signOut(),r(null),t(!1),y(null)};return a?h.jsx(A.Suspense,{fallback:h.jsx(Qe,{}),children:h.jsx(Zt,{currentUser:e,onSignOut:ne})}):h.jsxs("div",{className:"terminal-landing",onClick:()=>{var u;!m&&!n&&((u=R.current)==null||u.focus())},children:[h.jsx("input",{ref:R,type:i==="password"?"password":"text",className:"crt-hidden-input",value:i==="username"?f:b,onChange:u=>{i==="username"?p(u.target.value.replace(/[^a-zA-Z0-9_-]/g,"")):k(u.target.value)},onKeyDown:u=>{u.key==="Enter"?(u.preventDefault(),E()):u.key==="Escape"&&i==="password"?(u.preventDefault(),d("username"),k("")):u.key==="Backspace"&&i==="password"&&b===""&&(u.preventDefault(),d("username"))},autoCapitalize:"none",autoCorrect:"off",spellCheck:"false"}),n?h.jsxs("div",{className:"shader-frame",style:{width:"100%",height:"100%",position:"relative"},children:[h.jsx(Qe,{}),h.jsxs("div",{style:{position:"absolute",bottom:"40px",left:"50%",transform:"translateX(-50%)",color:"#8df0b4",fontFamily:"monospace",fontSize:"0.88rem",letterSpacing:"2px",textShadow:"0 0 10px rgba(28,236,132,0.8)",zIndex:20,textAlign:"center"},children:[h.jsx("div",{children:s}),h.jsx("div",{style:{fontSize:"0.72rem",opacity:.7,marginTop:"6px"},children:"ENCRYPTED PROTOCOL ACTIVE // DEVCLASS-MCA"})]})]}):h.jsxs("div",{className:"shader-frame",style:{width:"100%",height:"100%",position:"relative"},children:[h.jsx(Xt,{variant:"terminal",speed:1,typeSpeed:1,motion:1,hue:0,saturation:1,brightness:1,opacity:1,inputPrompt:i==="password"?"enter password: ":"enter username: ",userInput:i==="password"?"•".repeat(b.length):f}),h.jsxs("header",{className:"top-nav-bar",children:[h.jsxs("div",{className:"system-status-badge",children:[h.jsx("span",{className:"status-dot"}),h.jsx("span",{className:"badge-text-full",children:"NODE: DEVCLASS-MCA [ONLINE]"}),h.jsx("span",{className:"badge-text-mobile",children:"MCA [ONLINE]"})]}),h.jsxs("div",{className:"top-auth-buttons",children:[h.jsx("button",{type:"button",className:"nav-auth-btn signin",onClick:u=>{u.stopPropagation(),E()},title:"Sign In with entered username",children:"SIGN IN"}),h.jsx("button",{type:"button",className:"nav-auth-btn signup",onClick:u=>{u.stopPropagation(),L()},title:"Single Sign-On with Google",children:"SIGN UP (GOOGLE)"})]})]}),h.jsxs("div",{className:"mobile-terminal-dock",style:{transform:U>0?`translateY(-${U}px)`:void 0},onClick:u=>u.stopPropagation(),children:[h.jsxs("div",{className:"mobile-dock-header",children:[h.jsxs("div",{className:"mobile-dock-status",children:[h.jsx("span",{className:"mobile-dock-dot"}),h.jsx("span",{children:"MCA HANDHELD TERMINAL"})]}),h.jsx("div",{className:"mobile-dock-protocol",children:i==="password"?"ACCESS KEY PROTOCOL":"USER IDENT PROTOCOL"})]}),h.jsxs("div",{className:"mobile-cyber-input-wrap",children:[h.jsx("span",{className:"mobile-input-prompt",children:">"}),h.jsx("input",{ref:S,type:i==="password"?"password":"text",className:"mobile-cyber-input",placeholder:i==="password"?"Enter passkey...":"Enter student username...",value:i==="username"?f:b,onChange:u=>{i==="username"?p(u.target.value.replace(/[^a-zA-Z0-9_-]/g,"")):k(u.target.value)},onKeyDown:u=>{u.key==="Enter"?(u.preventDefault(),E()):u.key==="Escape"&&i==="password"&&(u.preventDefault(),d("username"),k(""))},autoCapitalize:"none",autoCorrect:"off",spellCheck:"false"}),(i==="username"&&f||i==="password"&&b)&&h.jsx("button",{type:"button",className:"mobile-clear-btn",onClick:()=>{var u;i==="username"?p(""):k(""),(u=S.current)==null||u.focus()},"aria-label":"Clear input",children:"✕"}),h.jsx("button",{type:"button",className:"mobile-cyber-submit-btn",onClick:E,children:i==="password"?"CONNECT ↵":f.trim()?"NEXT ➔":"SIGN IN ↵"})]}),h.jsxs("div",{className:"mobile-dock-actions",children:[i==="password"?h.jsx("button",{type:"button",className:"mobile-back-btn",onClick:()=>{d("username"),k(""),setTimeout(()=>{var u;return(u=S.current)==null?void 0:u.focus()},50)},children:"← BACK"}):null,h.jsxs("button",{type:"button",className:"mobile-google-btn",onClick:L,children:[h.jsxs("svg",{width:"18",height:"18",viewBox:"0 0 24 24","aria-hidden":"true",children:[h.jsx("path",{fill:"#4285F4",d:"M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"}),h.jsx("path",{fill:"#34A853",d:"M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"}),h.jsx("path",{fill:"#FBBC05",d:"M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"}),h.jsx("path",{fill:"#EA4335",d:"M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"})]}),h.jsx("span",{children:"SIGN IN WITH GOOGLE SSO"})]})]})]})]}),m&&h.jsx(A.Suspense,{fallback:null,children:h.jsx(Qt,{googleAccount:B,onClose:()=>T(!1),onAuthSuccess:j})})]})}Fe.createRoot(document.getElementById("root")).render(h.jsx(mt.StrictMode,{children:h.jsx(er,{})}));export{h as j,ae as s};
