"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { qaRules, type QARule } from "@/lib/mockData";
import { saveQARule, deleteQARule, saveMainPrompt } from "@/lib/actions";
import {
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Star,
  ArrowUp,
  ArrowDown,
  Loader2,
  MessageSquare,
  Tag,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

const DEFAULT_MAIN_PROMPT = `You are a QA analyst evaluating a customer service call transcript. Your task is to assess the call against the quality criteria below and return a structured JSON scorecard.

Be objective, fair, and consistent. Base your assessment only on what is explicitly stated in the transcript. For each rule, provide a clear determination and a brief explanation.`;

export default function RulesEnginePage() {
  const [rules, setRules] = useState<QARule[]>(qaRules);
  const [editingRule, setEditingRule] = useState<QARule | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [mainPrompt, setMainPrompt] = useState(DEFAULT_MAIN_PROMPT);
  const [promptSaving, setPromptSaving] = useState(false);
  const [promptStatus, setPromptStatus] = useState<string | null>(null);

  const handlePromptSave = async () => {
    setPromptSaving(true);
    const result = await saveMainPrompt(mainPrompt);
    setPromptStatus(result.message);
    setTimeout(() => setPromptStatus(null), 3000);
    setPromptSaving(false);
  };

  const emptyRule: QARule = {
    id: "",
    title: "",
    description: "",
    weight: "moderate",
    expectedOutput: "boolean",
    enabled: true,
    order: rules.length + 1,
  };

  const openNew = () => {
    setEditingRule({ ...emptyRule });
    setDialogOpen(true);
  };

  const openEdit = (rule: QARule) => {
    setEditingRule({ ...rule });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingRule) return;
    setSaving(true);
    const result = await saveQARule(editingRule);
    if (result.success) {
      if (editingRule.id) {
        setRules((prev) =>
          prev.map((r) => (r.id === editingRule.id ? editingRule : r))
        );
      } else {
        setRules((prev) => [...prev, { ...editingRule, id: result.id! }]);
      }
      setDialogOpen(false);
    }
    setSaving(false);
  };

  const handleDelete = async (ruleId: string) => {
    const result = await deleteQARule(ruleId);
    if (result.success) {
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    }
  };

  const toggleEnabled = (ruleId: string) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === ruleId ? { ...r, enabled: !r.enabled } : r
      )
    );
  };

  const moveRule = (index: number, direction: "up" | "down") => {
    const newRules = [...rules];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newRules.length) return;
    [newRules[index], newRules[swapIndex]] = [
      newRules[swapIndex],
      newRules[index],
    ];
    newRules.forEach((r, i) => (r.order = i + 1));
    setRules(newRules);
  };

  const weightIcon = (weight: string) => {
    switch (weight) {
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "moderate":
        return <CheckCircle2 className="h-4 w-4 text-yellow-500" />;
      case "bonus":
        return <Star className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const outputLabel = (rule: QARule) => {
    if (rule.expectedOutput === "extraction")
      return rule.extractionKey ? `→ ${rule.extractionKey}` : "extraction";
    if (rule.expectedOutput === "boolean") return "Pass/Fail";
    return "Text";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            QA Rules Engine
          </h1>
          <p className="text-muted-foreground">
            Manage the LLM assessment criteria for call quality analysis.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Add Rule
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingRule?.id ? "Edit Rule" : "New Rule"}
              </DialogTitle>
              <DialogDescription>
                Define the assessment criteria for the LLM to evaluate.
              </DialogDescription>
            </DialogHeader>
            {editingRule && (
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="rule-title">Rule Title</Label>
                  <Input
                    id="rule-title"
                    value={editingRule.title}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        title: e.target.value,
                      })
                    }
                    placeholder="e.g., Greeting & Identity Verification"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rule-desc">
                    Description (Prompt Instruction)
                  </Label>
                  <Textarea
                    id="rule-desc"
                    rows={4}
                    value={editingRule.description}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe what the LLM should evaluate..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Weight / Importance</Label>
                    <Select
                      value={editingRule.weight}
                      onValueChange={(v) =>
                        v && setEditingRule({
                          ...editingRule,
                          weight: v as QARule["weight"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="bonus">Bonus</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Output Type</Label>
                    <Select
                      value={editingRule.expectedOutput}
                      onValueChange={(v) =>
                        v && setEditingRule({
                          ...editingRule,
                          expectedOutput: v as QARule["expectedOutput"],
                          extractionKey: v !== "extraction" ? undefined : (editingRule.extractionKey ?? ""),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="boolean">Boolean (Pass/Fail)</SelectItem>
                        <SelectItem value="text">Text Response</SelectItem>
                        <SelectItem value="extraction">Extraction (extract value)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {editingRule.expectedOutput === "extraction" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="rule-extraction-key">Extraction Key</Label>
                    <Input
                      id="rule-extraction-key"
                      value={editingRule.extractionKey ?? ""}
                      onChange={(e) =>
                        setEditingRule({
                          ...editingRule,
                          extractionKey: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                        })
                      }
                      placeholder="e.g. customer_name, intent, sentiment"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Snake_case identifier. The extracted value will be stored under this key and shown in the Call Information panel.
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingRule.enabled}
                    onCheckedChange={(v) =>
                      setEditingRule({ ...editingRule, enabled: v })
                    }
                  />
                  <Label>Enabled</Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Rule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Prompt */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <div>
              <CardTitle>Main Prompt</CardTitle>
              <CardDescription>
                This is the system instruction sent to the LLM. The rules below are automatically appended as evaluation criteria.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              rows={6}
              value={mainPrompt}
              onChange={(e) => setMainPrompt(e.target.value)}
              placeholder="Enter the main LLM instruction..."
              className="font-mono text-sm"
            />
            <div className="flex items-center gap-3">
              <Button onClick={handlePromptSave} disabled={promptSaving}>
                {promptSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Prompt
              </Button>
              {promptStatus && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> {promptStatus}
                </span>
              )}
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              After this prompt, each enabled rule below will be appended as a numbered evaluation criterion in the format: <span className="font-mono bg-muted px-1 rounded">Rule N: [Title] — [Description]</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rules List */}
      <div className="space-y-3">
        {rules.map((rule, index) => (
          <Card
            key={rule.id}
            className={!rule.enabled ? "opacity-50" : ""}
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                {/* Reorder Controls */}
                <div className="flex flex-col items-center gap-1 pt-1">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveRule(index, "up")}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveRule(index, "down")}
                    disabled={index === rules.length - 1}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {rule.expectedOutput === "extraction"
                      ? <Tag className="h-4 w-4 text-blue-500" />
                      : weightIcon(rule.weight)}
                    <span className="font-semibold">{rule.title}</span>
                    {rule.expectedOutput !== "extraction" && (
                      <Badge
                        variant={
                          rule.weight === "critical"
                            ? "destructive"
                            : rule.weight === "bonus"
                            ? "outline"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {rule.weight}
                      </Badge>
                    )}
                    <Badge
                      variant={rule.expectedOutput === "extraction" ? "secondary" : "outline"}
                      className="text-xs font-mono"
                    >
                      {outputLabel(rule)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {rule.description}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={() => toggleEnabled(rule.id)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(rule)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(rule.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
