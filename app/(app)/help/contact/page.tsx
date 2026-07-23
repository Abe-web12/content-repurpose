"use client";

import { useState } from "react";
import { Send, Loader2, MessageCircle, Bug, Lightbulb } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { showSuccess, showError } from "@/components/ui/toast";

const CATEGORIES = [
  { id: "general", label: "General Inquiry", icon: MessageCircle },
  { id: "bug", label: "Bug Report", icon: Bug },
  { id: "feature", label: "Feature Request", icon: Lightbulb },
];

export default function ContactPage() {
  const [category, setCategory] = useState("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return;

    setSending(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message, category }),
      });

      if (!res.ok) {
        const json = await res.json();
        showError(json.error || "Failed to submit");
        return;
      }

      showSuccess("Message sent! We'll get back to you soon.");
      setSubject("");
      setMessage("");
    } catch {
      showError("Something went wrong");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-10">
      <PageHeader
        title="Contact Support"
        description="Have a question or feedback? We'd love to hear from you."
      />

      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Send us a message</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-text-muted">Category</label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition-colors ${
                        category === cat.id
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-surface-3 text-text-muted hover:border-surface-4"
                      }`}
                    >
                      <cat.icon className="h-4 w-4" />
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-text-muted">Subject</label>
                <Input
                  placeholder="Brief summary of your issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-text-muted">Message</label>
                <Textarea
                  placeholder="Describe your issue or request in detail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  required
                  className="mt-1"
                />
              </div>

              <Button type="submit" disabled={sending || !subject || !message} className="w-full gap-2">
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {sending ? "Sending..." : "Send message"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
