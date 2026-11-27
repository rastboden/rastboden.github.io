import { zodResolver } from '@hookform/resolvers/zod'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormFooter } from '@/components/FormFooter'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { archiveChild, createChild, updateChild } from '@/db/children'
import type { Child } from '@/db/schema'
import {
  CHILD_NAME_MAX,
  CLASS_NAME_MAX,
  childFormSchema,
  type ChildFormValues,
} from './childForm'

interface ChildDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The child to edit; leave out to add a new one. */
  child?: Child
  /** Class to prefill when adding, so a whole class can be entered quickly. */
  defaultClassName?: string
}

export function ChildDialog({ open, onOpenChange, child, defaultClassName }: ChildDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={t('common.close')}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{child ? t('children.edit') : t('children.add')}</DialogTitle>
          <DialogDescription className="sr-only">
            {child ? t('children.edit') : t('children.add')}
          </DialogDescription>
        </DialogHeader>
        {/* The content only exists while the dialog is open, so the form starts fresh each time. */}
        <ChildForm
          child={child}
          defaultClassName={defaultClassName}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function ChildForm({
  child,
  defaultClassName,
  onDone,
}: {
  child: Child | undefined
  defaultClassName: string | undefined
  onDone: () => void
}) {
  const { t } = useTranslation()
  const formId = useId()
  const [saveFailed, setSaveFailed] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChildFormValues>({
    resolver: zodResolver(childFormSchema),
    defaultValues: {
      firstName: child?.firstName ?? '',
      lastName: child?.lastName ?? '',
      className: child?.className ?? defaultClassName ?? '',
    },
  })

  async function run(action: () => Promise<unknown>) {
    try {
      await action()
      onDone()
    } catch {
      setSaveFailed(true)
    }
  }

  const onSubmit = handleSubmit((values) =>
    run(() => (child ? updateChild(child.id, values) : createChild(values))),
  )

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={`${formId}-first-name`}>{t('children.firstName')}</Label>
        <Input
          id={`${formId}-first-name`}
          maxLength={CHILD_NAME_MAX}
          autoComplete="off"
          autoCapitalize="words"
          aria-invalid={errors.firstName ? true : undefined}
          aria-describedby={errors.firstName ? `${formId}-first-name-error` : undefined}
          {...register('firstName')}
        />
        {errors.firstName && (
          <p id={`${formId}-first-name-error`} className="text-sm text-destructive">
            {t('children.firstNameRequired')}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${formId}-last-name`}>{t('children.lastName')}</Label>
        <Input
          id={`${formId}-last-name`}
          maxLength={CHILD_NAME_MAX}
          autoComplete="off"
          autoCapitalize="words"
          {...register('lastName')}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${formId}-class-name`}>{t('children.className')}</Label>
        <Input
          id={`${formId}-class-name`}
          maxLength={CLASS_NAME_MAX}
          autoComplete="off"
          autoCapitalize="characters"
          aria-invalid={errors.className ? true : undefined}
          aria-describedby={errors.className ? `${formId}-class-name-error` : undefined}
          {...register('className')}
        />
        {errors.className && (
          <p id={`${formId}-class-name-error`} className="text-sm text-destructive">
            {t('children.classNameRequired')}
          </p>
        )}
      </div>

      {saveFailed && (
        <p role="alert" className="text-sm text-destructive">
          {t('common.saveFailed')}
        </p>
      )}

      <FormFooter
        onCancel={onDone}
        isSubmitting={isSubmitting}
        archive={
          child && {
            hint: t('children.archiveHint'),
            onConfirm: () => run(() => archiveChild(child.id)),
          }
        }
      />
    </form>
  )
}
