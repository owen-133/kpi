import type {OrbitFunctions} from '../../../shared/port/OrbitFunctions.ts';
import {OrbitFunctionError} from '../../../shared/port/OrbitFunctions.ts';
import {changeChecklist} from '../../domain/TaskChecklist.ts';
import {NEW_TASK_FIELDS} from '../../domain/TaskLimits.ts';
import type {UpdateChecklistCommand,UpdateChecklistUseCase} from '../port/in/UpdateChecklistUseCase.ts';
export class UpdateChecklistService implements UpdateChecklistUseCase {
 private readonly functions:OrbitFunctions;
 constructor(functions:OrbitFunctions){this.functions=functions;}
 async execute(command:UpdateChecklistCommand):Promise<unknown>{
  const task=await this.functions.call('orbit_api',{action:'detail',payload:{id:command.id,include_deleted:true}}) as Record<string,unknown>|null;
  if(!task || task.deleted_at) throw new OrbitFunctionError('업무를 찾을 수 없습니다.','PT404');
  if((task.edit_revision||0)!==command.revision) throw new OrbitFunctionError('다른 수정이 있습니다. 업무를 다시 열어주세요.','PT409');
  const changed=changeChecklist(String(task.description||''),command.change);
  const values=Object.fromEntries(NEW_TASK_FIELDS.map(field=>[field,field==='description'?changed.description:task[field]??'']));
  return this.functions.call('orbit_edit_task',{payload:{id:command.id,revision:command.revision,values,reason:changed.reason}});
 }
}
