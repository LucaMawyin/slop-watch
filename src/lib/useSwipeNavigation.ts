
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseSwipeNavigationOptions {
    onSwipeLeft: () => void;
    onSwipeRight: () => void;
    minSwipeDistance?: number;
    minSwipeVelocity?: number;
}

export const TRANSITION_DURATION = 250;
const TRANSITION_FALLBACK = TRANSITION_DURATION + 100;

export default function useSwipeNavigation({
    onSwipeLeft,
    onSwipeRight,
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
    useEffect(() => {
        return () => {
            if (transitionTimeout.current) {
                clearTimeout(transitionTimeout.current);
            }
        };
    }, []);

    // Called when slide animation finishes
    // Change url but dont reset track yet
    const finishTransition = useCallback(() => {
        if (
            !isNavigating.current ||
            !pendingDirection.current ||
            navigationRequested.current
        ) return;

        if (transitionTimeout.current) {
            clearTimeout(transitionTimeout.current);
            transitionTimeout.current = null;
        }

        navigationRequested.current = true;

        if (pendingDirection.current === "left") {
            onSwipeLeft();
        } else {
            onSwipeRight();
        }
    }, [onSwipeLeft, onSwipeRight]);

    // Called after url has changed and new panels have rendered
    const completeTransition = useCallback(() => {
        if (!isNavigating.current) return;

        if (transitionTimeout.current) {
            clearTimeout(transitionTimeout.current);
            transitionTimeout.current = null;
        }

        setResetting(true);
        setOffset(0);
        setTransitioning(false);

        isNavigating.current = false;
        pendingDirection.current = null;
        navigationRequested.current = false;

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setResetting(false);
            });
        });
    }, []);

    const startNavigation = useCallback((swipeDirection: "left" | "right", distance: number) => {
        if (isNavigating.current) return;

        isNavigating.current = true;
        pendingDirection.current = swipeDirection;
        navigationRequested.current = false;

        setDirection(swipeDirection);
        setTransitioning(true);
        setTransitionKey((key) => key + 1);
        setDragging(false);

        setOffset(
            swipeDirection === "left" ? -distance : distance
        );

        // Fallback in case transitionend doesnt run
        transitionTimeout.current = setTimeout(() => {
            finishTransition();
        }, TRANSITION_FALLBACK);
    }, [finishTransition]);

    const navigate = useCallback((
        swipeDirection: "left" | "right",
        distance: number
    ) => {
        startNavigation(swipeDirection, distance);
    }, [startNavigation]);

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
        ) return;

        const touch = e.touches[0];
        const now = e.timeStamp;

        const deltaX = touch.clientX - touchStartX.current;
        const deltaY = touch.clientY - touchStartY.current;

        if (gesture.current === "pending") {
            if (Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) return;

            if (Math.abs(deltaY) > Math.abs(deltaX)) {
                gesture.current = "vertical";
                return;
            }

            gesture.current = "horizontal";
            setDirection(deltaX < 0 ? "left" : "right");
            setDragging(true);
        }

        if (gesture.current !== "horizontal") return;

        const elapsed = now - lastTime.current;

        if (elapsed > 0) {
            velocity.current = (touch.clientX - lastX.current) / elapsed;
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
            velocity.current = (touch.clientX - lastX.current) / elapsed;
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

        touchStartX.current = null;
        touchStartY.current = null;
        gesture.current = "pending";

        if (!isValidSwipe) {
            const track = e.currentTarget.querySelector<HTMLElement>(
                "[data-swipe-track]"
            );

            track?.style.removeProperty("--swipe-offset");
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
        const track = e.currentTarget.querySelector<HTMLElement>(
            "[data-swipe-track]"
        );

        track?.style.removeProperty("--swipe-offset");

        touchStartX.current = null;
        touchStartY.current = null;
        gesture.current = "pending";

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
