/**
 * For a dialog's `onOpenAutoFocus`: stops the dialog from putting the cursor
 * in its first field when it opens. On a phone that brings up the keyboard
 * over the form before the user has seen it. Focus goes to the dialog itself
 * instead, which still keeps keyboard and screen-reader users inside it.
 */
export function focusDialogNotField(event: Event): void {
  event.preventDefault()
  if (event.target instanceof HTMLElement) {
    event.target.focus()
  }
}
