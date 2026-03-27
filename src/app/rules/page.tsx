"use client";

import { useState, useMemo } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { qaRules, TOTAL_MAX_SCORE, type QARule } from "@/lib/mockData";
import { saveQARule, deleteQARule, saveMainPrompt } from "@/lib/actions";
import {
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Loader2,
  MessageSquare,
  Tag,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

const DEFAULT_MAIN_PROMPT = `Ești un analist QA care evaluează transcriptul unui apel de la un centru de apeluri. Sarcina ta este să evaluezi apelul conform criteriilor de calitate de mai jos și să returnezi un scorecard JSON structurat.

Fii obiectiv, corect și consistent. Bazează evaluarea exclusiv pe ceea ce este exprimat explicit în transcript. Pentru fiecare regulă, oferă o determinare clară și o explicație scurtă.`;

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
    section: "",
    sectionEn: "",
    maxScore: 5,
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

  // Group rules by section (extraction rules go into a separate group)
  const groupedRules = useMemo(() => {
    const groups: { section: string; sectionEn?: string; rules: QARule[] }[] = [];
    const sectionMap = new Map<string, { section: string; sectionEn?: string; rules: QARule[] }>();

    rules.forEach((rule) => {
      const key = rule.section ?? "__extraction__";
      if (!sectionMap.has(key)) {
        const group = {
          section: rule.section ?? "Extracții",
          sectionEn: rule.sectionEn,
          rules: [],
        };
        sectionMap.set(key, group);
        groups.push(group);
      }
      sectionMap.get(key)!.rules.push(rule);
    });

    return groups;
  }, [rules]);

  // Total max score of enabled scoring rules
  const enabledMaxScore = rules
    .filter((r) => r.enabled && r.maxScore !== undefined)
    .reduce((sum, r) => sum + (r.maxScore ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Motor Reguli QA
          </h1>
          <p className="text-muted-foreground">
            Gestionați criteriile de evaluare LLM pentru analiza calității apelurilor.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-right">
            <div className="text-muted-foreground">Scor total posibil</div>
            <div className="font-bold text-lg">{enabledMaxScore} <span className="text-muted-foreground font-normal text-sm">/ {TOTAL_MAX_SCORE} max</span></div>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" /> Adaugă Regulă
          </Button>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingRule?.id ? "Editare Regulă" : "Regulă Nouă"}
              </DialogTitle>
              <DialogDescription>
                Definiți criteriile de evaluare pentru LLM.
              </DialogDescription>
            </DialogHeader>
            {editingRule && (
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="rule-title">Titlu Regulă</Label>
                  <Input
                    id="rule-title"
                    value={editingRule.title}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        title: e.target.value,
                      })
                    }
                    placeholder="ex: Salut & Verificare identitate"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rule-desc">
                    Descriere (Instrucțiune Prompt)
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
                    placeholder="Descrieți ce trebuie să evalueze LLM-ul..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="rule-section">Secțiune</Label>
                    <Input
                      id="rule-section"
                      value={editingRule.section ?? ""}
                      onChange={(e) =>
                        setEditingRule({
                          ...editingRule,
                          section: e.target.value || undefined,
                        })
                      }
                      placeholder="ex: Deschidere apel"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rule-section-en">Secțiune (EN)</Label>
                    <Input
                      id="rule-section-en"
                      value={editingRule.sectionEn ?? ""}
                      onChange={(e) =>
                        setEditingRule({
                          ...editingRule,
                          sectionEn: e.target.value || undefined,
                        })
                      }
                      placeholder="ex: Call Opening"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg border">
                  <Switch
                    id="rule-is-extraction"
                    checked={editingRule.extractionKey !== undefined}
                    onCheckedChange={(v) => {
                      if (v) {
                        setEditingRule({ ...editingRule, maxScore: undefined, extractionKey: "" });
                      } else {
                        setEditingRule({ ...editingRule, extractionKey: undefined, maxScore: 5 });
                      }
                    }}
                  />
                  <div>
                    <Label htmlFor="rule-is-extraction">Regulă de extracție</Label>
                    <p className="text-xs text-muted-foreground">Extrage o valoare din transcript (fără scor)</p>
                  </div>
                </div>
                {editingRule.extractionKey === undefined && (
                  <div className="space-y-1.5">
                    <Label htmlFor="rule-max-score">Scor Maxim</Label>
                    <Input
                      id="rule-max-score"
                      type="number"
                      min={1}
                      max={20}
                      value={editingRule.maxScore ?? ""}
                      onChange={(e) =>
                        setEditingRule({
                          ...editingRule,
                          maxScore: e.target.value ? parseInt(e.target.value, 10) : undefined,
                        })
                      }
                      placeholder="ex: 5"
                    />
                    <p className="text-xs text-muted-foreground">
                      Numărul maxim de puncte acordate pentru această regulă.
                    </p>
                  </div>
                )}
                {editingRule.extractionKey !== undefined && (
                  <div className="space-y-1.5">
                    <Label htmlFor="rule-extraction-key">Cheie Extracție</Label>
                    <Input
                      id="rule-extraction-key"
                      value={editingRule.extractionKey ?? ""}
                      onChange={(e) =>
                        setEditingRule({
                          ...editingRule,
                          extractionKey: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                        })
                      }
                      placeholder="ex: customer_name, intent, sentiment"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Identificator snake_case. Valoarea extrasă va fi stocată sub această cheie.
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
                  <Label>Activată</Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Anulează
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Se salvează..." : "Salvează Regula"}
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
              <CardTitle>Prompt Principal</CardTitle>
              <CardDescription>
                Aceasta este instrucțiunea de sistem trimisă LLM-ului. Regulile de mai jos sunt adăugate automat ca criterii de evaluare.
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
              placeholder="Introduceți instrucțiunea principală LLM..."
              className="font-mono text-sm"
            />
            <div className="flex items-center gap-3">
              <Button onClick={handlePromptSave} disabled={promptSaving}>
                {promptSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvează Promptul
              </Button>
              {promptStatus && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> {promptStatus}
                </span>
              )}
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              După acest prompt, fiecare regulă activată va fi adăugată ca criteriu de evaluare numerotat în formatul: <span className="font-mono bg-muted px-1 rounded">Regula N: [Titlu] — [Descriere]</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rules List grouped by section */}
      <div className="space-y-6">
        {groupedRules.map((group) => {
          const groupMaxScore = group.rules
            .filter((r) => r.enabled && r.maxScore !== undefined)
            .reduce((sum, r) => sum + (r.maxScore ?? 0), 0);
          const isExtractionGroup = !group.rules[0]?.section;

          return (
            <div key={group.section} className="space-y-3">
              {/* Section Header */}
              <div className="flex items-center justify-between py-1 border-b">
                <div>
                  <h2 className="font-semibold text-base">
                    {group.section}
                    {group.sectionEn && group.sectionEn !== group.section && (
                      <span className="text-muted-foreground font-normal ml-2 text-sm">/ {group.sectionEn}</span>
                    )}
                  </h2>
                </div>
                {!isExtractionGroup && groupMaxScore > 0 && (
                  <Badge variant="outline" className="text-xs font-mono">
                    max {groupMaxScore} pts
                  </Badge>
                )}
              </div>

              {group.rules.map((rule) => {
                const ruleIndex = rules.findIndex((r) => r.id === rule.id);
                return (
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
                            onClick={() => moveRule(ruleIndex, "up")}
                            disabled={ruleIndex === 0}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveRule(ruleIndex, "down")}
                            disabled={ruleIndex === rules.length - 1}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {rule.extractionKey && <Tag className="h-4 w-4 text-blue-500" />}
                            <span className="font-semibold">{rule.title}</span>
                            {rule.maxScore !== undefined ? (
                              <Badge variant="outline" className="text-xs font-mono">
                                max {rule.maxScore} pts
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs font-mono">
                                {rule.extractionKey ? `→ ${rule.extractionKey}` : "extract"}
                              </Badge>
                            )}
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
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
