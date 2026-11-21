
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
    const offsetRef = useRef(0);
    const navigationLocked = useRef(false);

    const [offset, setOffset] = useState(0);
    const [dragging, setDragging] = useState(false);
    const [direction, setDirection] = useState<"left" | "right" | null>(null);
    const [transitioning, setTransitioning] = useState(false);
    const [transitionKey, setTransitionKey] = useState(0);

    const updateOffset = (value: number) => {
        offsetRef.current = value;
        setOffset(value);
    };

    const finishTransition = useCallback(() => {
        setTransitioning(false);
        setDirection(null);
        updateOffset(0);
    }, []);

    const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
        if (navigationLocked.current) return;

        const touch = e.touches[0];

        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;

        updateOffset(0);
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

        if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) return;

        updateOffset(deltaX * 0.85);
    };

    const handleTouchEnd = () => {
        if (touchStartX.current === null) return;

        const deltaX = offsetRef.current / 0.85;

        touchStartX.current = null;
        touchStartY.current = null;
        setDragging(false);

        if (Math.abs(deltaX) < minSwipeDistance) {
            updateOffset(0);
            return;
        }

        if (navigationLocked.current) {
            updateOffset(0);
            return;
        }

        navigationLocked.current = true;

        const swipeDirection = deltaX < 0 ? "left" : "right";

        setDirection(swipeDirection);
        setTransitioning(true);
        setTransitionKey((key) => key + 1);

        updateOffset(
            swipeDirection === "left"
                ? -window.innerWidth
                : window.innerWidth
        );

        setTimeout(() => {
            if (swipeDirection === "left") {
                onSwipeLeft();
            } else {
                onSwipeRight();
            }

            // Unlock after the slide animation, not after the fetch.
            navigationLocked.current = false;
        }, 250);
    };

    const handleTouchCancel = () => {
        touchStartX.current = null;
        touchStartY.current = null;
        setDragging(false);
        updateOffset(0);
    };

    return {
        offset,
        dragging,
        direction,
        transitioning,
        transitionKey,
        finishTransition,
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
        onTouchCancel: handleTouchCancel,
    };
}
