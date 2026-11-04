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

for(const [name,file] of [['pdf-lib','LICENSE.md'],['@pdf-lib/standard-fonts','LICENSE.md'],['@pdf-lib/upng','LICENSE'],['pako','LICENSE'],['tslib','LICENSE.txt']]){
 const contents=read('frontend/node_modules/'+name+'/'+file);
 const dir=name.replace('@','').replaceAll('/','-');
 mkdirSync(new URL('third_party/'+dir+'/',root),{recursive:true});
 writeFileSync(new URL('third_party/'+dir+'/LICENSE',root),contents);
 writeFileSync(new URL('public/THIRD_PARTY_NOTICES.txt',root),read('public/THIRD_PARTY_NOTICES.txt')+'\n\n'+name+' license\n'+contents);
}
writeFileSync(new URL('public/THIRD_PARTY_NOTICES.txt',root),read('public/THIRD_PARTY_NOTICES.txt')+'\n\nNanum Gothic font license\n'+read('third_party/nanum-gothic/OFL.txt'));

writeFileSync(new URL('public/THIRD_PARTY_NOTICES.txt',root),read('public/THIRD_PARTY_NOTICES.txt')+'\n\n@pdf-lib/fontkit: MIT; authors Andrew Dillon and Devon Govett. Upstream: https://github.com/Hopding/fontkit . The package license declaration is reproduced in third_party/pdf-lib-fontkit/UPSTREAM_README.md.\n');

const bundledComments=read('frontend/node_modules/@pdf-lib/fontkit/dist/fontkit.es.js').match(/\/\*[\s\S]*?\*\//g)||[];
const bundledNotices=[...new Set(bundledComments.filter(s=>/copyright|license|@author/i.test(s)))].join('\n\n');
writeFileSync(new URL('third_party/pdf-lib-fontkit/BUNDLED_NOTICES.txt',root),bundledNotices+'\n');
writeFileSync(new URL('third_party/pdf-lib-fontkit/APACHE-2.0.txt',root),read('third_party/claude-board/LICENSE'));
writeFileSync(new URL('public/THIRD_PARTY_NOTICES.txt',root),read('public/THIRD_PARTY_NOTICES.txt')+'\n\nFontkit bundled dependencies notices\n'+bundledNotices+'\n\nApache License 2.0\n'+read('third_party/pdf-lib-fontkit/APACHE-2.0.txt'));
