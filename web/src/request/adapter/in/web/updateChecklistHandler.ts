import {z} from 'zod';
import type {RouteContext} from '../../../../shared/adapter/in/web/RouteRegistry.ts';
import {HttpError,jsonResponse} from '../../../../shared/adapter/in/web/http.ts';
import {ChecklistError} from '../../../domain/TaskChecklist.ts';
import type {UpdateChecklistUseCase} from '../../../application/port/in/UpdateChecklistUseCase.ts';
import {withEditErrors} from './errorMapping.ts';
const schema=z.object({revision:z.number().int().nonnegative(),change:z.discriminatedUnion('kind',[
 z.object({kind:z.literal('add'),title:z.string()}),
 z.object({kind:z.literal('toggle'),line:z.number().int().nonnegative(),done:z.boolean()})
])});
export function updateChecklistHandler(useCase:UpdateChecklistUseCase){
 return async(context:RouteContext):Promise<Response>=>{
  if(context.role!=='admin') throw new HttpError(403,'조회 계정은 업무를 변경할 수 없습니다.');
  const parsed=schema.safeParse(context.body);
  if(!parsed.success) throw new HttpError(400,'하위 업무 입력을 확인하세요.');
  return withEditErrors(async()=>{
   try{return jsonResponse(200,await useCase.execute({id:context.params[0],...parsed.data}));}
   catch(error){if(error instanceof ChecklistError)throw new HttpError(400,error.message);throw error;}
  });
 };
}
