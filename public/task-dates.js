import {kstDate,validDate} from './kpi-model.js';
export function requestDateValue(day,previous){if(!validDate(day))throw Error('요청일을 확인하세요.');if(previous&&kstDate(previous)===day)return previous;return new Date(day+'T00:00:00+09:00').toISOString();}
