import * as React from 'react';

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export function useIsMobile() {
    const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

    React.useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
        const onChange = () => {
            setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        };
        mql.addEventListener('change', onChange);
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        return () => mql.removeEventListener('change', onChange);
    }, []);

    return !!isMobile;
}

export function useIsTablet() {
    const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined);

    React.useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${TABLET_BREAKPOINT - 1}px)`);
        const onChange = () => {
            setIsTablet(window.innerWidth < TABLET_BREAKPOINT);
        };
        mql.addEventListener('change', onChange);
        setIsTablet(window.innerWidth < TABLET_BREAKPOINT);
        return () => mql.removeEventListener('change', onChange);
    }, []);

    return !!isTablet;
}

export function useMediaQuery(breakpoint: number) {
    const [matches, setMatches] = React.useState<boolean | undefined>(undefined);

    React.useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
        const onChange = () => {
            setMatches(window.innerWidth < breakpoint);
        };
        mql.addEventListener('change', onChange);
        setMatches(window.innerWidth < breakpoint);
        return () => mql.removeEventListener('change', onChange);
    }, [breakpoint]);

    return !!matches;
}
