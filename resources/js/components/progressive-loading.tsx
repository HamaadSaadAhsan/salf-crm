import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

// Progressive loading states
type LoadingState = 'idle' | 'loading' | 'loaded' | 'error' | 'stale'

interface ProgressiveLoadingProps {
  children: React.ReactNode
  isLoading?: boolean
  skeleton?: React.ReactNode
  error?: Error | null
  staleWhileRevalidate?: boolean
  minimumLoadingTime?: number
  className?: string
}

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'rectangular' | 'circular' | 'pulse'
  width?: string | number
  height?: string | number
  lines?: number
  animate?: boolean
}

// Enhanced skeleton component with multiple variants
export const Skeleton: React.FC<SkeletonProps> = ({
                                                    className,
                                                    variant = 'pulse',
                                                    width,
                                                    height,
                                                    lines = 1,
                                                    animate = true,
                                                    ...props
                                                  }) => {
  const baseClasses = cn(
    'bg-gray-200 dark:bg-gray-700',
    animate && 'animate-pulse',
    className
  )

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  }

  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              baseClasses,
              'h-4 rounded',
              index === lines - 1 && 'w-3/4' // Last line shorter
            )}
            style={index === 0 ? style : undefined}
          />
        ))}
      </div>
    )
  }

  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'rounded',
    circular: 'rounded-full',
    pulse: 'rounded',
  }

  return (
    <div
      className={cn(baseClasses, variantClasses[variant])}
      style={style}
      {...props}
    />
  )
}

// Lead row skeleton with exact structure matching
export const LeadRowSkeleton: React.FC<{ animate?: boolean }> = ({ animate = true }) => (
  <div className="grid grid-cols-[28px_28px_28px_28px_160px_1fr_auto_auto_60px_auto_auto] items-center px-4 py-3 border-b">
    <Skeleton variant="rectangular" width={16} height={16} animate={animate} />
    <Skeleton variant="circular" width={16} height={16} animate={animate} />
    <Skeleton variant="circular" width={16} height={16} animate={animate} />
    <Skeleton variant="circular" width={16} height={16} animate={animate} />
    <Skeleton variant="text" width={120} animate={animate} />
    <Skeleton variant="text" width="80%" animate={animate} />
    <Skeleton variant="text" width={80} animate={animate} />
    <Skeleton variant="rectangular" width={60} height={20} animate={animate} />
    <Skeleton variant="text" width={40} animate={animate} />
    <Skeleton variant="text" width={60} animate={animate} />
  </div>
)

// Lead list skeleton
export const LeadListSkeleton: React.FC<{
  rows?: number
  showHeader?: boolean
  animate?: boolean
}> = ({
        rows = 10,
        showHeader = true,
        animate = true
      }) => (
  <div className="space-y-0">
    {showHeader && (
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <Skeleton variant="rectangular" width={16} height={16} animate={animate} />
          <Skeleton variant="text" width={100} animate={animate} />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton variant="text" width={80} animate={animate} />
          <Skeleton variant="rectangular" width={60} height={24} animate={animate} />
        </div>
      </div>
    )}
    {Array.from({ length: rows }).map((_, index) => (
      <LeadRowSkeleton key={index} animate={animate} />
    ))}
  </div>
)

// Card skeleton for lead details
export const LeadCardSkeleton: React.FC<{ animate?: boolean }> = ({ animate = true }) => (
  <div className="p-6 space-y-4 border rounded-lg">
    <div className="flex items-center justify-between">
      <Skeleton variant="text" width={200} height={24} animate={animate} />
      <Skeleton variant="rectangular" width={80} height={32} animate={animate} />
    </div>

    <div className="space-y-3">
      <Skeleton variant="text" lines={2} animate={animate} />
      <div className="flex gap-2">
        <Skeleton variant="rectangular" width={60} height={20} animate={animate} />
        <Skeleton variant="rectangular" width={80} height={20} animate={animate} />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Skeleton variant="text" width={60} animate={animate} />
        <Skeleton variant="text" width={120} animate={animate} />
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" width={80} animate={animate} />
        <Skeleton variant="text" width={100} animate={animate} />
      </div>
    </div>
  </div>
)

// Progressive image loader - Inertia compatible
export const ProgressiveImage: React.FC<{
  src: string
  alt: string
  className?: string
  placeholderSrc?: string
  blurDataURL?: string
  width?: number
  height?: number
}> = ({ src, alt, className, placeholderSrc, blurDataURL, width, height }) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (imgRef.current?.complete) {
      setImageLoaded(true)
    }
  }, [])

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Placeholder/blur image */}
      {(placeholderSrc || blurDataURL) && !imageLoaded && (
        <img
          src={placeholderSrc || blurDataURL || "/placeholder.png"}
          alt=""
          className={cn(
            'absolute inset-0 w-full h-full object-cover',
            blurDataURL && 'filter blur-sm scale-110'
          )}
        />
      )}

      {/* Loading skeleton */}
      {!imageLoaded && !imageError && !placeholderSrc && !blurDataURL && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}

      {/* Main image */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          imageLoaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
      />

      {/* Error state */}
      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <span className="text-xs text-gray-500">Failed to load</span>
        </div>
      )}
    </div>
  )
}

// Progressive loading wrapper with smart loading states
export const ProgressiveLoader: React.FC<ProgressiveLoadingProps> = ({
                                                                       children,
                                                                       isLoading = false,
                                                                       skeleton,
                                                                       error,
                                                                       staleWhileRevalidate = false,
                                                                       minimumLoadingTime = 0,
                                                                       className,
                                                                     }) => {
  const [showSkeleton, setShowSkeleton] = useState(isLoading)
  const [loadingState, setLoadingState] = useState<LoadingState>('idle')
  const loadingStartTime = useRef<number | null>(null)
  const minimumTimeoutId = useRef<NodeJS.Timeout | null>(null)

  // Handle loading state changes with minimum loading time
  useEffect(() => {
    if (isLoading) {
      if (loadingState === 'idle' || loadingState === 'loaded') {
        setLoadingState('loading')
        loadingStartTime.current = Date.now()
        setShowSkeleton(true)
      } else if (staleWhileRevalidate) {
        setLoadingState('stale')
      }
    } else if (loadingState === 'loading' || loadingState === 'stale') {
      const finishLoading = () => {
        setLoadingState('loaded')
        setShowSkeleton(false)
      }

      if (minimumLoadingTime > 0 && loadingStartTime.current) {
        const elapsed = Date.now() - loadingStartTime.current
        const remaining = minimumLoadingTime - elapsed

        if (remaining > 0) {
          minimumTimeoutId.current = setTimeout(finishLoading, remaining)
        } else {
          finishLoading()
        }
      } else {
        finishLoading()
      }
    }

    return () => {
      if (minimumTimeoutId.current) {
        clearTimeout(minimumTimeoutId.current)
      }
    }
  }, [isLoading, loadingState, minimumLoadingTime, staleWhileRevalidate])

  // Handle error state
  useEffect(() => {
    if (error) {
      setLoadingState('error')
      setShowSkeleton(false)
    }
  }, [error])

  if (error) {
    return (
      <div className={cn('flex items-center justify-center p-4 text-red-600', className)}>
        Failed to load content
      </div>
    )
  }

  if (showSkeleton) {
    return (
      <div className={cn('relative', className)}>
        {skeleton || <Skeleton className="w-full h-32" />}
        {loadingState === 'stale' && (
          <div className="absolute top-2 right-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          </div>
        )}
      </div>
    )
  }

  return <div className={className}>{children}</div>
}

// Hook for progressive loading management
export const useProgressiveLoading = (initialLoading = false) => {
  const [isLoading, setIsLoading] = useState(initialLoading)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<any>(null)
  const [loadingProgress, setLoadingProgress] = useState(0)

  const startLoading = useCallback(() => {
    setIsLoading(true)
    setError(null)
    setLoadingProgress(0)
  }, [])

  const setProgress = useCallback((progress: number) => {
    setLoadingProgress(Math.max(0, Math.min(100, progress)))
  }, [])

  const finishLoading = useCallback((result?: any, error?: Error) => {
    setIsLoading(false)
    setLoadingProgress(100)

    if (error) {
      setError(error)
    } else {
      setData(result)
      setError(null)
    }
  }, [])

  return {
    isLoading,
    error,
    data,
    loadingProgress,
    startLoading,
    setProgress,
    finishLoading,
  }
}

// Connection status aware progressive loader
export const NetworkAwareLoader: React.FC<{
  children: React.ReactNode
  fallback?: React.ReactNode
}> = ({ children, fallback }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [connectionType, setConnectionType] = useState<string>('unknown')

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check connection type if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      setConnectionType(connection.effectiveType || 'unknown')

      const handleConnectionChange = () => {
        setConnectionType(connection.effectiveType || 'unknown')
      }

      connection.addEventListener('change', handleConnectionChange)

      return () => {
        connection.removeEventListener('change', handleConnectionChange)
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOnline) {
    return (
      fallback || (
        <div className="flex items-center justify-center p-8 text-center">
          <div className="space-y-4">
            <WifiOff className="h-12 w-12 mx-auto text-gray-400" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {"You're"} offline
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Check your internet connection and try again
              </p>
            </div>
          </div>
        </div>
      )
    )
  }

  // Show loading indicator for slow connections
  if (connectionType === 'slow-2g' || connectionType === '2g') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900 rounded text-sm">
          <Wifi className="h-4 w-4 text-yellow-600" />
          <span className="text-yellow-700 dark:text-yellow-300">
                        Slow connection detected. Content may take longer to load.
                    </span>
        </div>
        {children}
      </div>
    )
  }

  return <>{children}</>
}

// Intersection observer based lazy loader
export const LazyLoader: React.FC<{
  children: React.ReactNode
  skeleton?: React.ReactNode
  rootMargin?: string
  threshold?: number
  once?: boolean
}> = ({
        children,
        skeleton,
        rootMargin = '50px',
        threshold = 0.1,
        once = true
      }) => {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasIntersected, setHasIntersected] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)

        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true)
        }
      },
      {
        rootMargin,
        threshold,
      }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [rootMargin, threshold, hasIntersected])

  const shouldRender = once ? hasIntersected : isIntersecting

  return (
    <div ref={ref}>
      {shouldRender ? children : (skeleton || <Skeleton className="w-full h-32" />)}
    </div>
  )
}

// Adaptive loading based on device capabilities
export const AdaptiveLoader: React.FC<{
  children: React.ReactNode
  highQuality?: React.ReactNode
  mediumQuality?: React.ReactNode
  lowQuality?: React.ReactNode
}> = ({ children, highQuality, mediumQuality, lowQuality }) => {
  const [deviceCapability, setDeviceCapability] = useState<'high' | 'medium' | 'low'>('high')

  useEffect(() => {
    // Check device memory
    const memory = (navigator as any).deviceMemory || 4

    // Check connection speed
    const connection = (navigator as any).connection
    const effectiveType = connection?.effectiveType || '4g'

    // Check CPU cores
    const cores = navigator.hardwareConcurrency || 4

    // Determine capability
    if (memory >= 8 && cores >= 8 && effectiveType === '4g') {
      setDeviceCapability('high')
    } else if (memory >= 4 && cores >= 4 && effectiveType !== 'slow-2g') {
      setDeviceCapability('medium')
    } else {
      setDeviceCapability('low')
    }
  }, [])

  switch (deviceCapability) {
    case 'high':
      return <>{highQuality || children}</>
    case 'medium':
      return <>{mediumQuality || children}</>
    case 'low':
      return <>{lowQuality || <Skeleton className="w-full h-32" />}</>
    default:
      return <>{children}</>
  }
}

export {
  ProgressiveLoader as default,
  type LoadingState,
  type ProgressiveLoadingProps,
}
