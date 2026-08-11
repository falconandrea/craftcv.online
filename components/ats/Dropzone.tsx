"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import { UploadCloud, FileText, Briefcase, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MAX_PDF_BYTES, MAX_JD_CHARS } from "@/lib/ats-constants";

interface DropzoneProps {
  onAnalyze: (file: File, jobDescription: string) => void;
  isLoading?: boolean;
}

export function Dropzone({ onAnalyze, isLoading }: DropzoneProps) {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const rejectFile = (message: string) => {
    toast.error(message, { className: "border-[#ff00aa] bg-black text-[#ff00aa]" });
  };

  /** Same rules the API enforces, checked here so the upload never starts. */
  const acceptFile = (candidate: File) => {
    const isPdf =
      candidate.type === "application/pdf" || candidate.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      rejectFile("Please upload a PDF file.");
      return;
    }
    if (candidate.size > MAX_PDF_BYTES) {
      rejectFile("File is too large. Maximum size is 5 MB.");
      return;
    }
    setFile(candidate);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      acceptFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      acceptFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleSubmit = () => {
    if (file) {
      onAnalyze(file, jobDescription);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* File Upload Zone */}
      <div
        className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl transition-colors duration-200 ${
          dragActive
            ? "border-[#b8ff00] bg-[#b8ff00]/10"
            : file
            ? "border-green-500/50 bg-green-500/5"
            : "border-white/20 hover:border-[#ff00aa] hover:bg-[#ff00aa]/5"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="application/pdf"
          onChange={handleChange}
        />
        
        {file ? (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="p-4 rounded-full bg-green-500/20 text-green-400">
              <FileText className="w-10 h-10" />
            </div>
            <div>
              <p className="text-lg font-mono text-green-400">{file.name}</p>
              <p className="text-sm text-white/50">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRemoveFile}
              className="border-red-500/50 text-red-400 hover:text-red-400 hover:bg-red-500/10 bg-transparent"
              disabled={isLoading}
            >
              <X className="w-4 h-4 mr-2" />
              Remove File
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className={`p-4 rounded-full transition-colors ${dragActive ? 'bg-[#b8ff00]/20 text-[#b8ff00]' : 'bg-white/5 text-white/40'}`}>
              <UploadCloud className="w-10 h-10" />
            </div>
            <div>
              <p className="text-lg font-medium text-white">Drag & drop your CV here</p>
              <p className="text-sm text-white/50 mt-1">Supports exactly 1 PDF file (max 5MB)</p>
            </div>
            <Button 
              onClick={() => inputRef.current?.click()} 
              variant="outline" 
              className="border-[#ff00aa]/50 text-[#ff00aa] hover:text-[#ff00aa] hover:bg-[#ff00aa]/10 bg-transparent"
              disabled={isLoading}
            >
              <Plus className="w-4 h-4 mr-2" />
              Browse Files
            </Button>
          </div>
        )}
      </div>

      {/* Target Job Description */}
      <div className="space-y-3">
        <label className="flex items-center text-sm font-mono tracking-widest text-[#b8ff00] uppercase">
          <Briefcase className="w-4 h-4 mr-2" />
          Target Job Description (Optional)
        </label>
        <Textarea
          placeholder="Paste the job description here to get a customized keyword match score..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value.slice(0, MAX_JD_CHARS))}
          maxLength={MAX_JD_CHARS}
          className="min-h-[120px] bg-black/40 border-white/10 text-white/80 placeholder:text-white/30 focus-visible:ring-[#b8ff00] resize-none"
          disabled={isLoading}
        />
        {jobDescription.length > MAX_JD_CHARS * 0.9 && (
          <p className="text-xs font-mono text-white/40 text-right">
            {jobDescription.length} / {MAX_JD_CHARS} characters
          </p>
        )}
      </div>

      <div className="pt-4">
        <Button 
          onClick={handleSubmit} 
          disabled={!file || isLoading}
          className="w-full h-12 text-lg font-bold tracking-widest uppercase bg-[#ff00aa] text-white hover:bg-[#ff00aa]/90 transition-all rounded-sm glow-effect"
        >
          {isLoading ? "Running ATS Diagnostics..." : "Analyze CV"}
        </Button>
      </div>
    </div>
  );
}
