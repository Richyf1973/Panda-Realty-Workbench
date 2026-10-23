/**
 * `FileList` from `<input type="file">` is **live**: clearing `input.value` before copying
 * empties the list and `Array.from(fileList)` yields nothing. Always snapshot first, then reset.
 */
export function snapshotFilesForUpload(fileList: FileList | null): File[] {
  if (!fileList || fileList.length === 0) return []
  return Array.from(fileList)
}

/** Copies selected files off the input, then clears it so the same paths can be chosen again. */
export function takeFilesFromFileInputAndReset(input: HTMLInputElement): File[] {
  const files = snapshotFilesForUpload(input.files)
  if (files.length > 0) input.value = ""
  return files
}
