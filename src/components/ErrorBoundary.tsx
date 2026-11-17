
"use client";

import React from "react";

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: string | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
    state: State = {
        hasError: false,
        error: null,
    };

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error: error.message,
        };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error("UpcomingGames runtime error:", error);
        console.error("Component stack:", info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <pre className="whitespace-pre-wrap text-red-400">
                    {this.state.error}
                </pre>
            );
        }

        return this.props.children;
    }
}
