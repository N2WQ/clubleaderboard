import { FileUploadZone } from "@/components/FileUploadZone";
import { Radio, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function UploadPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleFileSelect = (file: File, email: string) => {
    console.log("File submitted:", file.name, "Email:", email);
    setSubmitted(true);
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

        {submitted ? (
          <Alert className="mb-8 border-green-500/20 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle>Submission Received!</AlertTitle>
            <AlertDescription>
              Your log is being processed. You'll receive an email confirmation with your results shortly.
            </AlertDescription>
          </Alert>
        ) : null}

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
                All operators must be current YCCC members
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                Multi-op submissions must list at least 2 member operators
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
