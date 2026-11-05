'use server';

import { revalidatePath } from 'next/cache';
import { getContainer } from '../../../../config/container.ts';
import { changeRequestStatusHandler, registerRequestHandler } from './requestHandlers.ts';

export async function registerRequestAction(formData: FormData): Promise<void> {
  await registerRequestHandler(getContainer(), {
    title: formData.get('title'),
    requester: formData.get('requester'),
  });
  revalidatePath('/');
}

export async function changeRequestStatusAction(formData: FormData): Promise<void> {
  await changeRequestStatusHandler(getContainer(), {
    id: formData.get('id'),
    status: formData.get('status'),
    reason: formData.get('reason'),
  });
  revalidatePath('/');
}
