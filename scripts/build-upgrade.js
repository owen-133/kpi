import {readFileSync,writeFileSync} from 'node:fs';
const files=['schema.sql','settings.sql','deletion.sql','kpi.sql','edit.sql'];
const sql=files.map(name=>'-- '+name+'\n'+readFileSync(new URL('../supabase/'+name,import.meta.url),'utf8').replace(/^begin;\s*$/gm,'').replace(/^commit;\s*$/gm,'')).join('\n\n');
writeFileSync(new URL('../supabase/upgrade.sql',import.meta.url),'-- 누적 업그레이드: 기존 업무를 삭제하지 않습니다. 재실행 가능합니다.\nbegin;\n'+sql+'\ncommit;\n');
