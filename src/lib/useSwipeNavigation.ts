
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseSwipeNavigationOptions {
    onSwipeLeft: () => void;
    onSwipeRight: () => void;
    onSwipeProgress?: (progress: number, animate?: boolean) => void;
    minSwipeDistance?: number;
    minSwipeVelocity?: number;
}

export const TRANSITION_DURATION = 250;
const TRANSITION_FALLBACK = TRANSITION_DURATION + 100;

export default function useSwipeNavigation({
    onSwipeLeft,
    onSwipeRight,
    onSwipeProgress,
    minSwipeDistance = 80,
    minSwipeVelocity = 0.5,
}: UseSwipeNavigationOptions) {
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);

    const lastX = useRef(0);
    const lastTime = useRef(0);
    const velocity = useRef(0);

    const gesture = useRef<"pending" | "horizontal" | "vertical">("pending");
    const isNavigating = useRef(false);
    const pendingDirection = useRef<"left" | "right" | null>(null);
    const navigationRequested = useRef(false);

    const [offset, setOffset] = useState(0);
    const [dragging, setDragging] = useState(false);
    const [direction, setDirection] = useState<"left" | "right">("left");
    const [transitioning, setTransitioning] = useState(false);
    const [transitionKey, setTransitionKey] = useState(0);
    const [resetting, setResetting] = useState(false);

    const transitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const resetAnimationFrame = useRef<number | null>(null);

    const clearTransitionTimeout = useCallback(() => {
        if (transitionTimeout.current !== null) {
            clearTimeout(transitionTimeout.current);
            transitionTimeout.current = null;
        }
    }, []);

    const clearResetAnimationFrame = useCallback(() => {
        if (resetAnimationFrame.current !== null) {
            cancelAnimationFrame(resetAnimationFrame.current);
            resetAnimationFrame.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            clearTransitionTimeout();
            clearResetAnimationFrame();
        };
    }, [clearTransitionTimeout, clearResetAnimationFrame]);

    const resetGesture = useCallback(() => {
        touchStartX.current = null;
        touchStartY.current = null;
        gesture.current = "pending";
        velocity.current = 0;
    }, []);

    const resetTrackOffset = (element: HTMLElement) => {
        const track = element.querySelector<HTMLElement>(
            "[data-swipe-track]"
        );

        track?.style.removeProperty("--swipe-offset");
    };

    // Called when the slide animation finishes.
    const finishTransition = useCallback(() => {
        if (
            !isNavigating.current ||
            !pendingDirection.current ||
            navigationRequested.current
        ) {
            return;
        }

        clearTransitionTimeout();

        navigationRequested.current = true;

        if (pendingDirection.current === "left") {
            onSwipeLeft();
        } else {
            onSwipeRight();
        }
    }, [clearTransitionTimeout, onSwipeLeft, onSwipeRight]);

    // Called after the URL changes and the new panels have rendered.
    const completeTransition = useCallback(() => {
        if (!isNavigating.current) return;

        clearTransitionTimeout();
        clearResetAnimationFrame();

        // Reset the height against the new current panel.
        onSwipeProgress?.(0);

        setResetting(true);
        setOffset(0);
        setTransitioning(false);
        setDragging(false);

        isNavigating.current = false;
        pendingDirection.current = null;
        navigationRequested.current = false;

        resetGesture();

        resetAnimationFrame.current = requestAnimationFrame(() => {
            resetAnimationFrame.current = requestAnimationFrame(() => {
                setResetting(false);
                resetAnimationFrame.current = null;
            });
        });
    }, [
        clearTransitionTimeout,
        clearResetAnimationFrame,
        onSwipeProgress,
        resetGesture,
    ]);

    const startNavigation = useCallback(
        (swipeDirection: "left" | "right", distance: number) => {
            if (isNavigating.current) return;

            clearTransitionTimeout();
            clearResetAnimationFrame();

            isNavigating.current = true;
            pendingDirection.current = swipeDirection;
            navigationRequested.current = false;

            setDirection(swipeDirection);
            setTransitioning(true);
            setTransitionKey((key) => key + 1);
            setDragging(false);
            setResetting(false);

            setOffset(
                swipeDirection === "left" ? -distance : distance
            );

            // Animate container height toward the destination panel.
            onSwipeProgress?.(
                swipeDirection === "left" ? 1 : -1,
                true
            );

            // Fallback in case transitionend doesn't fire.
            transitionTimeout.current = setTimeout(() => {
                finishTransition();
            }, TRANSITION_FALLBACK);
        },
        [
            clearTransitionTimeout,
            clearResetAnimationFrame,
            finishTransition,
            onSwipeProgress,
        ]
    );

    const navigate = useCallback(
        (swipeDirection: "left" | "right", distance: number) => {
            startNavigation(swipeDirection, distance);
        },
        [startNavigation]
    );

    const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
        if (isNavigating.current || transitioning) return;

        const touch = e.touches[0];

        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;

        lastX.current = touch.clientX;
        lastTime.current = e.timeStamp;
        velocity.current = 0;

        gesture.current = "pending";
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLElement>) => {
        if (
            touchStartX.current === null ||
            touchStartY.current === null
        ) {
            return;
        }

        const touch = e.touches[0];
        const now = e.timeStamp;

        const deltaX = touch.clientX - touchStartX.current;
        const deltaY = touch.clientY - touchStartY.current;

        if (gesture.current === "pending") {
            if (Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) {
                return;
            }

            if (Math.abs(deltaY) > Math.abs(deltaX)) {
                gesture.current = "vertical";
                return;
            }

            gesture.current = "horizontal";
            setDirection(deltaX < 0 ? "left" : "right");
            setDragging(true);
        }

        if (gesture.current !== "horizontal") return;

        // Update container height continuously while dragging.
        const width = e.currentTarget.clientWidth;

        if (width > 0) {
            const progress = Math.max(
                -1,
                Math.min(1, -deltaX / width)
            );

            onSwipeProgress?.(progress, false);
        }

        const elapsed = now - lastTime.current;

        if (elapsed > 0) {
            velocity.current =
                (touch.clientX - lastX.current) / elapsed;
        }

        lastX.current = touch.clientX;
        lastTime.current = now;

        const track = e.currentTarget.querySelector<HTMLElement>(
            "[data-swipe-track]"
        );

        track?.style.setProperty(
            "--swipe-offset",
            `${deltaX * 0.85}px`
        );
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
        if (touchStartX.current === null) return;

        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStartX.current;
        const deltaY = touch.clientY - (touchStartY.current ?? 0);

        const elapsed = e.timeStamp - lastTime.current;

        if (elapsed > 0) {
            velocity.current =
                (touch.clientX - lastX.current) / elapsed;
        }

        const swipeVelocity = Math.abs(velocity.current);
        const isHorizontal = gesture.current === "horizontal";

        const isValidSwipe =
            !isNavigating.current &&
            isHorizontal &&
            Math.abs(deltaX) >= 25 &&
            (
                Math.abs(deltaX) >= minSwipeDistance ||
                swipeVelocity >= minSwipeVelocity
            ) &&
            Math.abs(deltaY) <= Math.abs(deltaX) * 1.5;

        resetGesture();

        if (!isValidSwipe) {
            resetTrackOffset(e.currentTarget);

            // Animate height back to the current panel.
            onSwipeProgress?.(0, true);

            setDragging(false);
            setOffset(0);
            return;
        }

        const distance = e.currentTarget.clientWidth + 16;
        const swipeDirection = deltaX < 0 ? "left" : "right";

        const track = e.currentTarget.querySelector<HTMLElement>(
            "[data-swipe-track]"
        );

        startNavigation(swipeDirection, distance);

        requestAnimationFrame(() => {
            track?.style.removeProperty("--swipe-offset");
        });
    };

    const handleTouchCancel = (e: React.TouchEvent<HTMLElement>) => {
        resetTrackOffset(e.currentTarget);
        resetGesture();

        // Animate height back to the current panel.
        onSwipeProgress?.(0, true);

        setDragging(false);
        setOffset(0);
    };

    return {
        offset,
        dragging,
        direction,
        transitioning,
        transitionKey,
        resetting,
        navigate,
        finishTransition,
        completeTransition,
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
        onTouchCancel: handleTouchCancel,
    };
}
