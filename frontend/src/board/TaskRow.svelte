<script>
 import StateIcon from './StateIcon.svelte';
 import {elapsed} from './format.js';
 let {task,now,onopen,today}=$props();
 const overdue=$derived(task.status!=='완료'&&task.due_date&&task.due_date<today);
</script>
<button class="request-row" onclick={()=>onopen(task.id)}>
 <StateIcon state={task.state}/>
 <span class="request-main"><strong>{task.title}</strong><span>{task.requester}{task.department?' · '+task.department:''} · {task.channel}</span></span>
 <span class="request-end"><span class="request-status">{task.status}{task.priority==='높음'?' · 중요':''}</span><small class:overdue>{task.due_date?`기한 ${task.due_date}`:'기한 미지정'}</small><small>{task.status==='완료'?'처리 완료':'접수 후 '+elapsed(Date.parse(task.created_at),now)}</small></span>
</button>
<style>
 .request-row{width:100%;display:flex;align-items:center;gap:13px;padding:17px 12px;border:1px solid transparent;border-radius:11px;background:rgb(255 255 255 / .045);color:#e9edf7;text-align:left;cursor:pointer;font:inherit;transition:background .15s,border-color .15s}
 .request-row:hover,.request-row:focus-visible{background:rgb(255 255 255 / .09);border-color:#ffffff30;outline:2px solid transparent}.request-main{min-width:0;flex:1;display:flex;flex-direction:column;gap:8px}.request-main strong{font-size:13px;line-height:1.6;overflow-wrap:anywhere}.request-main>span{font-size:11px;color:#a7b3ca}.request-end{display:flex;flex-direction:column;gap:6px;text-align:right;flex-shrink:0}.request-status{font-size:11px;font-weight:600}.request-end small{font-size:10px;color:#93a3bf}.request-end .overdue{color:#ffab94}@media(max-width:500px){.request-row{gap:8px;padding:13px 8px}.request-main strong{font-size:12px}.request-end small{font-size:9px}}
</style>
