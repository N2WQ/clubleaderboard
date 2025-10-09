import { FileUploadZone } from "@/components/FileUploadZone";
import { Radio, ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function UploadPage() {
  const [result, setResult] = useState<any>(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async ({ file, email }: { file: File; email: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (email) formData.append("email", email);
      
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
    },
    onError: (error: Error) => {
      setResult({ status: "error", error: error.message });
    },
  });

  const handleFileSelect = (file: File, email: string) => {
    uploadMutation.mutate({ file, email });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">YCCC Contest Scoring</h1>
          </div>
          <Link href="/">
            <Button variant="ghost" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Scoreboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-3">Submit Cabrillo Log</h2>
          <p className="text-muted-foreground">
            Upload your contest log file for automated scoring and validation
          </p>
        </div>

        {result?.status === "accepted" && (
          <>
            <Alert className="mb-4 border-green-500/20 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle>Submission Accepted!</AlertTitle>
              <AlertDescription>
                <p className="mb-2">
                  Contest: {result.contest} {result.mode} • Callsign: {result.callsign}
                </p>
                <p className="mb-2">
                  Claimed Score: {result.claimedScore.toLocaleString()} • Normalized Points: {result.normalizedPoints.toLocaleString()}
                </p>
                <p className="text-sm">
                  Operators scoring points: {result.memberOperators.join(", ")}
                </p>
              </AlertDescription>
            </Alert>
            
            {result.warning && (
              <Alert className="mb-8 border-yellow-500/20 bg-yellow-500/10">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <AlertTitle>Operator Dues Notice</AlertTitle>
                <AlertDescription>
                  {result.warning}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {result?.status === "error" && (
          <Alert className="mb-8 border-red-500/20 bg-red-500/10">
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertTitle>Submission Rejected</AlertTitle>
            <AlertDescription>{result.error}</AlertDescription>
          </Alert>
        )}

        <div className="bg-card border border-card-border rounded-lg p-8 mb-8">
          <FileUploadZone onFileSelect={handleFileSelect} />
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Requirements</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                File format: .log or .cbr (Cabrillo format)
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                CLUB field must be "Yankee Clipper Contest Club"
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                At least one operator must be a current YCCC member with valid dues
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                Operators without current dues will be excluded from scoring
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">What Happens Next</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-primary">1</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Validation</p>
                  <p>System checks club affiliation, category, and member status</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-primary">2</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Scoring</p>
                  <p>Normalized points calculated based on contest/mode baseline</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-primary">3</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Publication</p>
                  <p>Results appear on scoreboard, email confirmation sent</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
