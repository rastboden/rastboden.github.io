import { useLiveQuery } from 'dexie-react-hooks'
import { Blocks } from 'lucide-react'
import { db } from '@/db/schema'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { cn } from '@/lib/utils'

/** Square toy picture, or a neutral placeholder when the toy has none. */
export function ToyImage({ blob, className }: { blob: Blob | undefined; className?: string }) {
  const url = useObjectUrl(blob)

  return (
    <div
      className={cn(
        'flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground',
        className,
      )}
    >
      {url ? (
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <Blocks aria-hidden className="size-1/2" />
      )}
    </div>
  )
}

/** The saved picture of a toy, looked up by the toy's id. */
export function StoredToyImage({
  toyId,
  className,
}: {
  toyId: string | undefined
  className?: string
}) {
  const blob = useLiveQuery(
    async () => (toyId ? (await db.toyImages.get(toyId))?.blob : undefined),
    [toyId],
  )

  return <ToyImage blob={blob} className={className} />
}
