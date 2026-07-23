"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2, File } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface UploadedDocument {
  id: string;
  fileName: string;
  title: string;
  status: "Uploading" | "Processing" | "Ready" | "Failed";
  progress: number;
  error?: string;
}

interface UploadPanelProps {
  knowledgeBaseId: string;
  onUpload: (files: File[], title: string, source: string) => Promise<void>;
}

const ALLOWED_TYPES = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "text/plain": ".txt",
  "text/markdown": ".md",
  "text/csv": ".csv",
};

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md", ".csv"];

export function UploadPanel({ knowledgeBaseId, onUpload }: UploadPanelProps) {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    const valid = arr.filter((f) => {
      const ext = "." + f.name.split(".").pop()?.toLowerCase();
      return ALLOWED_EXTENSIONS.includes(ext);
    });
    return valid;
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const valid = validateFiles(e.dataTransfer.files);
      setFiles((prev) => [...prev, ...valid]);
    },
    [validateFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const valid = validateFiles(e.target.files);
      setFiles((prev) => [...prev, ...valid]);
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpload = async () => {
    if (files.length === 0 || !title.trim()) return;
    setUploading(true);

    const newDocs: UploadedDocument[] = files.map((f) => ({
      id: crypto.randomUUID(),
      fileName: f.name,
      title: title.trim(),
      status: "Uploading" as const,
      progress: 0,
    }));
    setDocuments((prev) => [...prev, ...newDocs]);

    try {
      await onUpload(files, title.trim(), source.trim());

      setDocuments((prev) =>
        prev.map((d) =>
          newDocs.some((nd) => nd.id === d.id)
            ? { ...d, status: "Ready" as const, progress: 100 }
            : d
        )
      );
      setFiles([]);
      setTitle("");
      setSource("");
    } catch {
      setDocuments((prev) =>
        prev.map((d) =>
          newDocs.some((nd) => nd.id === d.id)
            ? { ...d, status: "Failed" as const, error: "Upload failed" }
            : d
        )
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors",
          dragOver
            ? "border-brand-500 bg-brand-50/50"
            : "border-surface-3 bg-white hover:border-surface-4"
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 mb-3">
          <Upload className="h-5 w-5 text-text-muted" />
        </div>
        <p className="text-sm font-medium text-text-primary">
          Drag & drop files here
        </p>
        <p className="mt-1 text-xs text-text-muted">
          PDF, DOCX, TXT, MD, CSV &mdash; up to 50MB each
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED_EXTENSIONS.join(",")}
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => inputRef.current?.click()}
        >
          Browse Files
        </Button>
      </div>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="space-y-2">
              {files.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center gap-3 rounded-lg border border-surface-3 bg-white px-3 py-2"
                >
                  <File className="h-4 w-4 text-text-muted shrink-0" />
                  <span className="flex-1 text-sm truncate">{file.name}</span>
                  <span className="text-xs text-text-muted shrink-0">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                  {!uploading && (
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-text-muted hover:text-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="doc-title">Title</Label>
                <Input
                  id="doc-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Document title"
                  disabled={uploading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="doc-source">Source</Label>
                <Input
                  id="doc-source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="Optional source URL"
                  disabled={uploading}
                />
              </div>
            </div>

            <Button onClick={handleUpload} disabled={!title.trim() || uploading} loading={uploading}>
              {uploading ? "Uploading..." : `Upload ${files.length} file${files.length > 1 ? "s" : ""}`}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {documents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-text-primary">Uploaded Documents</h4>
          <div className="space-y-2">
            {documents.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="flex items-center gap-3 p-3">
                  {doc.status === "Uploading" && (
                    <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
                  )}
                  {doc.status === "Processing" && (
                    <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                  )}
                  {doc.status === "Ready" && (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                  {doc.status === "Failed" && (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-text-muted truncate">{doc.fileName}</p>
                  </div>
                  <Badge
                    variant={
                      doc.status === "Ready"
                        ? "success"
                        : doc.status === "Failed"
                        ? "destructive"
                        : "outline"
                    }
                  >
                    {doc.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
