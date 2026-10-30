"use client";

import { useEffect, useState } from "react";

export type NotificationStatus =
    | "success"
    | "error"
    | "info"
    | "warning";

export type Notification = {
    id: number;
    text: string;
    status: NotificationStatus;
    duration?: number | null;
};

type NotificationBubbleProps = {
    notification: Notification;
    onRemove: (id: number) => void;
    duration?: number | null;
};

export default function NotificationBubble({
    notification,
    onRemove,
    duration = 3000,
}: NotificationBubbleProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const enterTimer = requestAnimationFrame(() => {
            setVisible(true);
        });

        if (duration === null) {
            return () => cancelAnimationFrame(enterTimer);
        }

        const exitTimer = setTimeout(() => {
            setVisible(false);
        }, Math.max(0, duration - 300));

        const removeTimer = setTimeout(() => {
            onRemove(notification.id);
        }, duration);

        return () => {
            cancelAnimationFrame(enterTimer);
            clearTimeout(exitTimer);
            clearTimeout(removeTimer);
        };
    }, [duration, notification.id, onRemove]);

    const statusClasses: Record<NotificationStatus, string> = {
        success: "bg-green-500 text-white",
        error: "bg-red-500 text-white",
        info: "bg-blue-500 text-white",
        warning: "bg-yellow-400 text-black",
    };

    return (
        <div
            className={`
                rounded-full
                px-5
                py-2.5
                shadow-lg
                text-sm
                font-medium
                whitespace-nowrap
                transition-all
                duration-300
                ease-out
                ${statusClasses[notification.status]}
                ${
                    visible
                        ? "translate-y-0 opacity-100 scale-100"
                        : "translate-y-2 opacity-0 scale-95"
                }
            `}
        >
            {notification.text}
        </div>
    );
}