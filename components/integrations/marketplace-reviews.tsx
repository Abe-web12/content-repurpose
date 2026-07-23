"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  userId: string;
  createdAt: string;
}

interface MarketplaceReviewsProps {
  listingId: string;
  reviews: Review[];
  canReview?: boolean;
  onReviewAdded?: () => void;
}

export function MarketplaceReviews({ listingId, reviews, canReview, onReviewAdded }: MarketplaceReviewsProps) {
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/marketplace/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, rating, content, organizationId: "default" }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to submit review");

      setRating(0);
      setContent("");
      if (onReviewAdded) onReviewAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">Reviews</h3>

      {canReview && (
        <Card className="border-white/5 bg-[#1E293B] p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="transition-colors hover:text-yellow-400"
                >
                  <Star
                    className={cn(
                      "h-5 w-5",
                      star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-500"
                    )}
                  />
                </button>
              ))}
            </div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your review..."
              className="border-white/10 bg-white/5 text-white placeholder:text-gray-500"
              rows={3}
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Button type="submit" disabled={submitting || rating === 0} size="sm" className="bg-indigo-600 hover:bg-indigo-500">
              {submitting ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
              Submit Review
            </Button>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-500">No reviews yet.</p>
        ) : (
          reviews.map((review) => (
            <Card key={review.id} className="border-white/5 bg-[#1E293B] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10">
                  <User className="h-4 w-4 text-indigo-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "h-3.5 w-3.5",
                            star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {review.title && (
                    <p className="mt-1 text-sm font-medium text-white">{review.title}</p>
                  )}
                  {review.content && (
                    <p className="mt-0.5 text-sm text-gray-400">{review.content}</p>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
