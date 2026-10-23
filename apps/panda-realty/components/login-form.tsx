"use client"

import { useForm } from "@tanstack/react-form"
import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { safeNextPath } from "@repo/auth-redirect"
import { Button } from "@repo/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/card"
import { Input } from "@repo/ui/input"
import { Label } from "@repo/ui/label"
import { fieldErrorsText } from "@/lib/field-errors-text"
import {
  loginEmailFieldSchema,
  loginPasswordFieldSchema,
} from "@/lib/login-field-schemas"
import { createClient } from "@/lib/supabase/client"

type LoginFormValues = {
  email: string
  password: string
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    } satisfies LoginFormValues,
    listeners: {
      onChange: () => {
        setSubmitError(null)
      },
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null)
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: value.email.trim(),
        password: value.password,
      })
      if (signInError) {
        setSubmitError(signInError.message)
        return
      }
      router.push(safeNextPath(searchParams.get("next")))
      router.refresh()
    },
  })

  return (
    <Card className="w-full max-w-sm border-border/80 shadow-none">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg">Sign in</CardTitle>
        <CardDescription>
          Use the email and password from your Supabase project (Auth → Users
          or sign-up flow).
        </CardDescription>
      </CardHeader>
      <form
        data-testid="login-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <CardContent className="grid gap-4">
          <form.Field
            name="email"
            validators={{
              onSubmit: loginEmailFieldSchema,
            }}
          >
            {(field) => (
              <div className="grid gap-2">
                <Label htmlFor="email">
                  Email
                  <span className="text-destructive" aria-hidden>
                    {" "}
                    *
                  </span>
                </Label>
                <Input
                  id="email"
                  name={field.name}
                  type="email"
                  autoComplete="email"
                  data-testid="login-email-input"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="you@example.com"
                  aria-required
                />
                {!field.state.meta.isValid ? (
                  <p
                    className="text-sm text-destructive"
                    role="alert"
                    data-testid="login-email-field-error"
                  >
                    {fieldErrorsText(field.state.meta.errors)}
                  </p>
                ) : null}
              </div>
            )}
          </form.Field>
          <form.Field
            name="password"
            validators={{
              onSubmit: loginPasswordFieldSchema,
            }}
          >
            {(field) => (
              <div className="grid gap-2">
                <Label htmlFor="password">
                  Password
                  <span className="text-destructive" aria-hidden>
                    {" "}
                    *
                  </span>
                </Label>
                <Input
                  id="password"
                  name={field.name}
                  type="password"
                  autoComplete="current-password"
                  data-testid="login-password-input"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-required
                />
                {!field.state.meta.isValid ? (
                  <p
                    className="text-sm text-destructive"
                    role="alert"
                    data-testid="login-password-field-error"
                  >
                    {fieldErrorsText(field.state.meta.errors)}
                  </p>
                ) : null}
              </div>
            )}
          </form.Field>
          {submitError ? (
            <p
              className="text-sm text-destructive"
              role="alert"
              data-testid="login-submit-error"
            >
              {submitError}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => (
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                data-testid="login-submit"
              >
                {isSubmitting ? "Signing in…" : "Sign in"}
              </Button>
            )}
          </form.Subscribe>
          <Button variant="ghost" className="w-full" asChild>
            <Link href="/">Cancel</Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
