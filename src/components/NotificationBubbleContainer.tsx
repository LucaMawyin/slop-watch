"use client";

import {
    useCallback,
    useState,
} from "react";

import NotificationBubble, {
    Notification,
    NotificationStatus,
} from "./NotificationBubble";

type NotificationContainerProps = {
    position?: "top" | "bottom";
};

export default function NotificationContainer({
    position = "bottom",
}: NotificationContainerProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const notify = useCallback(
        (
            text: string,
            status: NotificationStatus = "info"
        ) => {
            const notification: Notification = {
                id: Date.now() + Math.random(),
                text,
                status,
            };

            setNotifications((prev) => {
                const next = [...prev, notification];

                // Keep only the newest 5
                return next.slice(-5);
            });
        },
        []
    );

    const removeNotification = useCallback((id: number) => {
        setNotifications((prev) =>
            prev.filter((notification) => notification.id !== id)
        );
    }, []);

    return (
        <>
            <div
                className={`
                    fixed
                    left-1/2
                    -translate-x-1/2
                    z-50
                    flex
                    w-fit
                    max-w-[calc(100vw-2rem)]
                    flex-col
                    gap-2
                    pointer-events-none
                    ${
                        position === "top"
                            ? "top-4"
                            : "bottom-4"
                    }
                `}
            >
                {notifications.map((notification) => (
                    <NotificationBubble
                        key={notification.id}
                        notification={notification}
                        onRemove={removeNotification}
                    />
                ))}
            </div>
        </>
    );
}