'use client'

import { useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

export interface UploadedFile {
  file: File
  preview: string
}

// 서버에서 불러온 기존 첨부파일 타입
export interface ServerAttachment {
  attch_id: string
  fl_nm: string
  fl_url: string
  fl_sz: number
  fl_tp: string
}

interface Props {
  files: UploadedFile[]
  onChange: (files: UploadedFile[]) => void
  onError?: (hasError: boolean) => void
  maxFiles?: number
  maxMb?: number
  // 수정 모드: 이미 저장된 첨부파일 목록
  existingFiles?: ServerAttachment[]
  // 수정 모드: 기존 파일 삭제 콜백 (실패 시 throw)
  onDeleteExisting?: (attchId: string) => Promise<void>
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export default function AttachmentUploader({
  files,
  onChange,
  onError,
  maxFiles = 5,
  maxMb = 20,
  existingFiles = [],
  onDeleteExisting,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [sizeError, setSizeError] = useState<string | null>(null)
  // 삭제 진행 중인 attch_id 집합
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  // 기존 파일 + 새 파일 합산 카운트
  const totalFiles = existingFiles.length + files.length

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return
    const remaining = maxFiles - totalFiles
    const oversized: string[] = []

    const toAdd = Array.from(newFiles).slice(0, remaining).filter(f => {
      if (f.size > maxMb * 1024 * 1024) {
        oversized.push(f.name)
        return false
      }
      return true
    })

    if (oversized.length > 0) {
      const msg = `업로드 파일크기제한 ${maxMb}MB를 초과했습니다. (${oversized.join(', ')})`
      setSizeError(msg)
      onError?.(true)
    } else {
      setSizeError(null)
      onError?.(false)
    }

    if (toAdd.length > 0) {
      onChange([...files, ...toAdd.map(f => ({ file: f, preview: f.name }))])
    }
  }

  const remove = (idx: number) => {
    const next = files.filter((_, i) => i !== idx)
    onChange(next)
    if (next.length === 0) {
      setSizeError(null)
      onError?.(false)
    }
  }

  const handleDeleteExisting = async (attchId: string) => {
    setDeletingIds(prev => new Set(prev).add(attchId))
    try {
      await onDeleteExisting?.(attchId)
    } catch {
      // 오류는 상위(PostForm)에서 처리 — 여기서는 스피너만 해제
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev)
        next.delete(attchId)
        return next
      })
    }
  }

  return (
    <div className="space-y-2">
      {/* 드롭 존 */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
        onClick={() => totalFiles < maxFiles && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-blue-400 bg-blue-50'
            : sizeError
            ? 'border-red-300 bg-red-50/30'
            : totalFiles >= maxFiles
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
            : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50/30'
        }`}
      >
        <p className="text-sm text-gray-500">
          파일을 드래그하거나 <span className="text-blue-500 font-medium">클릭</span>하여 첨부
        </p>
        <p className="text-xs text-gray-400 mt-1">
          최대 {maxFiles}개 · 파일당 {maxMb}MB 이하
          {totalFiles > 0 && ` (${totalFiles}/${maxFiles})`}
        </p>
      </div>

      {/* 크기 초과 에러 메시지 */}
      {sizeError && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <span>⚠</span>
          {sizeError}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={e => { addFiles(e.target.files); e.target.value = '' }}
      />

      {/* 기존 첨부파일 목록 (수정 모드) */}
      {existingFiles.length > 0 && (
        <ul className="space-y-1">
          {existingFiles.map(f => {
            const isDeleting = deletingIds.has(f.attch_id)
            return (
              <li
                key={f.attch_id}
                className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded border border-gray-200 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-gray-400 text-xs">📎</span>
                  <a
                    href={f.fl_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-blue-600 hover:underline"
                  >
                    {f.fl_nm}
                  </a>
                  <span className="text-gray-400 text-xs shrink-0">{formatBytes(f.fl_sz)}</span>
                </div>
                {onDeleteExisting && (
                  <button
                    type="button"
                    onClick={() => handleDeleteExisting(f.attch_id)}
                    disabled={isDeleting}
                    aria-label={`${f.fl_nm} 삭제`}
                    className="text-gray-400 hover:text-red-500 transition-colors shrink-0 text-xs disabled:opacity-50"
                  >
                    {isDeleting
                      ? <Loader2 className="size-3 animate-spin" />
                      : '✕'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* 새로 추가할 파일 목록 */}
      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-2 px-3 py-2 bg-blue-50/60 rounded border border-blue-200/60 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-blue-400 text-xs">📎</span>
                <span className="truncate text-gray-700">{f.file.name}</span>
                <span className="text-gray-400 text-xs shrink-0">{formatBytes(f.file.size)}</span>
                <span className="text-blue-400 text-xs shrink-0">신규</span>
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
