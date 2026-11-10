import type {ChecklistChange} from '../../../domain/TaskChecklist.ts';
export type UpdateChecklistCommand={readonly id:string;readonly revision:number;readonly change:ChecklistChange};
export type UpdateChecklistResult=unknown;
export interface UpdateChecklistUseCase {execute(command:UpdateChecklistCommand):Promise<UpdateChecklistResult>}
