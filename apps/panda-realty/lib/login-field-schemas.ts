import { z } from "zod"

export const loginEmailFieldSchema = z.string().superRefine((raw, ctx) => {
  const val = raw.trim()
  if (!val) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required" })
    return
  }
  const parsed = z.string().email("Enter a valid email").safeParse(val)
  if (!parsed.success) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid email" })
  }
})

export const loginPasswordFieldSchema = z.string().min(1, "Required")
