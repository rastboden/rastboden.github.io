/** How long the download link must stay valid for the browser to start reading it. */
const REVOKE_AFTER_MS = 60_000

function canShare(file: File): boolean {
  // Phones and tablets only. On a computer a plain download is what people expect.
  return (
    window.matchMedia('(pointer: coarse)').matches &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  )
}

function download(file: File): void {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS)
}

/**
 * Hands a file to the user to keep. Where the system share sheet takes files
 * (iPhone and iPad, where it offers "Save to Files") that is used, because
 * downloads are unreliable in an app installed on the home screen there.
 * Everywhere else the file is downloaded.
 *
 * Resolves to `cancelled` when the user closed the share sheet without choosing.
 */
export async function saveFile(file: File): Promise<'saved' | 'cancelled'> {
  if (canShare(file)) {
    try {
      await navigator.share({ files: [file] })
      return 'saved'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled'
      }
      // Sharing failed for another reason; a download still gets the file out.
    }
  }
  download(file)
  return 'saved'
}
