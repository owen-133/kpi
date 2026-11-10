export class ChecklistError extends Error {}
export type ChecklistChange = { readonly kind: 'toggle'; readonly line: number; readonly done: boolean } | { readonly kind: 'add'; readonly title: string };
export type ChecklistLine = { readonly line: number; readonly text: string; readonly done: boolean };
const ITEM = /^(\s*(?:\d+[.)]|[-*])\s+)(?:\[([ xX])\]\s*)?(\S.*)$/;
export function checklistItems(description: string): ChecklistLine[] {
  return description.split('\n').flatMap((text,line) => {
    const match=ITEM.exec(text);
    return match ? [{line,text:match[3],done:match[2]?.toLowerCase()==='x'}] : [];
  });
}
export function changeChecklist(description: string, change: ChecklistChange): {description: string; reason: string} {
  let next: string, reason: string;
  if(change.kind==='add') {
    const title=change.title.trim();
    if(!title || title.length>1000 || /[\r\n]/.test(title)) throw new ChecklistError('하위 업무는 한 줄로 1~1000자 입력하세요.');
    next=description+(description && !description.endsWith('\n')?'\n':'')+'- [ ] '+title;
    reason='하위 업무 추가: '+title.slice(0,900);
  } else {
    const lines=description.split('\n');
    const item=checklistItems(description).find(item=>item.line===change.line);
    if(!item) throw new ChecklistError('하위 업무를 다시 확인하세요.');
    const match=ITEM.exec(lines[change.line])!;
    lines[change.line]=match[1]+'['+(change.done?'x':' ')+'] '+match[3];
    next=lines.join('\n');
    reason='하위 업무 '+(change.done?'완료':'미완료')+': '+item.text.slice(0,900);
  }
  if(next.length>10000) throw new ChecklistError('상세 내용은 하위 업무를 포함해 10000자까지 입력할 수 있습니다.');
  return {description:next,reason};
}
