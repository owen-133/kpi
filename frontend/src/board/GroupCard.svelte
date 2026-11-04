<!-- Adapted from Claude Board GroupCard.svelte; see THIRD_PARTY_NOTICES.md.
     Desktop session controls replaced by read-only group presentation and web task navigation. -->
<script>
 import StateIcon from './StateIcon.svelte';
 import Icon from './Icon.svelte';
 import TaskRow from './TaskRow.svelte';
 import {urgent,stateRgb,active} from './format.js';
 let {g,now,onopen,compact=false}=$props();
 let collapsed=$state(false),endedOpen=$state(false);
 const top=$derived(urgent(g));
 const c=$derived(stateRgb(top));
 const busy=$derived(active(g));
 const lead=$derived(busy[0]);
 const live=$derived(g.sessions.filter(s=>s.status!=='완료'));
 const ended=$derived(g.sessions.filter(s=>s.status==='완료'));
 const counts=$derived(['waiting','working','paused','idle'].map(st=>({st,n:g.sessions.filter(s=>s.state===st).length})).filter(x=>x.n));
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());
</script>
<div class="card" class:waiting={top==='waiting'} style:--c={c}>
 <button class="head" aria-expanded={!collapsed} onclick={()=>collapsed=!collapsed}>
  <span class="chev" class:open={!collapsed}><Icon name="chevron-right" size={11}/></span>
  <span class="folder">{#if collapsed&&lead}<StateIcon state={lead.state}/>{:else}<Icon name="folder" size={14}/>{/if}</span>
  <span class="names"><span class="name">{g.name}</span><span class="path">{#if collapsed&&lead}{lead.status} · {lead.title}{:else}전체 {g.sessions.length}건 · 미완료 {live.length}건{/if}</span></span>
  <span class="counts">{#each counts as x}<span class="count"><span class="dot" style:background="rgb({stateRgb(x.st)})"></span>{x.n}</span>{/each}</span>
 </button>
 {#if !collapsed&&!compact}<div class="body">{#each live as task (task.id)}<TaskRow {task} {now} {onopen} {today}/>{/each}
 {#if ended.length}<button class="completed-toggle" aria-expanded={endedOpen} onclick={()=>endedOpen=!endedOpen}><span>{endedOpen?'▾':'▸'} 완료 업무 {ended.length}건</span><span>이력 보기</span></button>{#if endedOpen}{#each ended as task (task.id)}<TaskRow {task} {now} {onopen} {today}/>{/each}{/if}{/if}
 </div>{:else if compact&&!collapsed}<div class="compact-list">{#each g.sessions.slice(0,3) as task}<button onclick={()=>onopen(task.id)}><StateIcon state={task.state} scale={.7}/><span>{task.title}</span></button>{/each}{#if g.sessions.length>3}<small>상세 보기에서 나머지 {g.sessions.length-3}건을 확인하세요.</small>{/if}</div>{/if}
</div>
<style>

  .card {
    position: relative;
    padding: 12px;
    border-radius: 16px;
    background: linear-gradient(135deg, rgb(var(--c) / 0.1), rgb(255 255 255 / 0.03));
    box-shadow:
      inset 0 0 0 1px rgb(var(--c) / 0.22),
      0 3px 8px rgb(0 0 0 / 0.25);
    transition:
      box-shadow 0.4s ease-in-out,
      background 0.4s ease-in-out;
  }
  /* 승인 대기가 있으면 테두리와 빛이 2.4초 주기로 천천히 숨 쉰다 */
  .card.waiting {
    box-shadow: inset 0 0 0 1px rgb(var(--c) / 0.25);
  }
  .card.waiting::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 16px;
    pointer-events: none;
    box-shadow:
      inset 0 0 0 1px rgb(var(--c) / 0.55),
      0 3px 12px rgb(var(--c) / 0.35);
    animation: breathe 2.4s ease-in-out infinite;
  }
  @keyframes breathe {
    0%,
    100% {
      opacity: 0;
    }
    50% {
      opacity: 1;
    }
  }
  .head {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    margin: -6px;
    padding: 6px;
    border-radius: 10px;
    cursor: pointer;
    outline: none;
    transition: background 0.15s;
  }
  .head:hover {
    background: rgb(255 255 255 / 0.06);
  }
  .chev {
    display: grid;
    place-items: center;
    width: 10px;
    flex: none;
    color: var(--fg2);
    opacity: 0.6;
  }
  .head:hover > .chev {
    opacity: 1;
  }
  .chev :global(svg) {
    transition: transform 0.38s cubic-bezier(0.3, 1.2, 0.5, 1);
  }
  .chev.open :global(svg) {
    transform: rotate(90deg);
  }
  .folder {
    flex: none;
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    color: rgb(var(--c));
    background: rgb(var(--c) / 0.16);
  }
  .names {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .name {
    font-size: 15px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .path {
    font-size: 11px;
    color: var(--fg2);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    direction: rtl;
    text-align: left;
  }
  .counts {
    display: flex;
    gap: 6px;
    flex: none;
    color: var(--fg2);
  }
  .count {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
    font-weight: 600;
  }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 8px;
  }

 .head{border:0;background:transparent;width:calc(100% + 12px);text-align:left;font:inherit;color:#e7edfa}.head:focus-visible{outline:2px solid #8da4cc;outline-offset:2px}.name{font-size:14px}.path{font-size:10px;direction:ltr;color:#9daec9;line-height:1.6}.head .counts{gap:7px}.completed-toggle{display:flex;justify-content:space-between;background:transparent;border:0;color:#9fafc7;font-size:11px;padding:12px 7px;cursor:pointer}.compact-list{padding-top:14px;display:flex;flex-direction:column;gap:12px}.compact-list button{display:flex;gap:8px;border:0;background:transparent;color:#cbd6eb;font:inherit;font-size:12px;text-align:left;cursor:pointer}.compact-list button span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.compact-list small{color:#98a9c5;font-size:10px}
 @media(prefers-reduced-motion:reduce){.card.waiting::after{animation:none}}
</style>
