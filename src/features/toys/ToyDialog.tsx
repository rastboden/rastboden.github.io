import { zodResolver } from '@hookform/resolvers/zod'
import { useLiveQuery } from 'dexie-react-hooks'
import { ImagePlus, Trash2 } from 'lucide-react'
import { useId, useRef, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormFooter } from '@/components/FormFooter'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { db, type Toy } from '@/db/schema'
import { archiveToy, createToy, updateToy, type ImageChange } from '@/db/toys'
import { resizeImage } from '@/lib/image'
import { ToyImage } from './ToyImage'
import {
  TOY_CATEGORY_MAX,
  TOY_NAME_MAX,
  TOY_NOTE_MAX,
  toyFormSchema,
  type ToyFormValues,
} from './toyForm'

interface ToyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The toy to edit; leave out to add a new one. */
  toy?: Toy
}

export function ToyDialog({ open, onOpenChange, toy }: ToyDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={t('common.close')}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{toy ? t('toys.edit') : t('toys.add')}</DialogTitle>
          <DialogDescription className="sr-only">
            {toy ? t('toys.edit') : t('toys.add')}
          </DialogDescription>
        </DialogHeader>
        {/* The content only exists while the dialog is open, so the form starts fresh each time. */}
        <ToyForm toy={toy} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function ToyForm({ toy, onDone }: { toy: Toy | undefined; onDone: () => void }) {
  const { t } = useTranslation()
  const formId = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  const [imageChange, setImageChange] = useState<ImageChange>({ kind: 'unchanged' })
  const [problem, setProblem] = useState<'image' | 'save' | null>(null)

  const storedImage = useLiveQuery(
    async () => (toy ? (await db.toyImages.get(toy.id))?.blob : undefined),
    [toy?.id],
  )
  const shownImage =
    imageChange.kind === 'replace'
      ? imageChange.blob
      : imageChange.kind === 'remove'
        ? undefined
        : storedImage

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ToyFormValues>({
    resolver: zodResolver(toyFormSchema),
    defaultValues: {
      name: toy?.name ?? '',
      category: toy?.category ?? '',
      note: toy?.note ?? '',
    },
  })

  async function onPickImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Clear the input so picking the same file again still fires a change.
    event.target.value = ''
    if (!file) {
      return
    }
    try {
      setImageChange({ kind: 'replace', blob: await resizeImage(file) })
      setProblem(null)
    } catch {
      setProblem('image')
    }
  }

  async function run(action: () => Promise<unknown>) {
    try {
      await action()
      onDone()
    } catch {
      setProblem('save')
    }
  }

  const onSubmit = handleSubmit((values) =>
    run(() => (toy ? updateToy(toy.id, values, imageChange) : createToy(values, imageChange))),
  )

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <div className="flex items-center gap-4">
        <ToyImage blob={shownImage} className="size-24" />
        <div className="grid gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={onPickImage}
          />
          <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}>
            <ImagePlus aria-hidden />
            {shownImage ? t('toys.changeImage') : t('toys.chooseImage')}
          </Button>
          {shownImage && (
            <Button type="button" variant="ghost" onClick={() => setImageChange({ kind: 'remove' })}>
              <Trash2 aria-hidden />
              {t('toys.removeImage')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${formId}-name`}>{t('toys.name')}</Label>
        <Input
          id={`${formId}-name`}
          maxLength={TOY_NAME_MAX}
          autoComplete="off"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? `${formId}-name-error` : undefined}
          {...register('name')}
        />
        {errors.name && (
          <p id={`${formId}-name-error`} className="text-sm text-destructive">
            {t('toys.nameRequired')}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${formId}-category`}>{t('toys.category')}</Label>
        <Input
          id={`${formId}-category`}
          maxLength={TOY_CATEGORY_MAX}
          autoComplete="off"
          {...register('category')}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${formId}-note`}>{t('toys.note')}</Label>
        <Input
          id={`${formId}-note`}
          maxLength={TOY_NOTE_MAX}
          autoComplete="off"
          {...register('note')}
        />
      </div>

      {problem && (
        <p role="alert" className="text-sm text-destructive">
          {problem === 'image' ? t('toys.imageFailed') : t('common.saveFailed')}
        </p>
      )}

      <FormFooter
        onCancel={onDone}
        isSubmitting={isSubmitting}
        archive={
          toy && { hint: t('toys.archiveHint'), onConfirm: () => run(() => archiveToy(toy.id)) }
        }
      />
    </form>
  )
}
