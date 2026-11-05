export const editableFields=['title','requester','department','channel','category','priority','requested_at','due_date','description'];
export const fieldNames={title:'업무명',requester:'요청자',department:'부서',channel:'접수 경로',category:'업무 분류',priority:'중요도',requested_at:'요청받은 시각',due_date:'처리 기한',description:'상세내용'};
export function editChanges(task,values){return Object.fromEntries(editableFields.filter(k=>k==='requested_at'?Date.parse(task[k])!==Date.parse(values[k]):task[k]!==values[k]).map(k=>[k,{before:task[k],after:values[k]}]));}
