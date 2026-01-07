import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/components/theme-provider";
import {
  Settings,
  Moon,
  Sun,
  Monitor,
  Globe,
  Bell,
  Shield,
  HardDrive,
  Trash2,
} from "lucide-react";
import { languages } from "@shared/schema";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-settings-title">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account and application preferences
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize the look and feel of the application
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label>Theme</Label>
                <span className="text-sm text-muted-foreground">
                  Choose your preferred color scheme
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className={`toggle-elevate ${theme === "light" ? "toggle-elevated" : ""}`}
                  onClick={() => setTheme("light")}
                  data-testid="button-theme-light"
                >
                  <Sun className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className={`toggle-elevate ${theme === "dark" ? "toggle-elevated" : ""}`}
                  onClick={() => setTheme("dark")}
                  data-testid="button-theme-dark"
                >
                  <Moon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className={`toggle-elevate ${theme === "system" ? "toggle-elevated" : ""}`}
                  onClick={() => setTheme("system")}
                  data-testid="button-theme-system"
                >
                  <Monitor className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label>Compact Mode</Label>
                <span className="text-sm text-muted-foreground">
                  Use smaller spacing and elements
                </span>
              </div>
              <Switch data-testid="switch-compact" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Language & Region
            </CardTitle>
            <CardDescription>
              Set your preferred language and regional settings
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label>Interface Language</Label>
                <span className="text-sm text-muted-foreground">
                  Language for the application UI
                </span>
              </div>
              <Select defaultValue="en">
                <SelectTrigger className="w-40" data-testid="select-interface-language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label>Default Synthesis Language</Label>
                <span className="text-sm text-muted-foreground">
                  Default language for voice synthesis
                </span>
              </div>
              <Select defaultValue="en">
                <SelectTrigger className="w-40" data-testid="select-default-language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label>Synthesis Complete</Label>
                <span className="text-sm text-muted-foreground">
                  Notify when audio generation finishes
                </span>
              </div>
              <Switch defaultChecked data-testid="switch-notify-synthesis" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label>Consent Updates</Label>
                <span className="text-sm text-muted-foreground">
                  Notify when consent status changes
                </span>
              </div>
              <Switch defaultChecked data-testid="switch-notify-consent" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label>Sound Effects</Label>
                <span className="text-sm text-muted-foreground">
                  Play sounds for notifications
                </span>
              </div>
              <Switch data-testid="switch-sounds" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy & Security
            </CardTitle>
            <CardDescription>
              Manage your privacy and security settings
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label>Audio Watermarking</Label>
                <span className="text-sm text-muted-foreground">
                  Embed watermark in generated audio
                </span>
              </div>
              <Switch defaultChecked data-testid="switch-watermark" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label>Analytics</Label>
                <span className="text-sm text-muted-foreground">
                  Help improve the service with usage data
                </span>
              </div>
              <Switch data-testid="switch-analytics" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Storage
            </CardTitle>
            <CardDescription>
              Manage your storage and cached data
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label>Cache Size</Label>
                <span className="text-sm text-muted-foreground">
                  Locally cached audio files
                </span>
              </div>
              <span className="text-sm font-medium">0 MB</span>
            </div>
            <Separator />
            <Button variant="outline" data-testid="button-clear-cache">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Cache
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions that affect your account
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-lg bg-destructive/10 p-4">
              <p className="text-sm font-medium text-destructive">Delete All Data</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Permanently delete all your voices, consent records, and synthesis history.
                This action cannot be undone.
              </p>
              <Button variant="destructive" className="mt-4" data-testid="button-delete-all">
                Delete All Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
