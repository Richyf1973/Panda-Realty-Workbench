import { describe, expect, it } from "vitest"

import { snapshotFilesForUpload } from "./file-input-take-files"

function mockFileList(files: File[]): FileList {
  return {
    length: files.length,
    item(index: number) {
      return files.at(index) ?? null
    },
    *[Symbol.iterator]() {
      yield* files
    },
  } as FileList
}

describe("snapshotFilesForUpload", () => {
  it("returns [] for null", () => {
    expect(snapshotFilesForUpload(null)).toEqual([])
  })

  it("returns [] for empty list", () => {
    expect(snapshotFilesForUpload(mockFileList([]))).toEqual([])
  })

  it("copies entries before any input reset (live FileList invariant)", () => {
    const a = new File(["1"], "a.txt", { type: "text/plain" })
    const b = new File(["2"], "b.txt", { type: "text/plain" })
    expect(snapshotFilesForUpload(mockFileList([a, b]))).toEqual([a, b])
  })
})
