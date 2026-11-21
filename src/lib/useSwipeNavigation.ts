
"use client";

import { useCallback, useRef, useState } from "react";

interface UseSwipeNavigationOptions {
    onSwipeLeft: () => void;
    onSwipeRight: () => void;
    minSwipeDistance?: number;
}

export default function useSwipeNavigation({
    onSwipeLeft,
    onSwipeRight,
    minSwipeDistance = 80,
}: UseSwipeNavigationOptions) {
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);

    const [dragging, setDragging] = useState(false);
    const [direction, setDirection] = useState<"left" | "right">("left");
    const [transitioning, setTransitioning] = useState(false);
    const [transitionKey, setTransitionKey] = useState(0);

    const navigate = useCallback((swipeDirection: "left" | "right") => {
        // Restart the animation, even if one is already running.
        setDirection(swipeDirection);
        setTransitioning(true);
        setTransitionKey((key) => key + 1);

        if (swipeDirection === "left") {
            onSwipeLeft();
        } else {
            onSwipeRight();
        }
    }, [onSwipeLeft, onSwipeRight]);

    const finishTransition = useCallback(() => {
        setTransitioning(false);
    }, []);

    const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
        const touch = e.touches[0];

        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
        setDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLElement>) => {
        if (
            touchStartX.current === null ||
            touchStartY.current === null
        ) return;

        const touch = e.touches[0];

        const deltaX = touch.clientX - touchStartX.current;
        const deltaY = touch.clientY - touchStartY.current;

        // Ignore primarily vertical gestures.
        if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) return;
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
        if (touchStartX.current === null) return;

        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        const deltaY = e.changedTouches[0].clientY - (touchStartY.current ?? 0);

        touchStartX.current = null;
        touchStartY.current = null;
        setDragging(false);

        if (
            Math.abs(deltaX) < minSwipeDistance ||
            Math.abs(deltaY) > Math.abs(deltaX) * 1.5
        ) return;

        navigate(deltaX < 0 ? "left" : "right");
    };

    const handleTouchCancel = () => {
        touchStartX.current = null;
        touchStartY.current = null;
        setDragging(false);
    };

    return {
        dragging,
        direction,
        transitioning,
        transitionKey,
        navigate,
        finishTransition,
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
        onTouchCancel: handleTouchCancel,
    };
}
