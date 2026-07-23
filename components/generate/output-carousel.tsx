"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatCarouselSlides } from "@/lib/utils/format-output";
import { cn } from "@/lib/utils";

interface OutputCarouselProps {
  content: string;
  streaming?: boolean;
}

export function OutputCarousel({ content, streaming }: OutputCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (streaming) {
    return (
      <div className="rounded-xl border border-surface-3 bg-white p-6">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
          {content}
          <span className="inline-block h-4 w-0.5 animate-pulse bg-brand-600" />
        </p>
      </div>
    );
  }

  const slides = formatCarouselSlides(content);

  if (slides.length === 0) {
    return (
      <div className="rounded-xl border border-surface-3 bg-white p-6">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">{content}</p>
      </div>
    );
  }

  const slide = slides[currentSlide];

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/5] max-w-sm rounded-2xl border border-surface-3 bg-gradient-to-br from-brand-600 to-purple-700 p-8 text-white">
        <div className="flex h-full flex-col justify-center">
          <h3 className="text-2xl font-bold leading-tight">{slide?.headline}</h3>
          {slide?.body && (
            <p className="mt-4 text-sm leading-relaxed opacity-90">{slide.body}</p>
          )}
        </div>
        <div className="absolute bottom-4 right-4 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium">
          {currentSlide + 1}/{slides.length}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
          disabled={currentSlide === 0}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-3 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex gap-1">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentSlide(i)}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                i === currentSlide ? "bg-brand-600" : "bg-surface-3"
              )}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
          disabled={currentSlide === slides.length - 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-3 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
