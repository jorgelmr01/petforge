import{l as k,n as S,S as u,t as E,f as M,o as b,H as T,q as m,s as f,r as B,a as q,G as L}from"./index-Bv67413O.js";function P(){const o=()=>L.ctx,d=document.createElement("div");d.className="page";let c=0,i=null;const l=()=>o().state;function g(){const e=l();d.innerHTML=`
      <div class="page-head"><h1>🧙 Keeper</h1><div class="sub">Your legend, on record.</div></div>
      <div class="keeper-scroll" id="kscroll"></div>
    `,p();const s=r=>{if(i&&i.isConnected){const n=i.getContext("2d");n.clearRect(0,0,190,190),n.imageSmoothingEnabled=!1,q(n,o().assets,e.species,e.form,Object.values(e.traits).filter(Boolean),{x:95,y:172,scale:1.35,t:r})}c=requestAnimationFrame(s)};c=requestAnimationFrame(s)}function p(){const e=l(),s=d.querySelector("#kscroll"),r=k(e),n=S(e.bond),w=Object.keys(u).map(t=>{const a=e.traits[t];return a?`<div class="chip">⚡${E(a).name}</div>`:`<div class="chip" style="opacity:.4">${u[t]}: —</div>`}).join("");s.innerHTML=`
      <div class="pet-card">
        <canvas id="pet-preview" width="190" height="190"></canvas>
        <div class="pname">${x(e.name)}</div>
        <div class="psub">${e.form==="prime"?"PRIME":"Sprout"} ${h()} · Bond Lv.${e.bond}${e.bond>=10?" 💛 Soulbound":""}</div>
        <div class="power-big">⚡ ${M(e)}</div>
        <div style="font-size:12px;color:#b9aec9">POWER</div>
        <div style="text-align:left;margin-top:10px">
          <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:800"><span>Bond XP</span><span>${e.bondXp}/${e.bond>=10?"MAX":n}</span></div>
          <div class="bond-bar"><div class="fill" style="width:${e.bond>=10?100:e.bondXp/n*100}%"></div></div>
          ${e.form==="sprout"?'<div style="font-size:12px;color:#b366ff;font-weight:700">🌟 Evolves to PRIME at Bond 5 — new look, +25 power, Epic traits unlock!</div>':""}
        </div>
      </div>

      <div class="section-title">⚡ Power breakdown</div>
      <div style="background:var(--panel);border-radius:16px;padding:6px 14px;border:1px solid rgba(255,255,255,.09)">
        ${r.map(t=>`<div class="kv"><span class="k">${t.label}</span><span class="v">+${t.value}</span></div>`).join("")}
        <div class="kv"><span class="k">Mood (${y()})</span><span class="v">${b(e)>=80?"+bonus ✓":"—"}</span></div>
      </div>

      <div class="section-title">✨ Fused traits</div>
      <div class="loadout">${w}</div>

      <div class="section-title">🏕️ Den habitat</div>
      <div class="hab-row" id="habs"></div>

      <div class="section-title">📊 Lifetime stats</div>
      <div style="background:var(--panel);border-radius:16px;padding:6px 14px;border:1px solid rgba(255,255,255,.09)">
        ${[["Meals served",e.stats.feeds],["Play sessions",e.stats.plays],["Bath times",e.stats.cleans],["Naps taken",e.stats.rests],["Head pats",e.stats.pets],["Traits fused",e.stats.fusions],["Battles won",e.stats.battlesWon],["Trials cleared",e.clearedTrials.length+"/5"]].map(([t,a])=>`<div class="kv"><span class="k">${t}</span><span class="v">${a}</span></div>`).join("")}
      </div>

      <div class="section-title">⚙️ Settings</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn ghost" id="mute-btn">${e.muted?"🔇 Unmute":"🔊 Mute"}</button>
        <button class="btn ghost" id="reset-btn">🗑️ Reset save</button>
      </div>
      <div style="text-align:center;color:#b9aec9;font-size:11px;margin:18px 0 6px">PETFORGE v1.0 · all data stays on your phone 💜</div>
    `,i=s.querySelector("#pet-preview");const $=s.querySelector("#habs");for(const t of Object.values(T)){const a=document.createElement("button");a.className="hab-card"+(e.habitat===t.id?" on":"");const v=o().assets.habitats.get(t.id);a.innerHTML=`${v?`<img src="${v.src}" alt="${t.name}">`:""}<div class="hn">${t.name}</div>`,a.title=t.desc,a.onclick=()=>{e.habitat=t.id,m(e),f.play("pop"),o().toast(`Moved to ${t.name}! 🏕️`),p()},$.appendChild(a)}s.querySelector("#mute-btn").onclick=t=>{e.muted=!e.muted,f.muted=e.muted,m(e),t.target.textContent=e.muted?"🔇 Unmute":"🔊 Mute"},s.querySelector("#reset-btn").onclick=()=>{window.confirm("Reset everything? Your pet will be gone forever. 😢")&&(B(),window.location.reload())}}function h(){return{embercub:"Embercub",tidepup:"Tidepup",galekit:"Galekit"}[l().species]}function y(){const e=b(l());return e>=80?"Radiant":e>=60?"Content":e>=40?"Meh":"Grumpy"}function x(e){return e.replace(/[&<>"']/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[s])}return{name:"keeper",mount(e){e.appendChild(d),g()},unmount(){cancelAnimationFrame(c),i=null}}}export{P as make};
