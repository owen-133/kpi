import {PDFDocument,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

let cachedFont;
async function loadFont(){
 if(!cachedFont)cachedFont=fetch('/fonts/NanumGothic-Regular.ttf').then(r=>{if(!r.ok)throw Error('한글 글꼴을 불러오지 못했습니다. 다시 시도해 주세요.');return r.arrayBuffer();}).catch(e=>{cachedFont=null;throw e;});
 return cachedFont;
}
const ink=rgb(.13,.19,.29),muted=rgb(.49,.55,.64),line=rgb(.87,.90,.94),paper=rgb(.96,.97,.99);
export async function createReportPdf(record,options={}){
 const document=await PDFDocument.create();document.registerFontkit(fontkit);
 const font=await document.embedFont(options.fontBytes||await loadFont(),{subset:false});
 const supported=new Set(font.getCharacterSet());
 const clean=value=>Array.from(String(value??'').normalize('NFC')).filter(c=>c==='\n'||c==='\t'||c.charCodeAt(0)>=32).map(c=>c==='\n'||c==='\t'||supported.has(c.codePointAt(0))?c:'□').join('').replaceAll('\t','    ');
 const brand=clean(options.portalName||'아이지넷'),month=clean(record.month),issued=new Date(record.created_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
 const title='총무 업무 처리현황';document.setTitle(month+' '+title);document.setAuthor(brand);document.setSubject('발행한 월간 업무 보고서');document.setCreator('아이지넷 총무 업무 포털');
 const width=595.28,height=841.89,margin=44,bodyWidth=width-margin*2;
 let page,y;
 function text(value,x,at,size=10.3,color=ink){page.drawText(clean(value),{x,y:at,size,font,color});}
 function wrap(value,size,maxWidth=bodyWidth){
  const rows=[];let row='';for(const c of clean(value)){if(font.widthOfTextAtSize(row+c,size)>maxWidth&&row){rows.push(row.trimEnd());row=c.trimStart();}else row+=c;}if(row||!rows.length)rows.push(row.trimEnd());return rows;
 }
 function newPage(first=false){page=document.addPage([width,height]);if(first){
  page.drawRectangle({x:margin,y:height-154,width:bodyWidth,height:112,color:paper});
  let brandSize=10;while(font.widthOfTextAtSize(brand,brandSize)>bodyWidth-110&&brandSize>6)brandSize-=.5;
  text(brand,margin+18,height-69,brandSize,muted);text('MONTHLY REPORT',width-margin-114,height-69,8,muted);
  text(title,margin+18,height-106,23);text(month+'  월간 보고서',margin+18,height-135,10,muted);
  y=height-183;text('발행 '+issued+' (한국 시간)',margin,y,9,muted);text('발행자 '+clean(record.actor||'admin'),width-margin-100,y,9,muted);y-=28;
 }else{text(month+' · '+title,margin,height-44,10,muted);page.drawLine({start:{x:margin,y:height-56},end:{x:width-margin,y:height-56},thickness:.6,color:line});y=height-82;}}
 function ensure(space){if(y-space<70)newPage();}
 newPage(true);
 const rows=clean(record.draft).split(/\r?\n/);if(rows[0]?.trim()===record.month+' '+title)rows.shift();while(rows[0]==='')rows.shift();
 for(const raw of rows){
  const value=raw.trimEnd();if(!value){y-=9;continue;}
  const heading=/^\s*\d+[.)]\s+/.test(value)||/^#{1,3}\s+/.test(value);
  const note=value.trimStart().startsWith('※');const size=heading?12:note?8.4:10.3,step=heading?19:note?13:17;
  if(heading){ensure(65);y-=8;page.drawRectangle({x:margin,y:y-2,width:3,height:14,color:ink});}
  for(const row of wrap(value.replace(/^#{1,3}\s+/,''),size,heading?bodyWidth-13:bodyWidth)){ensure(step);text(row,margin+(heading?12:0),y,size,note?muted:ink);y-=step;}
  if(heading)y-=5;
 }
 const pages=document.getPages();pages.forEach((p,i)=>{p.drawLine({start:{x:margin,y:49},end:{x:width-margin,y:49},thickness:.6,color:line});p.drawText('내부 업무 보고서',{x:margin,y:32,size:8,font,color:muted});const label=`${i+1} / ${pages.length}`;p.drawText(label,{x:width-margin-font.widthOfTextAtSize(label,8),y:32,size:8,font,color:muted});});
 return document.save();
}
