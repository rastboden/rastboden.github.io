import { useState } from 'react'

/**
 * A number that changes every time `open` turns true. Used as the `key` of a
 * dialog's form, so each opening gets a brand-new form.
 *
 * Without it, a dialog reopened while its closing animation is still running
 * shows the previous form again: old values, and a save button that is still
 * disabled from the save that just finished.
 */
export function useOpeningKey(open: boolean): number {
  const [openingKey, setOpeningKey] = useState(0)
  const [wasOpen, setWasOpen] = useState(open)

  // Adjusting state while rendering, as React recommends for reacting to a prop change.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setOpeningKey(openingKey + 1)
    }
  }

  return openingKey
}
