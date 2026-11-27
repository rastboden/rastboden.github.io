import { z } from 'zod'

export const CHILD_NAME_MAX = 60
export const CLASS_NAME_MAX = 20

export const childFormSchema = z.object({
  firstName: z.string().trim().min(1).max(CHILD_NAME_MAX),
  lastName: z.string().trim().max(CHILD_NAME_MAX),
  className: z.string().trim().min(1).max(CLASS_NAME_MAX),
})

export type ChildFormValues = z.infer<typeof childFormSchema>
