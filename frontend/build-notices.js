import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const license=read('frontend/node_modules/svelte/LICENSE.md');
mkdirSync(new URL('third_party/svelte/',root),{recursive:true});
writeFileSync(new URL('third_party/svelte/LICENSE.md',root),license);
writeFileSync(new URL('public/THIRD_PARTY_NOTICES.txt',root),read('THIRD_PARTY_NOTICES.md')+'\n\nSvelte license\n\n'+license);
writeFileSync(new URL('public/CLAUDE_BOARD_LICENSE.txt',root),read('third_party/claude-board/LICENSE'));

let extra='';
for(const [name,file] of [['clsx','license'],['esm-env','LICENSE']]){
 const contents=read('frontend/node_modules/'+name+'/'+file);
 mkdirSync(new URL('third_party/'+name+'/',root),{recursive:true});
 writeFileSync(new URL('third_party/'+name+'/LICENSE',root),contents);
 extra+='\n\n'+name+' license\n'+contents;
}
writeFileSync(new URL('public/THIRD_PARTY_NOTICES.txt',root),read('public/THIRD_PARTY_NOTICES.txt')+extra);
