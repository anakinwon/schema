'use client'

import { useRef, useState } from 'react'

export interface UploadedFile {
  file: File
  preview: string
}

interface Props {
  files: UploadedFile[]
  onChange: (files: UploadedFile[]) => void
  maxFiles?: number
  maxMb?: number
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export default function AttachmentUploader({
  files,
  onChange,
  maxFiles = 5,
  maxMb = 20,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return
    const remaining = maxFiles - files.length
    const toAdd = Array.from(newFiles).slice(0, remaining).filter(f => {
      if (f.size > maxMb * 1024 * 1024) {
        alert(`${f.name}: ${maxMb}MB 초과 파일은 첨부할 수 없습니다.`)
        return false
      }
      return true
    })
    onChange([...files, ...toAdd.map(f => ({ file: f, preview: f.name }))])
  }

  const remove = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-2">
      {/* 드롭 존 */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
        onClick={() => files.length < maxFiles && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-blue-400 bg-blue-50'
            : files.length >= maxFiles
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
            : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50/30'
        }`}
      >
        <p className="text-sm text-gray-500">
          파일을 드래그하거나 <span className="text-blue-500 font-medium">클릭</span>하여 첨부
        </p>
        <p className="text-xs text-gray-400 mt-1">
          최대 {maxFiles}개 · 파일당 {maxMb}MB 이하
          {files.length > 0 && ` (${files.length}/${maxFiles})`}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={e => { addFiles(e.target.files); e.target.value = '' }}
      />

      {/* 첨부 파일 목록 */}
      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded border border-gray-200 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-gray-400 text-xs">📎</span>
                <span className="truncate text-gray-700">{f.file.name}</span>
                <span className="text-gray-400 text-xs shrink-0">{formatBytes(f.file.size)}</span>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-gray-400 hover:text-red-500 transition-colors shrink-0 text-xs"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
