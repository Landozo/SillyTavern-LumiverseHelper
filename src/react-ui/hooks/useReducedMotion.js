import { useState, useEffect } from 'react';

/**
 * Hook to detect if the user prefers reduced motion
 * This respects the 'prefers-reduced-motion' system setting
 *
 * Users on ARM devices (Raspberry Pi, Termux) can enable this setting
 * to disable animations and prevent potential performance issues.
 *
 * @returns {boolean} true if user prefers reduced motion
 */
export function useReducedMotion() {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
        // Check on initial render (SSR-safe)
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

        // Only update state if value changed after initial render (using functional update)
        setPrefersReducedMotion(prev => prev !== mediaQuery.matches ? mediaQuery.matches : prev);

        const handler = (e) => {
            // Only update if value actually changed
            setPrefersReducedMotion(prev => prev !== e.matches ? e.matches : prev);
        };
        mediaQuery.addEventListener('change', handler);

        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    return prefersReducedMotion;
}

/**
 * Helper to get animation props based on reduced motion preference
 * @param {boolean} reducedMotion - whether reduced motion is enabled
 * @param {object} normalProps - props to use when animations are enabled
 * @param {object} reducedProps - props to use when reduced motion is enabled (default: no animation)
 * @returns {object} animation props
 */
export function getAnimationProps(reducedMotion, normalProps, reducedProps = {}) {
    if (reducedMotion) {
        return {
            initial: false,
            animate: {},
            exit: {},
            transition: { duration: 0 },
            ...reducedProps,
        };
    }
    return normalProps;
}
