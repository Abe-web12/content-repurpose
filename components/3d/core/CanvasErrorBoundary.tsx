"use client";
import { Component, type ReactNode } from "react";

interface CanvasErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface CanvasErrorBoundaryState {
  hasError: boolean;
}

export class CanvasErrorBoundary extends Component<CanvasErrorBoundaryProps, CanvasErrorBoundaryState> {
  constructor(props: CanvasErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): CanvasErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[CanvasErrorBoundary] Canvas crashed:", error.message);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <div className="absolute inset-0 bg-[#0a0a1a]" />;
    }
    return this.props.children;
  }
}
