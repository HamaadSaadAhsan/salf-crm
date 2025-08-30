import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {FileText, ImageIcon, Pause, Play, Square, X, FileIcon} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Progress} from "@/components/ui/progress";
import {usePortalContainer} from "@/contexts/PortalContainerContext";
import {useState} from "react";

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + sizes[i]
}

const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4"/>
    if (type.includes("text") || type.includes("document")) return <FileText className="h-4 w-4"/>
    return <FileIcon className="h-4 w-4"/>
}

interface AttachedFile {
    id: string
    name: string
    size: number
    type: string
    progress: number
    status: "uploading" | "paused" | "completed" | "error"
    preview?: string
    file?: File  // Add this if you want to store the actual file
}

const FileAttachmentItem = ({
                                file,
                                onRemove,
                                onPause,
                                onResume,
                                onStop,
                            }: {
    file: AttachedFile
    onRemove: (id: string) => void
    onPause: (id: string) => void
    onResume: (id: string) => void
    onStop: (id: string) => void
}) => {
    const truncatedName = file.name.length > 15 ? `${file.name.substring(0, 15)}...` : file.name
    const containerRef = usePortalContainer()
    const [isOpen, setIsOpen] = useState(false)

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <div onMouseEnter={() => {
                    setIsOpen(true)
                }}
                     onMouseLeave={() => {
                         setIsOpen(false)
                     }}
                     className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg p-2 hover:bg-gray-750 transition-colors cursor-pointer">
                    <div className="text-gray-400">
                        {file.file && file.type.startsWith("image/") ? (
                            <img
                                src={file.preview || URL.createObjectURL(file.file)}
                                alt={file.name}
                                className="h-auto w-10 rounded-sm"
                                width={16}
                                height={16}
                            />
                        ) : (
                            getFileIcon(file.type)
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-white truncate">{truncatedName}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onRemove(file.id)
                                }}
                                className="h-4 w-4 p-0 text-gray-400 hover:text-white hover:bg-gray-600 rounded-sm"
                            >
                                <X className="h-3 w-3"/>
                            </Button>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                            {file.status === "uploading" && (
                                <>
                                    <Progress value={file.progress} className="flex-1 h-1"/>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onPause(file.id)
                                            }}
                                            className="h-3 w-3 p-0 text-gray-400 hover:text-white"
                                        >
                                            <Pause className="h-2 w-2"/>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onStop(file.id)
                                            }}
                                            className="h-3 w-3 p-0 text-gray-400 hover:text-white"
                                        >
                                            <Square className="h-2 w-2"/>
                                        </Button>
                                    </div>
                                </>
                            )}
                            {file.status === "paused" && (
                                <>
                                    <Progress value={file.progress} className="flex-1 h-1"/>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onResume(file.id)
                                        }}
                                        className="h-3 w-3 p-0 text-gray-400 hover:text-white"
                                    >
                                        <Play className="h-2 w-2"/>
                                    </Button>
                                </>
                            )}
                            {file.status === "completed" && <span className="text-xs text-green-500">Completed</span>}
                            {file.status === "error" && <span className="text-xs text-red-500">Error</span>}
                        </div>
                    </div>
                </div>
            </PopoverTrigger>
            <PopoverContent container={containerRef} side="top" className="w-80 p-2 bg-gray-800 border-gray-700">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        {getFileIcon(file.type)}
                        <span className="text-sm font-medium text-white">{file.name}</span>
                    </div>
                    {file.file && file.type.startsWith("image/") && (
                        <div className="mt-2">
                            <img
                                src={URL.createObjectURL(file.file) || "/placeholder.svg"}
                                width={100}
                                height={100}
                                alt={file.name}
                                className="w-full h-28 rounded border border-gray-600 object-contain"
                            />
                        </div>
                    )}
                    {file.status === "uploading" && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Uploading...</span>
                                <span className="text-gray-400">{file.progress}%</span>
                            </div>
                            <Progress value={file.progress} className="h-2"/>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}

export default FileAttachmentItem
