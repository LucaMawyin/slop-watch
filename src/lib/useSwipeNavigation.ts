"use client";

import { useRef } from "react";

interface UseSwipeNavigationOptions {
    onSwipeLeft: () => void;
    onSwipeRight: () => void;
    minSwipeDistance?: number;
}

export default function useSwipeNavigation({
    onSwipeLeft,
    onSwipeRight,
    minSwipeDistance = 60,
}: UseSwipeNavigationOptions) {
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);

    const handleTouchStart = (
        e: React.TouchEvent<HTMLElement>
    ) => {
        const touch = e.touches[0];

        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
    };

    const handleTouchEnd = (
        e: React.TouchEvent<HTMLElement>
    ) => {
        if (
            touchStartX.current === null ||
            touchStartY.current === null
        ) {
            return;
        }

        const touch = e.changedTouches[0];

        const deltaX = touch.clientX - touchStartX.current;
        const deltaY = touch.clientY - touchStartY.current;

        // Reset touch state
        touchStartX.current = null;
        touchStartY.current = null;

        // Ignore short swipes and primarily vertical gestures
        if (
            Math.abs(deltaX) < minSwipeDistance ||
            Math.abs(deltaX) < Math.abs(deltaY) * 1.5
        ) {
            return;
        }

        if (deltaX < 0) {
            onSwipeLeft();
        } else {
            onSwipeRight();
        }
    };

    return {
        onTouchStart: handleTouchStart,
        onTouchEnd: handleTouchEnd,
    };
}
