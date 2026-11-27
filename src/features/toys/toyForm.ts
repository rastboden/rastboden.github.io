import { z } from 'zod'

export const TOY_NAME_MAX = 80
export const TOY_NOTE_MAX = 500

export const toyFormSchema = z.object({
  name: z.string().trim().min(1).max(TOY_NAME_MAX),
  note: z.string().trim().max(TOY_NOTE_MAX),
})

export type ToyFormValues = z.infer<typeof toyFormSchema>
