import { useState, useCallback } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FileUploadZoneProps {
  onFileSelect?: (file: File, email: string) => void;
}

export function FileUploadZone({ onFileSelect }: FileUploadZoneProps) {
  const [file, setFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.log') || droppedFile.name.endsWith('.cbr'))) {
      setFile(droppedFile);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = () => {
    if (file && onFileSelect) {
      onFileSelect(file, email);
      console.log('Submitting file:', file.name, 'Email:', email);
    }
  };

  return (
    <div className="space-y-6">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-border'}
        `}
      >
        {file ? (
          <div className="flex items-center justify-center gap-4">
            <FileText className="h-8 w-8 text-primary" />
            <div className="text-left">
              <p className="font-medium" data-testid="text-filename">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFile(null)}
              data-testid="button-remove-file"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div>
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Drop your Cabrillo log here</p>
            <p className="text-sm text-muted-foreground mb-4">
              Supports .log and .cbr files
            </p>
            <Input
              type="file"
              accept=".log,.cbr"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              data-testid="input-file"
            />
            <Button asChild variant="outline">
              <label htmlFor="file-upload" className="cursor-pointer">
                Choose File
              </label>
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email (optional)</Label>
        <Input
          id="email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          data-testid="input-email"
        />
        <p className="text-xs text-muted-foreground">
          Receive confirmation and results notification
        </p>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!file}
        className="w-full"
        data-testid="button-submit-log"
      >
        Submit Log
      </Button>
    </div>
  );
}
