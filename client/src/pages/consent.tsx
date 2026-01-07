import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  FileCheck,
  Plus,
  Upload,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  User,
  ChevronRight,
} from "lucide-react";
import type { Consent } from "@shared/schema";

const consentSteps = [
  { id: 1, title: "Identity", description: "Verify your identity" },
  { id: 2, title: "Upload", description: "Upload consent document" },
  { id: 3, title: "Verification", description: "Review and submit" },
];

export default function ConsentPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    document: null as File | null,
    agreed: false,
  });
  const { toast } = useToast();

  const { data: consents, isLoading } = useQuery<Consent[]>({
    queryKey: ["/api/consents"],
  });

  const submitMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch("/api/consents", {
        method: "POST",
        body: data,
      });
      if (!res.ok) throw new Error("Submission failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/consents"] });
      setIsDialogOpen(false);
      setCurrentStep(1);
      setFormData({ name: "", email: "", document: null, agreed: false });
      toast({
        title: "Consent submitted",
        description: "Your consent form is pending verification.",
      });
    },
    onError: () => {
      toast({
        title: "Submission failed",
        description: "Could not submit consent. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.document || !formData.name || !formData.agreed) return;

    const data = new FormData();
    data.append("name", formData.name);
    data.append("userId", "demo_user");
    data.append("document", formData.document);

    submitMutation.mutate(data);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim().length > 0 && formData.email.trim().length > 0;
      case 2:
        return formData.document !== null;
      case 3:
        return formData.agreed;
      default:
        return false;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (verified: boolean | null) => {
    if (verified) {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Verified
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <Clock className="mr-1 h-3 w-3" />
        Pending
      </Badge>
    );
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-consent-title">
            Consent Management
          </h1>
          <p className="text-muted-foreground">
            Manage voice cloning consent and verification
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-submit-consent">
              <Plus className="mr-2 h-4 w-4" />
              Submit Consent
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Voice Cloning Consent</DialogTitle>
              <DialogDescription>
                Complete the consent process to enable voice cloning features.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="mb-6 flex items-center justify-between">
                {consentSteps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                          currentStep >= step.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {step.id}
                      </div>
                      <span className="mt-1 text-xs text-muted-foreground">
                        {step.title}
                      </span>
                    </div>
                    {index < consentSteps.length - 1 && (
                      <ChevronRight className="mx-2 h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>

              {currentStep === 1 && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="name">Full Legal Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      data-testid="input-consent-name"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      data-testid="input-consent-email"
                    />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="flex flex-col gap-4">
                  <div
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-primary/50"
                    onClick={() => document.getElementById("consentDoc")?.click()}
                    role="button"
                    tabIndex={0}
                    data-testid="dropzone-consent"
                  >
                    <input
                      id="consentDoc"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) =>
                        setFormData({ ...formData, document: e.target.files?.[0] || null })
                      }
                    />
                    {formData.document ? (
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium">{formData.document.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          Upload signed consent form
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF, JPG, or PNG (max 10MB)
                        </p>
                      </>
                    )}
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="mt-0.5 h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">What we need</p>
                        <p className="text-xs text-muted-foreground">
                          A signed consent form authorizing the use of your voice for AI synthesis.
                          This protects both parties and ensures ethical use of voice cloning.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="flex flex-col gap-4">
                  <div className="rounded-lg bg-muted/50 p-4">
                    <h4 className="mb-2 text-sm font-medium">Review Your Submission</h4>
                    <div className="flex flex-col gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{formData.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{formData.document?.name || "No document"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border p-4">
                    <Checkbox
                      id="agree"
                      checked={formData.agreed}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, agreed: checked === true })
                      }
                      data-testid="checkbox-agree"
                    />
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="agree" className="text-sm font-medium cursor-pointer">
                        I agree to the terms and conditions
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        By checking this box, I confirm that I have the legal right to
                        authorize the use of the voice for AI synthesis purposes.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg bg-amber-500/10 p-4">
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                        Important Notice
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Voice cloning without consent is illegal. We verify all submissions
                        to ensure ethical use of this technology.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  data-testid="button-consent-back"
                >
                  Back
                </Button>
              )}
              {currentStep < 3 ? (
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!canProceed()}
                  data-testid="button-consent-next"
                >
                  Continue
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!canProceed() || submitMutation.isPending}
                  data-testid="button-consent-submit"
                >
                  {submitMutation.isPending ? "Submitting..." : "Submit Consent"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {consents?.filter((c) => c.verified).length ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Verified</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {consents?.filter((c) => !c.verified).length ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <FileCheck className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{consents?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="mt-1 h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : consents?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FileCheck className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No consent records</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Submit your first consent form to enable voice cloning features.
            </p>
            <Button className="mt-6" onClick={() => setIsDialogOpen(true)} data-testid="button-submit-first-consent">
              <Plus className="mr-2 h-4 w-4" />
              Submit Consent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Consent Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {consents?.map((consent) => (
                <div
                  key={consent.id}
                  className="flex items-center gap-4 rounded-lg p-3 hover-elevate"
                  data-testid={`consent-record-${consent.id}`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{consent.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Submitted {formatDate(consent.timestamp)}
                    </p>
                  </div>
                  {getStatusBadge(consent.verified)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
