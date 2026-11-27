import { useEffect, useState } from 'react'

/**
 * Gives a URL that an <img> can show for an image blob, and releases it again
 * when the blob changes or the component goes away.
 */
export function useObjectUrl(blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string>()

  useEffect(() => {
    if (!blob) {
      return
    }
    const objectUrl = URL.createObjectURL(blob)
    // The URL is an external resource that only exists once it is created here,
    // so it cannot be derived during render.
    // oxlint-disable-next-line react/set-state-in-effect
    setUrl(objectUrl)
    return () => {
      URL.revokeObjectURL(objectUrl)
      setUrl(undefined)
    }
  }, [blob])

  return url
}
