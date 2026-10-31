"use client";

import {
    createContext,
    useCallback,
    useContext,
    useState,
} from "react";

import NotificationBubble, {
    Notification,
    NotificationStatus,
} from "./NotificationBubble";

type NotificationContextType = {
    notify: (
        text: string,
        status?: NotificationStatus,
        duration?: number | null
    ) => number;
    dismiss: (id: number) => void;
    dismissAll: () => void;
};

const NotificationContext =
    createContext<NotificationContextType | null>(null);

export function NotificationProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const dismissAll = useCallback(() => {
        setNotifications([]);
    }, []);

    const notify = useCallback(
        (
            text: string,
            status: NotificationStatus = "info",
            duration: number | null = 3000
        ) => {
            const id = Date.now() + Math.random();

            const notification: Notification = {
                id,
                text,
                status,
                duration,
            };

            setNotifications((prev) => [...prev, notification].slice(-5));

            return id;
        },
        []
    );

    const dismiss = useCallback((id: number) => {
        setNotifications((prev) =>
            prev.filter((notification) => notification.id !== id)
        );
    }, []);

    const removeNotification = useCallback((id: number) => {
        setNotifications((prev) =>
            prev.filter(
                (notification) => notification.id !== id
            )
        );
    }, []);

    return (
        <NotificationContext.Provider value={{ notify, dismiss, dismissAll }}>
            {children}

            <div
                className="
                    fixed
                    bottom-4
                    left-1/2
                    -translate-x-1/2
                    z-50
                    flex
                    flex-col
                    items-center
                    gap-2
                    pointer-events-none
                    max-w-[calc(100vw-2rem)]
                "
            >
                {notifications.map((notification) => (
                    <NotificationBubble
                        key={notification.id}
                        notification={notification}
                        onRemove={removeNotification}
                        duration={notification.duration}
                    />
                ))}
            </div>
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);

    if (!context) {
        throw new Error(
            "useNotifications must be used inside NotificationProvider"
        );
    }

    return context;
}
