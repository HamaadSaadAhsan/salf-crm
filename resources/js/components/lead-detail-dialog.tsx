import React, {useState, useEffect, useRef, useCallback, JSX} from "react"
import {
    X,
    ChevronLeft,
    ChevronRight,
    Paperclip,
    Mail,
    Phone,
    Globe,
    CircleArrowOutUpRightIcon,
    ChevronUpCircleIcon,
    ChevronRightCircleIcon,
    ChevronDownCircleIcon,
    FlameIcon,
    Maximize2,
    NotepadTextIcon,
    Loader2,
    TagIcon,
    FileText,
    Image,
    FileVideo,
    FileAudio,
    File,
    ChevronDown,
    ChevronUp,
} from "lucide-react"
import {IconBrandFacebook, IconBrandGoogle, IconBrandLinkedin} from "@tabler/icons-react"
import {Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle} from "@/components/ui/sheet"
import {Button} from "@/components/ui/button"
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar"
import {Badge} from "@/components/ui/badge"
import {Textarea} from "@/components/ui/textarea"
import {Separator} from "@/components/ui/separator"
import {Tabs, TabsList, TabsTrigger, TabsContent} from "@/components/ui/tabs"
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "@/components/ui/collapsible"
import type {Lead, LeadActivity} from "@/types/lead"
import LeadServiceCombobox from "@/components/LeadServiceCombobox"
import {PortalContainerProvider} from "@/contexts/PortalContainerContext"
import UserListCombobox from "./user-list-combobox"
import LeadFollowupPicker from "./lead-followup-picker"
import LeadStatusCombobox from "./lead-status-combobox"
import {formatDistanceToNow} from "date-fns/formatDistanceToNow"
import {useLead, useOptimisticLeadUpdate, useInfiniteLeadComments, useInfiniteLeadAllActivities} from "@/hooks/useLead"
import {useQueryClient} from "@tanstack/react-query";
import {LeadDialogMoreMenu} from "@/components/LeadDialogMoreMenu";
import {TagSelector} from "@/components/tag-selector";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import ActivityTypeCombobox from "@/components/ActivityTypeCombobox";
import FileAttachmentItem from "@/components/FileAttachmentItem";
import { toast } from 'sonner';
import { store } from "@/actions/App/Http/Controllers/Api/LeadActivityController"
import axios from 'axios';

interface LeadDetailDialogProps {
    isOpen: boolean
    onOpenChangeAction: (value: boolean) => void
    leadId: string | null  // Changed from lead to leadId
    onPrevious?: () => void
    onNext?: () => void
    hasPrevious?: boolean
    hasNext?: boolean
}

interface LeadTag {
    label: string
    value: string
    color?: string
    icon?: JSX.Element
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

// File Preview Component for tooltips
interface FilePreviewProps {
    attachment: any
}

const FilePreview = ({ attachment }: FilePreviewProps) => {
    const { original_name, mime_type, file_size, file_path } = attachment

    const getPreviewContent = () => {
        if (mime_type.startsWith('image/')) {
            return (
                <div className="space-y-2">
                    <div className="bg-gray-700 rounded-md p-2 max-w-xs">
                        <img
                            src={`/storage/${file_path}`}
                            alt={original_name}
                            className="w-full h-auto rounded max-h-55"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                const nextElement = e.currentTarget.nextElementSibling as HTMLElement
                                if (nextElement) {
                                    nextElement.style.display = 'block'
                                }
                            }}
                        />
                        <div style={{display: 'none'}} className="flex items-center justify-center h-24 text-gray-400">
                            <span>Preview not available</span>
                        </div>
                    </div>
                    <div className="py-2 px-2">
                        <p className="font-semibold text-sm">{original_name}</p>
                        <p className="text-xs text-gray-foreground">
                            {formatFileSize(file_size)} • {mime_type}
                        </p>
                    </div>
                </div>
            )
        }

        if (mime_type === 'application/pdf') {
            return (
                <div className="space-y-2">
                    <div className="bg-gray-700 rounded-md p-4 max-w-xs">
                        <div className="flex items-center justify-center h-24">
                            <FileText className="h-12 w-12 text-red-500" />
                        </div>
                        <p className="text-center text-sm mt-2">PDF Document</p>
                    </div>
                    <div className="space-y-1">
                        <p className="font-semibold text-sm">{original_name}</p>
                        <p className="text-xs text-gray-300">
                            {formatFileSize(file_size)} • {mime_type}
                        </p>
                    </div>
                </div>
            )
        }

        if (mime_type.startsWith('video/')) {
            return (
                <div className="space-y-2">
                    <div className="bg-gray-700 rounded-md p-4 max-w-xs">
                        <div className="flex items-center justify-center h-24">
                            <FileVideo className="h-12 w-12 text-blue-500" />
                        </div>
                        <p className="text-center text-sm mt-2">Video File</p>
                    </div>
                    <div className="space-y-1">
                        <p className="font-semibold text-sm">{original_name}</p>
                        <p className="text-xs text-gray-300">
                            {formatFileSize(file_size)} • {mime_type}
                        </p>
                    </div>
                </div>
            )
        }

        // Default preview for other file types
        return (
            <div className="space-y-1">
                <p className="font-semibold text-sm">{original_name}</p>
                <p className="text-xs text-gray-300">
                    {formatFileSize(file_size)} • {mime_type}
                </p>
            </div>
        )
    }

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    return getPreviewContent()
}

// Attachment Scroller Component - YouTube-style horizontal navigation
interface AttachmentScrollerProps {
    attachments: any[]
}

const AttachmentScroller = ({ attachments }: AttachmentScrollerProps) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(false)

    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
        if (mimeType.startsWith('video/')) return <FileVideo className="h-4 w-4" />;
        if (mimeType.startsWith('audio/')) return <FileAudio className="h-4 w-4" />;
        if (mimeType.includes('pdf') || mimeType.includes('document')) return <FileText className="h-4 w-4" />;
        return <File className="h-4 w-4" />;
    }

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    const checkScrollButtons = () => {
        const container = scrollContainerRef.current
        if (container) {
            setCanScrollLeft(container.scrollLeft > 0)
            setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth)
        }
    }

    const scroll = (direction: 'left' | 'right') => {
        const container = scrollContainerRef.current
        if (container) {
            const scrollAmount = 200
            container.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            })
        }
    }

    useEffect(() => {
        const container = scrollContainerRef.current
        if (container) {
            checkScrollButtons()
            const handleScroll = () => checkScrollButtons()
            const handleWheel = (e: WheelEvent) => {
                if (e.deltaX !== 0) {
                    e.preventDefault()
                    container.scrollLeft += e.deltaX
                }
            }

            container.addEventListener('scroll', handleScroll)
            container.addEventListener('wheel', handleWheel, { passive: false })

            return () => {
                container.removeEventListener('scroll', handleScroll)
                container.removeEventListener('wheel', handleWheel)
            }
        }
    }, [])

    return (
        <div className="relative group">
            {/* Hide scrollbar styles */}
            <style>{`
                .scroll-container::-webkit-scrollbar {
                    display: none;
                }
            `}</style>

            {/* Left scroll button */}
            {canScrollLeft && (
                <button
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gray-800/80 hover:bg-gray-700/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <ChevronLeft className="h-4 w-4 text-gray-300" />
                </button>
            )}

            {/* Right scroll button */}
            {canScrollRight && (
                <button
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gray-800/80 hover:bg-gray-700/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                </button>
            )}

            {/* Scrollable container */}
            <div
                ref={scrollContainerRef}
                className="scroll-container flex gap-2 overflow-x-auto py-2 px-1"
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                }}
            >
                {attachments.map((attachment, idx) => (
                    <TooltipProvider key={idx} delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-md cursor-pointer transition-colors min-w-fit">
                                    {getFileIcon(attachment.mime_type)}
                                    <span className="text-blue-400 text-xs whitespace-nowrap max-w-24 truncate">
                                        {attachment.original_name}
                                    </span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                                <div className="space-y-1">
                                    <p className="font-semibold text-sm">{attachment.original_name}</p>
                                    <p className="text-xs text-gray-foreground">
                                        {formatFileSize(attachment.file_size)} • {attachment.mime_type}
                                    </p>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ))}
            </div>
        </div>
    )
}

const leadTags: LeadTag[] = [
    {
        label: 'Potential',
        value: 'potential',
        color: 'yellow',
        icon: <TagIcon className="text-yellow-500"/>
    },
    {
        label: 'Non Potential',
        value: 'non-potential',
        color: 'red',
        icon: <TagIcon className="text-red-500"/>
    },
    {
        label: 'Meeting Done',
        value: 'meeting-done',
        color: 'green',
        icon: <TagIcon className="text-green-500"/>
    },
    {
        label: 'Not Interested',
        value: 'not-interested',
        color: 'gray',
        icon: <TagIcon className="text-gray-500"/>
    },
    {
        label: 'Not responsive',
        value: 'not-responsive',
        color: 'gray',
        icon: <TagIcon className="text-gray-500"/>
    },
    {
        label: 'Following Up',
        value: 'following-up',
        color: 'gray',
        icon: <TagIcon className="text-gray-500"/>
    },
]

export function LeadDetailDialog({
                                     isOpen,
                                     onOpenChangeAction,
                                     leadId,  // Now using leadId
                                     onPrevious,
                                     onNext,
                                     hasPrevious = false,
                                     hasNext = false,
                                 }: LeadDetailDialogProps) {
    const [comment, setComment] = useState("")
    const {mutate: updateLead} = useOptimisticLeadUpdate();
    const [description, setDescription] = useState("")
    const [selectedActivityType, setSelectedActivityType] = useState("")
    const {lead, loading: isLoading, error} = useLead(leadId);

    // Separate infinite scroll queries for comments and activities
    const commentsQuery = useInfiniteLeadComments(leadId);
    const allActivitiesQuery = useInfiniteLeadAllActivities(leadId);

    const queryClient = useQueryClient();
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [showTagsInputs, setShowTagsInputs] = useState<boolean>(false)
    const [selectedTags, setSelectedTags] = useState<LeadTag[]>([])
    const commentBoxRef = useRef(null);
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
    const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set())

    // Refs for scroll containers and active tab state
    const commentsScrollRef = useRef<HTMLDivElement>(null);
    const activitiesScrollRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState("comments");

    // Scroll handlers for infinite loading
    const handleScroll = useCallback((
        scrollElement: HTMLDivElement,
        hasNextPage: boolean | undefined,
        fetchNextPage: () => void,
        isFetchingNextPage: boolean
    ) => {
        if (!hasNextPage || isFetchingNextPage) return;

        const { scrollTop, scrollHeight, clientHeight } = scrollElement;
        const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;

        if (isNearBottom) {
            fetchNextPage();
        }
    }, []);

    // Set up scroll listeners with proper tab switching support
    useEffect(() => {
        // Use a small delay to ensure DOM elements are rendered after tab switch
        const setupListeners = () => {
            const commentsElement = commentsScrollRef.current;
            const activitiesElement = activitiesScrollRef.current;

            const commentsScrollHandler = () => {
                if (commentsElement && activeTab === "comments") {
                    handleScroll(
                        commentsElement,
                        commentsQuery.hasNextPage,
                        commentsQuery.fetchNextPage,
                        commentsQuery.isFetchingNextPage
                    );
                }
            };

            const activitiesScrollHandler = () => {
                if (activitiesElement && activeTab === "activity") {
                    handleScroll(
                        activitiesElement,
                        allActivitiesQuery.hasNextPage,
                        allActivitiesQuery.fetchNextPage,
                        allActivitiesQuery.isFetchingNextPage
                    );
                }
            };

            // Clean up existing listeners first
            if (commentsElement) {
                commentsElement.removeEventListener('scroll', commentsScrollHandler);
            }
            if (activitiesElement) {
                activitiesElement.removeEventListener('scroll', activitiesScrollHandler);
            }

            // Add new listeners based on active tab
            if (activeTab === "comments" && commentsElement) {
                commentsElement.addEventListener('scroll', commentsScrollHandler);
            }
            if (activeTab === "activity" && activitiesElement) {
                activitiesElement.addEventListener('scroll', activitiesScrollHandler);
            }

            return () => {
                if (commentsElement) {
                    commentsElement.removeEventListener('scroll', commentsScrollHandler);
                }
                if (activitiesElement) {
                    activitiesElement.removeEventListener('scroll', activitiesScrollHandler);
                }
            };
        };

        // Small delay to ensure DOM is ready after tab switch
        const timeoutId = setTimeout(setupListeners, 100);
        
        return () => {
            clearTimeout(timeoutId);
            setupListeners()(); // Call cleanup function
        };
    }, [activeTab, handleScroll, commentsQuery.hasNextPage, commentsQuery.fetchNextPage, commentsQuery.isFetchingNextPage, allActivitiesQuery.hasNextPage, allActivitiesQuery.fetchNextPage, allActivitiesQuery.isFetchingNextPage]);

    const debouncedUpdateDetails = useCallback((leadId: string, newDescription: string) => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        debounceTimeoutRef.current = setTimeout(() => {
            // Compare with the current lead detail from the cached data
            const cachedData = queryClient.getQueryData(['lead', leadId]) as { data?: Lead } | undefined;
            const currentLead = cachedData?.data;

            if (currentLead && newDescription !== currentLead.detail) {
                queryClient.setQueryData(['lead', leadId], (oldData: { data?: Lead } | undefined) => ({
                    ...oldData,
                    data: oldData?.data ? { ...oldData.data, detail: newDescription } : undefined
                }));

                updateLead({
                    id: leadId,
                    updates: {detail: newDescription}
                });
            }
        }, 1000);
    }, [updateLead, queryClient]); // Remove lead?.detail from dependencies



    // Clean up timeout on unmounting
    useEffect(() => {
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, []);

    // Handle description change with debouncing
    const handleDescriptionChange = (newDescription: string) => {
        setDescription(newDescription);

        if (leadId) {
            debouncedUpdateDetails(leadId, newDescription);
        }
    };


    // Reset comment when lead changes
    useEffect(() => {
        setComment("")
        setDescription(lead?.detail || "")
        setSelectedActivityType("")
    }, [lead?.id, lead?.detail]);

    useEffect(() => {
        if (!lead || !lead?.tags) {
            setSelectedTags([]);
            return;
        }

        const leadTagValues = lead?.tags.map((tag: LeadTag) => tag.value);
        const matchedTags = leadTags.filter(tag =>
          leadTagValues.includes(tag.value)
        );

        // Only update if tags actually changed
        setSelectedTags(prevTags => {
            const prevValues = prevTags.map(t => t.value).sort().join(',');
            const newValues = matchedTags.map(t => t.value).sort().join(',');

            if (prevValues === newValues) {
                return prevTags;
            }
            return matchedTags;
        });
    }, [lead?.id]);

    // Handle errors by closing the dialog and showing toast
    useEffect(() => {
        if (error && isOpen) {
            // Close the dialog
            onOpenChangeAction(false);

            // Show error toast
            toast.error('Failed to load lead', {
                description: 'There was an error loading the lead details.'
            });
        }
    }, [error, isOpen, onOpenChangeAction]);

    if (isLoading) {
        return (
          <Sheet open={isOpen} onOpenChange={onOpenChangeAction}>
              <SheetContent
                className="w-full sm:max-w-1xl md:max-w-2xl lg:max-w-3xl p-0 gap-0 bg-gray-900 text-white border-gray-800 [&>button]:hidden flex flex-col h-full overflow-y-auto"
              >
                  <SheetTitle className="sr-only">Loading Details</SheetTitle>
                  <SheetDescription></SheetDescription>
                  <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin mr-2"/>
                      <span>Loading lead details...</span>
                  </div>
              </SheetContent>
          </Sheet>
        )
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "urgent":
                return "text-red-500"
            case "high":
                return "text-orange-500"
            case "medium":
                return "text-green-500"
            case "low":
                return "text-cyan-400"
            default:
                return "text-gray-500"
        }
    }

    const getCountryDisplayName = (countryCode: string) => {
        try {
            if (!countryCode || countryCode.trim() === '') {
                return 'Unknown';
            }
            return new Intl.DisplayNames(['en'], { type: 'region' }).of(countryCode) || countryCode;
        } catch (error) {
            console.warn('Invalid country code:', countryCode);
            return countryCode || 'Unknown';
        }
    }

    // Helper function to safely access source properties
    const getSourceProperty = (property: 'slug' | 'name') => {
        if (!lead?.source) return null;

        // Handle { data: LeadSource } format
        if ('data' in lead.source && lead.source.data) {
            return lead.source.data[property];
        }

        // Handle direct LeadSource format
        if ('slug' in lead.source) {
            return lead.source[property];
        }

        return null;
    }

    // Helper functions for attachments (using the ones from AttachmentScroller)
    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
        if (mimeType.startsWith('video/')) return <FileVideo className="h-4 w-4" />;
        if (mimeType.startsWith('audio/')) return <FileAudio className="h-4 w-4" />;
        if (mimeType.includes('pdf') || mimeType.includes('document')) return <FileText className="h-4 w-4" />;
        return <File className="h-4 w-4" />;
    }

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    const toggleActivityExpansion = (activityId: string) => {
        setExpandedActivities(prev => {
            const newSet = new Set(prev);
            if (newSet.has(activityId)) {
                newSet.delete(activityId);
            } else {
                newSet.add(activityId);
            }
            return newSet;
        });
    }

    const handleSubmitComment = async () => {
        // Allow submission if there's either text or attachments
        const hasText = comment.trim();
        const hasAttachments = attachedFiles.some(file => file.status === 'completed');

        if ((!hasText && !hasAttachments) || !leadId) return;

        const activityType = selectedActivityType || 'note'; // Default to 'note' if no type selected (treated as comment)

        try {
            // Create FormData for file uploads
            const formData = new FormData();
            formData.append('lead_id', leadId);
            formData.append('type', activityType);
            if (comment.trim()) {
                formData.append('description', comment.trim());
            }
            formData.append('subject', `${activityType.charAt(0).toUpperCase() + activityType.slice(1)} activity`);

            // Add attachments if any
            attachedFiles.forEach((attachedFile) => {
                if (attachedFile.file && attachedFile.status === 'completed') {
                    formData.append('attachments[]', attachedFile.file);
                }
            });

            const response = await axios.post(store.url(), formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Success handling
            setComment('');
            setSelectedActivityType('');
            setAttachedFiles([]); // Clear attachments
            toast.success('Activity created successfully');

            // Invalidate queries to refresh data
            await queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
            await queryClient.invalidateQueries({ queryKey: ['lead-activities', 'comments', leadId] });
            await queryClient.invalidateQueries({ queryKey: ['lead-activities', 'all', leadId] });

        } catch (err: any) {
            console.error('Activity creation error:', err);

            // Handle validation errors
            if (err.response?.status === 422 && err.response?.data?.errors) {
                const errors = err.response.data.errors;
                const errorMessages = Object.values(errors).flat();
                toast.error('Validation failed', {
                    description: errorMessages.join(', '),
                });
            } else {
                toast.error('Failed to create activity', {
                    description: 'There was an error creating the activity.',
                });
            }
        }
    }

    const handleTagInputsShow = (value: boolean) => {
        setShowTagsInputs(value)
    }

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (!files) return

        Array.from(files).forEach((file) => {
            const fileId = Math.random().toString(36).substring(2, 9)
            const newFile: AttachedFile = {
                id: fileId,
                name: file.name,
                size: file.size,
                type: file.type,
                progress: 0,
                status: "uploading",
                file: file,
            }

            if (file.type.startsWith("image/")) {
                const reader = new FileReader()
                reader.onload = (e) => {
                    setAttachedFiles((prev) =>
                      prev.map((f) => (f.id === fileId ? {...f, preview: e.target?.result as string} : f)),
                    )
                }
                reader.readAsDataURL(file)
            }

            setAttachedFiles((prev) => [...prev, newFile])

            const interval = setInterval(() => {
                setAttachedFiles((prev) =>
                  prev.map((f) => {
                      if (f.id === fileId && f.status === "uploading") {
                          const newProgress = Math.min(f.progress + Math.random() * 15, 100)
                          if (newProgress >= 100) {
                              clearInterval(interval)
                              return {...f, progress: 100, status: "completed"}
                          }
                          return {...f, progress: newProgress}
                      }
                      return f
                  }),
                )
            }, 200)
        })

        event.target.value = ""
    }

    const handleRemoveFile = (fileId: string) => {
        setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId))
    }

    const handlePauseFile = (fileId: string) => {
        setAttachedFiles((prev) => prev.map((f) => (f.id === fileId ? {...f, status: "paused"} : f)))
    }

    const handleResumeFile = (fileId: string) => {
        setAttachedFiles((prev) => prev.map((f) => (f.id === fileId ? {...f, status: "uploading"} : f)))
    }

    const handleStopFile = (fileId: string) => {
        setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId))
    }

    if (!leadId || !isOpen) return null

    return (
      <Sheet open={isOpen} onOpenChange={onOpenChangeAction}>
          <SheetContent
            className="w-full sm:max-w-1xl md:max-w-2xl lg:max-w-3xl p-0 gap-0 bg-gray-900 text-white border-gray-800 [&>button]:hidden flex flex-col h-full"
          >
              <SheetHeader className="p-0">
                  <SheetTitle className="sr-only">Lead Details - {lead?.name}</SheetTitle>
                  <SheetDescription></SheetDescription>
              </SheetHeader>
              {/* Scrollable Content */}
              <div className="flex-grow overflow-y-auto">

                  {/* Header */}
                  <div className="flex items-center justify-between p-3 border-b border-gray-800">
                      <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                onOpenChangeAction(false)
                            }}
                            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
                          >
                              <X className="h-4 w-4"/>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={onPrevious}
                            disabled={!hasPrevious}
                            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30"
                          >
                              <ChevronLeft className="h-4 w-4"/>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={onNext}
                            disabled={!hasNext}
                            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30"
                          >
                              <ChevronRight className="h-4 w-4"/>
                          </Button>
                      </div>

                      <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon"
                                  className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800">
                              <Maximize2 className="h-4 w-4"/>
                          </Button>
                          <PortalContainerProvider container={containerRef.current}>
                              <LeadDialogMoreMenu
                                handleTagsInputsShow={(value: boolean) => handleTagInputsShow(value)}/>
                          </PortalContainerProvider>
                      </div>
                  </div>

                  {/* Status Badge */}
                  <div ref={containerRef}>
                      <PortalContainerProvider container={containerRef.current}>
                          <LeadStatusCombobox lead={lead}/>
                      </PortalContainerProvider>
                  </div>

                  {/* Task Title */}
                  <div className="px-4 pb-4">
                      <div className="flex items-center-safe gap-2">
                          <h1 className="text-xl font-semibold text-white mb-1">{lead?.name}</h1>
                      </div>
                  </div>

                  {/* Main Content */}
                  <div className="px-4 space-y-6">
                      {/* Assignee */}
                      <div className="flex items-center">
                          <div ref={containerRef}>
                              <PortalContainerProvider container={containerRef.current}>
                                  <UserListCombobox lead={lead}/>
                              </PortalContainerProvider>
                          </div>
                      </div>

                      {/* Followup Date */}
                      <div ref={containerRef}>
                          <PortalContainerProvider container={containerRef.current}>
                              <LeadFollowupPicker lead={lead}/>
                          </PortalContainerProvider>
                      </div>

                      {/* Service */}
                      <div ref={containerRef}>
                          <PortalContainerProvider container={containerRef.current}>
                              <LeadServiceCombobox lead={lead}/>
                          </PortalContainerProvider>
                      </div>

                      {/* Selected Tags */}
                      <div ref={containerRef}>
                          <PortalContainerProvider container={containerRef.current}>
                              <TagSelector
                                lead={lead}
                                selectedTags={selectedTags}
                                availableTags={leadTags}
                                onTagAdd={(tag) => {
                                    const newTags = [...selectedTags, tag]
                                    setSelectedTags(newTags)
                                    updateLead({
                                        id: leadId,
                                        updates: {
                                            tags: newTags
                                        }
                                    })
                                }}
                                onTagRemove={(tagValue) => {
                                    const newTags = selectedTags.filter((tag) => tag.value !== tagValue);
                                    setSelectedTags(newTags);

                                    updateLead({
                                        id: leadId,
                                        updates: {
                                            tags: newTags
                                        }
                                    });
                                }}
                                showTagsInputs={showTagsInputs}
                                onShowTagsInputsChange={setShowTagsInputs}
                              />
                          </PortalContainerProvider>
                      </div>

                      {/* Add Notes */}
                      <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-300 w-20 flex-shrink-0"></span>
                          <Button variant="ghost"
                                  className="text-sm text-gray-400 hover:text-yellow-500 h-auto px-1 py-0 font-normal cursor-pointer">
                              <NotepadTextIcon className="hover:text-yellow-400"/> Add private notes
                          </Button>
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                          <span className="text-sm text-gray-300">Description</span>
                          <Textarea
                            value={description}
                            onChange={(e) => handleDescriptionChange(e.target.value)}
                            placeholder="What is this lead about?"
                            className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 min-h-[100px] resize-none"
                          />
                      </div>

                      <Separator className="bg-gray-800"/>
                  </div>

                  {/* Lead-specific info section */}
                  <div className="px-4 pb-4 space-y-4">
                      <Separator className="bg-gray-800"/>

                      {/* Lead Details */}
                      <div className="space-y-3">
                          <h3 className="text-sm font-medium text-gray-300">Lead Information</h3>

                          <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-400 w-16 flex-shrink-0">City</span>
                              <div className="flex items-center gap-2">
                                    <span
                                      className="text-sm text-white">{lead?.city}</span>
                              </div>
                          </div>

                          <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-400 w-16 flex-shrink-0">Country</span>
                              <div className="flex items-center gap-2">
                                    <span
                                      className="text-sm text-white">{getCountryDisplayName(lead?.country || '')}</span>
                              </div>
                          </div>

                          {/* Source */}
                          <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-400 w-16 flex-shrink-0">Source</span>
                              <div className="flex items-center gap-2">
                                  {getSourceProperty('slug') === "facebook-ads" &&
                                    <IconBrandFacebook className="h-4 w-4 text-blue-600"/>}
                                  {getSourceProperty('slug') === "google-ads" &&
                                    <IconBrandGoogle className="h-4 w-4 text-red-500"/>}
                                  {getSourceProperty('slug') === "linkedin" &&
                                    <IconBrandLinkedin className="h-4 w-4 text-blue-700"/>}
                                  {getSourceProperty('slug') === "cold-call" && <Phone className="h-4 w-4 text-blue-500"/>}
                                  {getSourceProperty('slug') === "email-campaign" &&
                                    <Mail className="h-4 w-4 text-purple-500"/>}
                                  {getSourceProperty('slug') === "website-contact-form" &&
                                    <Globe className="h-4 w-4 text-cyan-500"/>}
                                  <span className="text-sm text-white">{getSourceProperty('name')}</span>
                              </div>
                          </div>

                          {/* Priority */}
                          <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-400 w-16 flex-shrink-0">Priority</span>
                              <div className="flex items-center gap-2">
                                  {lead?.priority === "urgent" &&
                                    <CircleArrowOutUpRightIcon size={16} className="text-red-500"/>}
                                  {lead?.priority === "high" &&
                                    <ChevronUpCircleIcon size={16} className="text-orange-500"/>}
                                  {lead?.priority === "medium" &&
                                    <ChevronRightCircleIcon size={16} className="text-green-500"/>}
                                  {lead?.priority === "low" &&
                                    <ChevronDownCircleIcon size={16} className="text-cyan-400"/>}
                                  <span
                                    className={`text-sm capitalize ${getPriorityColor(lead?.priority || "")}`}>{lead?.priority}</span>
                              </div>
                          </div>

                          {/* Hot Lead */}
                          {lead?.is_hot_lead && (
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-400 w-16 flex-shrink-0">Hot Lead</span>
                                <div className="flex items-center gap-2">
                                    <FlameIcon className="text-orange-400" size={16}/>
                                    <span className="text-sm text-orange-400">Yes</span>
                                </div>
                            </div>
                          )}

                          {/* Labels */}
                          {lead?.labels && lead?.labels.length > 0 && (
                            <div className="flex items-start gap-3">
                                <span className="text-sm text-gray-400 w-16 flex-shrink-0">Labels</span>
                                <div className="flex flex-wrap gap-2">
                                    {lead?.labels.map((label: string, index: number) => (
                                      <Badge key={index} variant="secondary"
                                             className="bg-gray-800 text-gray-300 border-gray-700">
                                          {label}
                                      </Badge>
                                    ))}
                                </div>
                            </div>
                          )}
                      </div>
                  </div>

                  {/* Comments & Activity Section */}
                  <div className="pt-5 bg-gray-800">
                      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
                          <TabsList
                            className="grid w-fit grid-cols-2 bg-transparent p-0 border-gray-800 rounded-none mx-4">
                              <TabsTrigger
                                value="comments"
                                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-white px-0 pb-3 pt-2 rounded-none text-gray-400 text-sm font-medium mr-4 dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-b-primary dark:data-[state=active]:border-l-0 dark:data-[state=active]:border-r-0 dark:data-[state=active]:border-t-0"
                              >
                                  Comments
                              </TabsTrigger>
                              <TabsTrigger
                                value="activity"
                                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-white px-0 pb-3 pt-2 rounded-none text-gray-400 text-sm font-medium dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-b-primary dark:data-[state=active]:border-l-0 dark:data-[state=active]:border-r-0 dark:data-[state=active]:border-t-0"
                              >
                                  All activity
                              </TabsTrigger>
                          </TabsList>

                          <Separator/>

                          <TabsContent value="comments" className="mt-0 px-0 py-0">
                              <div
                                  ref={commentsScrollRef}
                                  className="max-h-96 overflow-y-auto px-4 py-4"
                              >
                                  {(() => {
                                      const allCommentsData = commentsQuery.data?.pages?.flatMap(page => page.data) || [];

                                      if (commentsQuery.isLoading && allCommentsData.length === 0) {
                                          return (
                                              <div className="flex items-center justify-center py-8">
                                                  <Loader2 className="h-6 w-6 animate-spin mr-2"/>
                                                  <span className="text-gray-400">Loading comments...</span>
                                              </div>
                                          );
                                      }

                                      if (allCommentsData.length === 0) {
                                          return <p className="text-gray-400">No comments yet.</p>;
                                      }

                                      return (
                                          <div className="space-y-4">
                                              {allCommentsData.map((activity: LeadActivity, index: number) => {
                                                  const isAssignee = activity.user?.id === lead?.assigned_to?.id;

                                                  return (
                                                      <div
                                                          key={activity.id || index}
                                                          className={`flex ${isAssignee ? 'justify-start' : 'justify-end'}`}
                                                      >
                                                          <div className={`flex gap-3 max-w-[80%] ${isAssignee ? 'flex-row' : 'flex-row-reverse'}`}>
                                                              <Avatar className="h-8 w-8 flex-shrink-0">
                                                                  <AvatarImage src="/placeholder.svg?height=32&width=32"/>
                                                                  <AvatarFallback
                                                                      className="bg-blue-600 text-white text-sm"
                                                                  >
                                                                      {activity?.user?.name?.[0] || '?'}
                                                                  </AvatarFallback>
                                                              </Avatar>

                                                              <div className={`flex flex-col ${isAssignee ? 'items-start' : 'items-end'}`}>
                                                                  <div
                                                                      className={`rounded-2xl px-4 py-2 max-w-full break-words ${
                                                                          isAssignee
                                                                              ? 'bg-gray-700 text-white'
                                                                              : 'bg-blue-600 text-white'
                                                                      }`}
                                                                  >
                                                                      {activity.description && (
                                                                          <p className="text-sm whitespace-pre-wrap">{activity.description}</p>
                                                                      )}

                                                                      {/* Attachments for comments */}
                                                                      {activity.attachments && activity.attachments.length > 0 && (
                                                                          <div className="mt-2 space-y-2">
                                                                              {activity.attachments.map((attachment: any, attIdx: number) => (
                                                                                  <TooltipProvider key={attIdx} delayDuration={100}>
                                                                                      <Tooltip>
                                                                                          <TooltipTrigger asChild>
                                                                                              <div className={`flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer transition-colors ${
                                                                                                  isAssignee
                                                                                                      ? 'bg-gray-600 hover:bg-gray-500'
                                                                                                      : 'bg-blue-700 hover:bg-blue-800'
                                                                                              }`}>
                                                                                                  {getFileIcon(attachment.mime_type)}
                                                                                                  <span className="text-xs truncate max-w-32">
                                                                                                      {attachment.original_name}
                                                                                                  </span>
                                                                                              </div>
                                                                                          </TooltipTrigger>
                                                                                          <TooltipContent side="top" className="max-w-md p-0 border-gray-600">
                                                                                              <FilePreview attachment={attachment} />
                                                                                          </TooltipContent>
                                                                                      </Tooltip>
                                                                                  </TooltipProvider>
                                                                              ))}
                                                                          </div>
                                                                      )}
                                                                  </div>

                                                                  <div className={`flex items-center gap-2 mt-1 text-xs text-gray-400 ${isAssignee ? 'flex-row' : 'flex-row-reverse'}`}>
                                                                      <span className="font-medium">{activity?.user?.name}</span>
                                                                      <span>•</span>
                                                                      <span>{formatDistanceToNow(new Date(activity.created_at), {addSuffix: true})}</span>
                                                                  </div>
                                                              </div>
                                                          </div>
                                                      </div>
                                                  );
                                              })}

                                              {/* Loading indicator for infinite scroll */}
                                              {commentsQuery.isFetchingNextPage && (
                                                  <div className="flex items-center justify-center py-4">
                                                      <Loader2 className="h-4 w-4 animate-spin mr-2"/>
                                                      <span className="text-gray-400 text-sm">Loading more comments...</span>
                                                  </div>
                                              )}
                                          </div>
                                      );
                                  })()}
                              </div>
                          </TabsContent>

                          <TabsContent value="activity" className="mt-0 px-0 py-0">
                              <div
                                  ref={activitiesScrollRef}
                                  className="max-h-96 overflow-y-auto px-4 py-4 text-gray-400 text-sm"
                              >
                                  {(() => {
                                      const allActivitiesData = allActivitiesQuery.data?.pages?.flatMap(page => page.data) || [];

                                      if (allActivitiesQuery.isLoading && allActivitiesData.length === 0) {
                                          return (
                                              <div className="flex items-center justify-center py-8">
                                                  <Loader2 className="h-6 w-6 animate-spin mr-2"/>
                                                  <span className="text-gray-400">Loading activities...</span>
                                              </div>
                                          );
                                      }

                                      return (
                                          <div className="space-y-4">
                                              {/* Lead creation activity */}
                                              <div className="flex items-center gap-3">
                                                  <Avatar className="h-8 w-8">
                                                      <AvatarImage src="/placeholder.svg?height=32&width=32"/>
                                                      <AvatarFallback
                                                        className="bg-blue-600 text-white text-sm">{lead?.created_by?.name?.[0]}</AvatarFallback>
                                                  </Avatar>
                                                  <div>
                                                      <p className="text-sm text-white">
                                                          <span className="font-semibold">{lead?.created_by?.name}</span> created
                                                          this lead &middot; {lead?.created_at}
                                                      </p>
                                                  </div>
                                              </div>

                                              {/* All activities */}
                                              {allActivitiesData.length > 0 && (
                                                <div className="ml-11 text-gray-300 text-sm space-y-3">
                                                    {allActivitiesData.map((activity: LeadActivity, index: number) => (
                                                      <div key={activity.id || index} className="space-y-2">
                                                          <div className="flex items-start justify-between">
                                                              <div className="flex-1">
                                                                  <span className="font-semibold mr-1">{activity?.user?.name}</span>
                                                                  <span className="mr-1">
                                                                      {activity.attachments && activity.attachments.length === 1
                                                                        ? (
                                                                            <>
                                                                                attached{' '}
                                                                                <TooltipProvider delayDuration={100}>
                                                                                    <Tooltip>
                                                                                        <TooltipTrigger asChild>
                                                                                            <span className="text-blue-400 hover:text-blue-300 cursor-pointer underline decoration-dotted underline-offset-2">
                                                                                                {activity.attachments[0].original_name}
                                                                                            </span>
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent side="right" className="max-w-md p-0 border-gray-600">
                                                                                            <FilePreview attachment={activity.attachments[0]} />
                                                                                        </TooltipContent>
                                                                                    </Tooltip>
                                                                                </TooltipProvider>
                                                                            </>
                                                                        )
                                                                        : activity.description
                                                                      }
                                                                  </span>
                                                                  <span className="mr-1">&middot;</span>
                                                                  <span className="text-gray-400">
                                                                      {formatDistanceToNow(new Date(activity.created_at), {addSuffix: true})}
                                                                  </span>
                                                              </div>
                                                          </div>

                                                          {/* Attachments Display - Only show for multiple attachments */}
                                                          {activity.attachments && activity.attachments.length > 1 && (
                                                            <div className="space-y-2">
                                                                <Collapsible>
                                                                    <CollapsibleTrigger asChild>
                                                                        <Button
                                                                          variant="ghost"
                                                                          className="h-auto p-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-gray-800"
                                                                          onClick={() => toggleActivityExpansion(activity.id || `${index}`)}
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <File className="h-3 w-3" />
                                                                                <span>{activity.attachments.length} attachments</span>
                                                                                {expandedActivities.has(activity.id || `${index}`) ?
                                                                                  <ChevronUp className="h-3 w-3" /> :
                                                                                  <ChevronDown className="h-3 w-3" />
                                                                                }
                                                                            </div>
                                                                        </Button>
                                                                    </CollapsibleTrigger>
                                                                    <CollapsibleContent>
                                                                        <AttachmentScroller attachments={activity.attachments} />
                                                                    </CollapsibleContent>
                                                                </Collapsible>
                                                            </div>
                                                          )}
                                                      </div>
                                                    ))}
                                                </div>
                                              )}

                                              {/* Loading indicator for infinite scroll */}
                                              {allActivitiesQuery.isFetchingNextPage && (
                                                  <div className="flex items-center justify-center py-4">
                                                      <Loader2 className="h-4 w-4 animate-spin mr-2"/>
                                                      <span className="text-gray-400 text-sm">Loading more activities...</span>
                                                  </div>
                                              )}

                                              {/* No activities message */}
                                              {allActivitiesData.length === 0 && !allActivitiesQuery.isLoading && (
                                                  <div className="ml-11 text-gray-400 text-sm">
                                                      No activities yet.
                                                  </div>
                                              )}
                                          </div>
                                      );
                                  })()}
                              </div>
                          </TabsContent>
                      </Tabs>
                  </div>
              </div>

              {/* Comment input box (always visible at the bottom) */}
              <SheetFooter className="p-4 space-y-4 border-t border-gray-800">
                  <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                          <AvatarImage src="/placeholder.svg?height=32&width=32"/>
                          <AvatarFallback
                            className="bg-blue-600 text-white text-sm">{lead?.assigned_to?.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                          <Textarea
                            ref={commentBoxRef}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Add a comment"
                            className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 min-h-[80px] resize-none"
                          />

                          {/* File Attachments */}
                          {attachedFiles.length > 0 && (
                            <div className="py-2">
                                <div ref={containerRef} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <PortalContainerProvider container={containerRef.current}>
                                        {attachedFiles.map((file) => (
                                          <FileAttachmentItem
                                            key={file.id}
                                            file={file}
                                            onRemove={handleRemoveFile}
                                            onPause={handlePauseFile}
                                            onResume={handleResumeFile}
                                            onStop={handleStopFile}
                                          />
                                        ))}
                                    </PortalContainerProvider>
                                </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-2">

                              <div className="flex items-center gap-2">
                                  <TooltipProvider delayDuration={0}>
                                      <Tooltip>
                                          <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="cursor-pointer h-8 w-8 text-gray-400 hover:text-white dark:hover:bg-blue-900 hover:bg-blue-900"
                                              >
                                                  <Paperclip className="h-4 w-4"/>
                                              </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                              <p>Attach file</p>
                                          </TooltipContent>
                                      </Tooltip>
                                  </TooltipProvider>

                                  <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    accept="*/*"
                                  />

                                  <div ref={containerRef}>
                                      <PortalContainerProvider container={containerRef.current}>
                                          <ActivityTypeCombobox
                                            lead={lead}
                                            commentBoxRef={commentBoxRef}
                                            selectedType={selectedActivityType}
                                            onTypeChange={setSelectedActivityType}
                                          />
                                      </PortalContainerProvider>
                                  </div>
                              </div>
                              <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">0 people will be notified</span>
                                  <Button
                                    onClick={handleSubmitComment}
                                    disabled={!comment.trim() && !attachedFiles.some(file => file.status === 'completed')}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 h-auto text-sm disabled:opacity-50"
                                  >
                                      Comment
                                  </Button>
                              </div>
                          </div>
                      </div>
                  </div>
              </SheetFooter>
          </SheetContent>
      </Sheet>
    )
}

LeadDetailDialog.displayName = 'LeadDetailDialog'
