import { useRef, useEffect } from "react"

export default function useRenderCount(componentName: string) {
    const renderCount = useRef(0)
    const startTime = useRef(Date.now())
    
    renderCount.current += 1
    
    useEffect(() => {
        const renderTime = Date.now() - startTime.current
        if (renderTime > 100) {
            console.warn(`${componentName} rendered ${renderCount.current} times in ${renderTime}ms`)
        }
    })
    
    return renderCount.current
}