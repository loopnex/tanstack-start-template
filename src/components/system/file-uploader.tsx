import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { uploadFile } from '#/lib/media/upload'
import { cn } from '#/lib/utils'
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  Check,
  Clock,
  Code2,
  File,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Loader2,
  Music,
  Trash2,
  UploadCloud,
  Video,
  X,
} from 'lucide-react'
import * as React from 'react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  ErrorCode,
  useDropzone,
  type Accept,
  type FileError,
  type FileRejection,
} from 'react-dropzone'
import { ulid } from 'ulid'

// --- Types ---

export type FileType = 'images' | 'docs' | 'videos' | 'audios'
type FileStatus = 'pending' | 'uploading' | 'complete' | 'error' | 'cancelled'

interface FileEntry {
  id: string
  file?: File // present while uploading; absent for pre-existing (initialFiles) rows
  name: string
  size: number
  mimeType: string
  status: FileStatus
  progress: number
  deleting?: boolean // server delete in flight (row stays 'complete' meanwhile)
  error?: string
  preview?: string // image src — blob: for new files, remote url for existing
  result?: UploadResult // set on completion; carries the key used to delete
}

export interface UploadResult {
  mediaId: string // DB row ID
  key: string // storage key; used for deletes
  url: string // public URL
  name: string
  mimeType: string
  size: number
}

export interface FileUploaderProps {
  fileTypes?: FileType[] // preset categories → Accept map
  accept?: Accept // raw Accept; merged with fileTypes
  multiple?: boolean
  maxFiles?: number
  minSize?: number
  maxSize?: number
  collection?: string // storage folder + DB group
  modelType?: string // polymorphic relation
  modelId?: string // polymorphic relation
  label?: string
  description?: string // auto-built from fileTypes/accept/size when omitted
  // Pre-existing files shown on mount (e.g. an edit page) — rendered as completed
  // rows; their trash button deletes from storage. Map media rows to UploadResult.
  initialFiles?: UploadResult[]
  // Per-file validator (runs in dropzone); return null to accept
  validator?: (file: File) => FileError | FileError[] | null
  onUploadComplete?: (result: UploadResult) => void
  onUploadError?: (error: Error, file: File) => void
  className?: string
  disabled?: boolean
}

// --- File type config ---
const FILE_TYPE_CONFIG: Record<
  FileType,
  { accept: Accept; icon: React.ElementType }
> = {
  images: {
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'] },
    icon: ImageIcon,
  },
  docs: {
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        ['.docx'],
      'text/plain': ['.txt'],
    },
    icon: FileText,
  },
  videos: {
    accept: { 'video/*': ['.mp4', '.mov', '.mkv', '.webm'] },
    icon: Video,
  },
  audios: {
    accept: { 'audio/*': ['.mp3', '.wav', '.ogg', '.m4a'] },
    icon: Music,
  },
}

function resolveAccept(
  fileTypes?: FileType[],
  accept?: Accept,
): Accept | undefined {
  const merged: Accept = {}
  if (fileTypes?.length) {
    for (const t of fileTypes) Object.assign(merged, FILE_TYPE_CONFIG[t].accept)
  }
  if (accept) Object.assign(merged, accept)
  return Object.keys(merged).length > 0 ? merged : undefined
}

function resolveDropzoneIcon(fileTypes?: FileType[]): React.ElementType {
  if (fileTypes?.length === 1) return FILE_TYPE_CONFIG[fileTypes[0]].icon
  return UploadCloud
}

// --- Helpers ---
function friendlyError(error: FileError): string {
  switch (error.code) {
    case ErrorCode.FileInvalidType:
      return 'File type not supported'
    case ErrorCode.FileTooLarge:
      return 'File is too large'
    case ErrorCode.FileTooSmall:
      return 'File is too small'
    case ErrorCode.TooManyFiles:
      return 'Too many files'
    default:
      return error.message || 'File rejected'
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1000
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// Builds the in-zone hint, e.g. "JPG, PNG · Up to 5 files, each up to 5 MB".
function buildDescription(
  accept: Accept | undefined,
  {
    maxSize,
    minSize,
    multiple,
    maxFiles,
  }: {
    maxSize?: number
    minSize?: number
    multiple?: boolean
    maxFiles?: number
  },
): string {
  const parts: string[] = []

  if (accept) {
    const exts = [
      ...new Set(
        Object.values(accept)
          .flat()
          .map((e) => e.replace('.', '').toUpperCase())
          .filter(Boolean),
      ),
    ]
    if (exts.length > 0) {
      parts.push(exts.join(', '))
    } else {
      const groups = [
        ...new Set(
          Object.keys(accept).map((mime) => {
            const [type] = mime.split('/')
            return type.charAt(0).toUpperCase() + type.slice(1)
          }),
        ),
      ]
      if (groups.length > 0) parts.push(groups.join(', '))
    }
  }

  const size = maxSize ? formatBytes(maxSize) : undefined
  if (multiple) {
    if (maxFiles) {
      parts.push(
        size
          ? `Up to ${maxFiles} files, each up to ${size}`
          : `Up to ${maxFiles} files`,
      )
    } else if (size) {
      parts.push(`Up to ${size} each`)
    }
  } else if (size) {
    parts.push(`Up to ${size}`)
  }

  if (minSize) parts.push(`Min ${formatBytes(minSize)}`)
  return parts.join(' · ')
}

function getFileIcon(mimeType: string): React.ElementType {
  if (mimeType.startsWith('image/')) return ImageIcon
  if (mimeType.startsWith('video/')) return Video
  if (mimeType.startsWith('audio/')) return Music
  if (
    mimeType === 'application/pdf' ||
    mimeType === 'text/plain' ||
    mimeType === 'text/html'
  )
    return FileText
  if (
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel') ||
    mimeType === 'text/csv'
  )
    return FileSpreadsheet
  if (
    mimeType === 'application/zip' ||
    mimeType === 'application/x-tar' ||
    mimeType === 'application/gzip'
  )
    return Archive
  if (
    mimeType === 'text/javascript' ||
    mimeType === 'application/json' ||
    mimeType === 'text/x-python'
  )
    return Code2
  return File
}

// --- Constants ---
const STATUS_ICON_MAP: Record<FileStatus, React.ElementType> = {
  pending: Clock,
  uploading: Loader2,
  complete: Check,
  error: AlertTriangle,
  cancelled: AlertTriangle,
}

const STATUS_VARIANT = {
  pending: 'secondary',
  uploading: 'default',
  complete: 'success',
  error: 'destructive',
  cancelled: 'secondary',
} as const

function handleDropzoneError(err: Error) {
  console.error('[FileUploader]', err.message)
}

// --- File Row ---
const FileRow = React.memo(function FileRow({
  entry,
  onRemove,
}: {
  entry: FileEntry
  onRemove: (id: string) => void
}) {
  const Icon = getFileIcon(entry.mimeType)
  const StatusIcon = STATUS_ICON_MAP[entry.status]

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-secondary">
        {entry.preview ? (
          <img
            src={entry.preview}
            alt={entry.name}
            className="size-10 object-cover"
          />
        ) : (
          <Icon className="size-4 text-muted-foreground" strokeWidth={1.5} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.name}</p>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            {formatBytes(entry.size)}
          </span>
          {entry.error && (
            <span className="truncate text-xs text-destructive-foreground">
              · {entry.error}
            </span>
          )}
        </div>
        {entry.status !== 'pending' && (
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                'h-full rounded-full',
                entry.status === 'uploading' &&
                  'bg-primary transition-all duration-300',
                entry.status === 'complete' && 'w-full bg-success-foreground',
                (entry.status === 'error' || entry.status === 'cancelled') &&
                  'w-full bg-destructive-foreground opacity-60',
              )}
              style={
                entry.status === 'uploading'
                  ? { width: `${entry.progress}%` }
                  : undefined
              }
            />
          </div>
        )}
      </div>

      {/* Status */}
      <Button
        type="button"
        variant={STATUS_VARIANT[entry.status]}
        size="icon-sm"
        tabIndex={-1}
        aria-label={`Status: ${entry.status}`}
      >
        <StatusIcon
          className={entry.status === 'uploading' ? 'animate-spin' : undefined}
        />
      </Button>

      {/* Action */}
      <Button
        type="button"
        variant="destructive"
        size="icon-sm"
        onClick={() => onRemove(entry.id)}
        disabled={entry.deleting}
        aria-label={entry.status === 'complete' ? 'Delete file' : 'Remove file'}
      >
        {entry.deleting ? (
          <Loader2 className="animate-spin" />
        ) : entry.status === 'complete' ? (
          <Trash2 />
        ) : (
          <X />
        )}
      </Button>
    </div>
  )
})

// --- FileUploader ---
export function FileUploader({
  fileTypes,
  accept: acceptProp,
  multiple = false,
  maxFiles,
  minSize,
  maxSize,
  collection,
  modelType,
  modelId,
  label,
  description,
  initialFiles,
  validator,
  onUploadComplete,
  onUploadError,
  className,
  disabled = false,
}: FileUploaderProps) {
  // Seed with any pre-existing files (edit pages) as completed rows.
  const [entries, setEntries] = useState<FileEntry[]>(() =>
    (initialFiles ?? []).map((r) => ({
      id: ulid(),
      name: r.name,
      size: r.size,
      mimeType: r.mimeType,
      status: 'complete' as const,
      progress: 100,
      preview: r.mimeType.startsWith('image/') ? r.url : undefined,
      result: r,
    })),
  )
  const entriesRef = useRef<FileEntry[]>([]) // mirrors entries for unmount cleanup
  entriesRef.current = entries
  const controllersRef = useRef<Map<string, AbortController>>(new Map())
  const labelId = useId() // ties the label to the drop zone (a11y)

  const resolvedAccept = useMemo(
    () => resolveAccept(fileTypes, acceptProp),
    [fileTypes, acceptProp],
  )
  const DropzoneIcon = resolveDropzoneIcon(fileTypes)
  const autoDescription = useMemo(
    () =>
      description ??
      buildDescription(resolvedAccept, {
        maxSize,
        minSize,
        multiple,
        maxFiles,
      }),
    [description, resolvedAccept, maxSize, minSize, multiple, maxFiles],
  )

  // Abort all in-flight uploads and revoke ObjectURLs on unmount.
  useEffect(() => {
    const controllers = controllersRef.current
    return () => {
      controllers.forEach((c) => c.abort())
      controllers.clear()
      entriesRef.current.forEach((e) => {
        if (e.preview?.startsWith('blob:')) URL.revokeObjectURL(e.preview)
      })
    }
  }, [])

  // Merge a partial update into one entry by id.
  const patch = useCallback((id: string, changes: Partial<FileEntry>) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...changes } : e)),
    )
  }, [])

  // Upload via /api/upload (single PUT or multipart by size); progress + abort.
  const startUpload = useCallback(
    (entry: FileEntry) => {
      const file = entry.file
      if (!file) return // pre-existing rows are already complete
      const controller = new AbortController()
      controllersRef.current.set(entry.id, controller)
      patch(entry.id, { status: 'uploading' })

      uploadFile(file, {
        collection,
        modelType,
        modelId,
        signal: controller.signal,
        onProgress: (percent) => patch(entry.id, { progress: percent }),
      })
        .then((result) => {
          controllersRef.current.delete(entry.id)
          patch(entry.id, { status: 'complete', progress: 100, result })
          onUploadComplete?.(result)
        })
        .catch((err: unknown) => {
          controllersRef.current.delete(entry.id)
          if (
            controller.signal.aborted ||
            (err as Error)?.name === 'AbortError'
          ) {
            patch(entry.id, { status: 'cancelled', error: 'Upload cancelled' })
            return
          }
          const error = err instanceof Error ? err : new Error('Upload failed')
          patch(entry.id, { status: 'error', error: error.message })
          onUploadError?.(error, file)
        })
    },
    [patch, collection, modelType, modelId, onUploadComplete, onUploadError],
  )

  // react-dropzone callback: queue accepted files (+ show rejected), then upload.
  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      const newEntries: FileEntry[] = accepted.map((file) => ({
        id: ulid(),
        file,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        status: 'pending' as const,
        progress: 0,
        preview: file.type.startsWith('image/')
          ? URL.createObjectURL(file)
          : undefined,
      }))

      const rejectedEntries: FileEntry[] = rejected.map(({ file, errors }) => ({
        id: ulid(),
        file,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        status: 'error' as const,
        progress: 0,
        error: errors[0] ? friendlyError(errors[0]) : 'File rejected',
      }))

      setEntries((prev) => {
        if (!multiple) {
          // Single mode — abort + clean up the entry being replaced
          prev.forEach((e) => {
            if (e.preview?.startsWith('blob:')) URL.revokeObjectURL(e.preview)
            controllersRef.current.get(e.id)?.abort()
          })
          return [...newEntries, ...rejectedEntries].slice(0, 1)
        }
        return [...prev, ...newEntries, ...rejectedEntries]
      })

      newEntries.forEach(startUpload)
    },
    [multiple, startUpload],
  )

  const singleHasFile = !multiple && entries.length > 0
  const maxFilesReached =
    multiple && maxFiles !== undefined && entries.length >= maxFiles
  const dropzoneHidden = singleHasFile || maxFilesReached

  // Dynamic per-drop limit so cumulative entries never exceed maxFiles.
  const effectiveMaxFiles =
    multiple && maxFiles !== undefined
      ? Math.max(0, maxFiles - entries.length)
      : maxFiles

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
    isDragGlobal,
  } = useDropzone({
    onDrop,
    multiple,
    maxFiles: effectiveMaxFiles,
    minSize,
    maxSize,
    accept: resolvedAccept,
    disabled,
    // Chrome/Edge open the OS picker directly; others fall back to the input
    useFsAccessApi: true,
    validator,
    onError: handleDropzoneError,
  })

  // Remove a row: delete completed uploads server-side; abort in-flight ones.
  const removeEntry = useCallback(
    (id: string) => {
      const entry = entriesRef.current.find((e) => e.id === id)
      if (!entry) return

      // Completed → delete on the server first, then drop; revert on failure.
      if (entry.status === 'complete' && entry.result) {
        const { key } = entry.result
        patch(id, { deleting: true, error: undefined })
        fetch(`/api/upload/delete?key=${encodeURIComponent(key)}`, {
          method: 'DELETE',
        })
          .then((res) => {
            if (!res.ok) throw new Error(`Delete failed (${res.status})`)
            if (entry.preview?.startsWith('blob:'))
              URL.revokeObjectURL(entry.preview)
            setEntries((prev) => prev.filter((e) => e.id !== id))
          })
          .catch((err: unknown) => {
            const message = err instanceof Error ? err.message : 'Delete failed'
            patch(id, { deleting: false, error: message })
          })
        return
      }

      // Otherwise abort any in-flight upload and remove locally.
      controllersRef.current.get(id)?.abort()
      controllersRef.current.delete(id)
      if (entry.preview?.startsWith('blob:')) URL.revokeObjectURL(entry.preview)
      setEntries((prev) => prev.filter((e) => e.id !== id))
    },
    [patch],
  )

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Form-style label */}
      {label && (
        <Label id={labelId} className={cn(disabled && 'opacity-70')}>
          {label}
        </Label>
      )}

      {/* Dropzone */}
      {!dropzoneHidden && (
        <div
          {...getRootProps({ 'aria-labelledby': label ? labelId : undefined })}
          className={cn(
            'group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-input bg-background px-6 py-10 text-center transition-all duration-200 outline-none select-none',
            // Idle hover
            'hover:border-primary/50 hover:bg-muted',
            // Keyboard focus only — a click won't stick the highlight after the dialog
            'focus-visible:border-primary focus-visible:bg-muted',
            // Drag states
            (isDragGlobal || isDragActive) && 'bg-muted',
            isDragGlobal && !isDragActive && 'border-primary/40',
            isDragAccept && 'border-primary',
            isDragReject && 'border-destructive',
            disabled && 'pointer-events-none opacity-70',
          )}
        >
          <input {...getInputProps()} />

          {/* Drag overlay */}
          {isDragActive && (
            <div
              className={cn(
                'absolute inset-0 flex items-center justify-center rounded-md backdrop-blur-[2px]',
                isDragAccept && 'bg-primary/15',
                isDragReject && 'bg-destructive/15',
              )}
            >
              <p
                className={cn(
                  'text-sm font-semibold',
                  isDragAccept ? 'text-primary' : 'text-destructive-foreground',
                )}
              >
                {isDragAccept
                  ? 'Drop to upload'
                  : multiple
                    ? 'One or more unsupported file types'
                    : 'Unsupported file type'}
              </p>
            </div>
          )}

          <div
            className={cn(
              'flex size-16 items-center justify-center rounded-full bg-secondary transition-all duration-200 group-focus-visible:bg-primary/10',
              isDragAccept && 'scale-110 bg-primary/10',
              isDragReject && 'scale-110 bg-destructive/10',
            )}
          >
            {isDragReject ? (
              <AlertCircle
                className="size-7 text-destructive-foreground transition-colors duration-200"
                strokeWidth={1.5}
              />
            ) : (
              <DropzoneIcon
                className={cn(
                  'size-7 text-secondary-foreground transition-colors duration-200 group-focus-visible:text-primary',
                  isDragAccept && 'text-primary',
                )}
                strokeWidth={1.5}
              />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">
              Drag & drop {multiple ? 'files' : 'file'} here, or{' '}
              <span className="text-primary underline-offset-2 hover:underline">
                click to browse
              </span>
            </p>
            {autoDescription && (
              <p className="text-xs text-muted-foreground">{autoDescription}</p>
            )}
          </div>
        </div>
      )}

      {/* File list (single or multiple). In single mode the drop zone above is
          hidden once a file exists, so changing it means removing this row first
          — and removing a completed row deletes it from storage. */}
      {entries.length > 0 && (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => (
            <FileRow key={entry.id} entry={entry} onRemove={removeEntry} />
          ))}
        </div>
      )}
    </div>
  )
}
