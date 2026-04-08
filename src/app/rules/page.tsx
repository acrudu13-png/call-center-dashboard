"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { type QARule } from "@/lib/mockData";
import { saveQARule, deleteQARule, saveMainPrompt, saveClassificationSettings, saveCallType, removeCallType } from "@/lib/actions";
import { fetchRules, fetchSetting, fetchCallTypes, fetchSubdirectories, fetchMetadataFields, updateSubdirectory, type CallTypeInfo, type SubdirectoryInfo } from "@/lib/api";
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
  Brain,
  ListChecks,
  FolderOpen,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

const DEFAULT_MAIN_PROMPT = `Ești un analist QA care evaluează transcriptul unui apel de la un centru de apeluri. Sarcina ta este să evaluezi apelul conform criteriilor de calitate de mai jos și să returnezi un scorecard JSON structurat.

Fii obiectiv, corect și consistent. Bazează evaluarea exclusiv pe ceea ce este exprimat explicit în transcript. Pentru fiecare regulă, oferă o determinare clară și o explicație scurtă.`;

const DEFAULT_CLASSIFICATION_PROMPT = "You classify phone calls into categories. Reply with ONLY the category key, nothing else. No explanation.";

interface ClassificationSettingsData {
  model: string;
  prompt: string;
  temperature: number;
}

export default function RulesEnginePage() {
  // ── Main Agent tab state ──
  const [rules, setRules] = useState<QARule[]>([]);
  const [editingRule, setEditingRule] = useState<QARule | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [mainPrompt, setMainPrompt] = useState(DEFAULT_MAIN_PROMPT);
  const [promptSaving, setPromptSaving] = useState(false);
  const [promptStatus, setPromptStatus] = useState<string | null>(null);
  const [callTypes, setCallTypes] = useState<CallTypeInfo[]>([]);

  // ── Call Type Agent tab state ──
  const [clsSettings, setClsSettings] = useState<ClassificationSettingsData>({
    model: "openai/gpt-5-nano",
    prompt: DEFAULT_CLASSIFICATION_PROMPT,
    temperature: 0,
  });
  const [clsSaving, setClsSaving] = useState(false);
  const [clsStatus, setClsStatus] = useState<string | null>(null);

  const [editingCallType, setEditingCallType] = useState<{ key: string; name: string; description: string; enabled: boolean; isNew: boolean } | null>(null);
  const [ctDialogOpen, setCtDialogOpen] = useState(false);
  const [ctSaving, setCtSaving] = useState(false);

  // ── Subdirectory Rules tab state ──
  const [subdirectories, setSubdirectories] = useState<SubdirectoryInfo[]>([]);

  // ── Metadata fields (for conditions) ──
  const [metaFields, setMetaFields] = useState<Record<string, string[]>>({});

  // Load data from API
  useEffect(() => {
    fetchCallTypes().then(setCallTypes).catch(() => {});
    fetchSubdirectories().then(setSubdirectories).catch(() => {});
    fetchMetadataFields().then((res) => setMetaFields(res.fields)).catch(() => {});
    fetchRules().then((apiRules) => {
      setRules(apiRules.map((r) => ({
        id: r.rule_id,
        title: r.title,
        description: r.description,
        section: r.section,
        maxScore: r.max_score > 0 ? r.max_score : undefined,
        extractionKey: r.rule_type === "extraction" ? r.rule_id : undefined,
        enabled: r.enabled,
        isCritical: r.is_critical,
        direction: r.direction || "both",
        callTypes: r.call_types || [],
        subdirectories: r.subdirectories || [],
        metadataConditions: r.metadata_conditions || [],
        order: r.sort_order,
      })));
    }).catch(() => {});
    fetchSetting<{ prompt: string }>("main-prompt").then((data) => {
      if (data?.prompt) setMainPrompt(data.prompt);
    }).catch(() => {});
    fetchSetting<ClassificationSettingsData>("classification").then((data) => {
      if (data) setClsSettings({ model: data.model || "openai/gpt-5-nano", prompt: data.prompt || DEFAULT_CLASSIFICATION_PROMPT, temperature: data.temperature ?? 0 });
    }).catch(() => {});
  }, []);

  // ── Main Agent handlers ──
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
    isCritical: false,
    direction: "both",
    callTypes: [],
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

  const toggleEnabled = async (ruleId: string) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;
    const newEnabled = !rule.enabled;
    setRules((prev) =>
      prev.map((r) =>
        r.id === ruleId ? { ...r, enabled: newEnabled } : r
      )
    );
    try {
      await saveQARule({ ...rule, enabled: newEnabled });
    } catch {
      setRules((prev) =>
        prev.map((r) =>
          r.id === ruleId ? { ...r, enabled: !newEnabled } : r
        )
      );
    }
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

  const enabledMaxScore = rules
    .filter((r) => r.enabled && r.maxScore !== undefined)
    .reduce((sum, r) => sum + (r.maxScore ?? 0), 0);

  // ── Call Type Agent handlers ──
  const handleClsSave = async () => {
    setClsSaving(true);
    const result = await saveClassificationSettings(clsSettings);
    setClsStatus(result.message);
    setTimeout(() => setClsStatus(null), 3000);
    setClsSaving(false);
  };

  const openNewCallType = () => {
    setEditingCallType({ key: "", name: "", description: "", enabled: true, isNew: true });
    setCtDialogOpen(true);
  };

  const openEditCallType = (ct: CallTypeInfo) => {
    setEditingCallType({ key: ct.key, name: ct.name, description: ct.description, enabled: ct.enabled, isNew: false });
    setCtDialogOpen(true);
  };

  const handleCallTypeSave = async () => {
    if (!editingCallType) return;
    setCtSaving(true);
    try {
      const result = await saveCallType(editingCallType);
      if (result.success) {
        // Reload call types
        const updated = await fetchCallTypes();
        setCallTypes(updated);
        setCtDialogOpen(false);
      }
    } catch {
      // ignore
    }
    setCtSaving(false);
  };

  const handleCallTypeDelete = async (key: string) => {
    try {
      await removeCallType(key);
      setCallTypes((prev) => prev.filter((ct) => ct.key !== key));
    } catch {
      // ignore
    }
  };

  const toggleCallTypeEnabled = async (ct: CallTypeInfo) => {
    const newEnabled = !ct.enabled;
    setCallTypes((prev) =>
      prev.map((c) => (c.key === ct.key ? { ...c, enabled: newEnabled } : c))
    );
    try {
      await saveCallType({ key: ct.key, name: ct.name, description: ct.description, enabled: newEnabled });
    } catch {
      setCallTypes((prev) =>
        prev.map((c) => (c.key === ct.key ? { ...c, enabled: !newEnabled } : c))
      );
    }
  };

  // ── Subdirectory Rules handlers ──
  const handleSubdirUpdate = async (key: string, field: string, value: string | boolean) => {
    setSubdirectories((prev) =>
      prev.map((s) => (s.key === key ? { ...s, [field]: value } : s))
    );
    try {
      await updateSubdirectory(key, { [field]: value });
    } catch {
      // Reload on failure
      fetchSubdirectories().then(setSubdirectories).catch(() => {});
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Motor Reguli QA
        </h1>
        <p className="text-muted-foreground">
          Gestionați criteriile de evaluare LLM pentru analiza calității apelurilor.
        </p>
      </div>

      <Tabs defaultValue="main-agent" className="space-y-6">
        <TabsList>
          <TabsTrigger value="main-agent" className="gap-2">
            <ListChecks className="h-4 w-4" />
            Reguli Agent Principal
          </TabsTrigger>
          <TabsTrigger value="call-type-agent" className="gap-2">
            <Brain className="h-4 w-4" />
            Agent Tip Apel
          </TabsTrigger>
          <TabsTrigger value="subdirectory-rules" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Reguli Subdirectoare
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════════════════════
            TAB 1: Main Agent Rules
            ════════════════════════════════════════════════════════════ */}
        <TabsContent value="main-agent" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-right">
              <div className="text-muted-foreground">Scor total posibil</div>
              <div className="font-bold text-lg">{enabledMaxScore} <span className="text-muted-foreground font-normal text-sm">/ {rules.reduce((sum, r) => sum + (r.maxScore ?? 0), 0)} max</span></div>
            </div>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" /> Adaugă Regulă
            </Button>
          </div>

          {/* Rule edit dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
                  <div className="space-y-1.5">
                    <Label>Directie apel</Label>
                    <Select
                      value={editingRule.direction || "both"}
                      onValueChange={(v) => v && setEditingRule({ ...editingRule, direction: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">Ambele (inbound + outbound)</SelectItem>
                        <SelectItem value="inbound">Doar inbound</SelectItem>
                        <SelectItem value="outbound">Doar outbound</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {callTypes.length > 0 && (
                    <div className="space-y-1.5">
                      <Label>Tip apel</Label>
                      <p className="text-xs text-muted-foreground">Gol = toate tipurile.</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {callTypes.map((ct) => (
                          <label key={ct.key} className="flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded hover:bg-muted">
                            <input
                              type="checkbox"
                              checked={(editingRule.callTypes || []).includes(ct.key)}
                              onChange={(e) => {
                                const current = editingRule.callTypes || [];
                                setEditingRule({
                                  ...editingRule,
                                  callTypes: e.target.checked
                                    ? [...current, ct.key]
                                    : current.filter((k: string) => k !== ct.key),
                                });
                              }}
                              className="rounded"
                            />
                            {ct.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {subdirectories.length > 0 && (
                    <div className="space-y-1.5">
                      <Label>Subdirectoare</Label>
                      <p className="text-xs text-muted-foreground">Gol = toate subdirectoarele.</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {subdirectories.map((sd) => (
                          <label key={sd.key} className="flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded hover:bg-muted">
                            <input
                              type="checkbox"
                              checked={(editingRule.subdirectories || []).includes(sd.key)}
                              onChange={(e) => {
                                const current = editingRule.subdirectories || [];
                                setEditingRule({
                                  ...editingRule,
                                  subdirectories: e.target.checked
                                    ? [...current, sd.key]
                                    : current.filter((k: string) => k !== sd.key),
                                });
                              }}
                              className="rounded"
                            />
                            {sd.display_name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {Object.keys(metaFields).length > 0 && (
                    <div className="space-y-1.5">
                      <Label>Condiții metadata</Label>
                      <p className="text-xs text-muted-foreground">Regula se aplică doar când toate condițiile sunt îndeplinite. Gol = fără condiții.</p>
                      {(editingRule.metadataConditions || []).map((cond, ci) => (
                        <div key={ci} className="flex gap-1.5 items-center">
                          <Select
                            value={cond.field}
                            onValueChange={(v) => {
                              if (!v) return;
                              const updated = [...(editingRule.metadataConditions || [])];
                              updated[ci] = { ...cond, field: v, value: "" };
                              setEditingRule({ ...editingRule, metadataConditions: updated });
                            }}
                          >
                            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.keys(metaFields).map((f) => (
                                <SelectItem key={f} value={f}>{f}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={cond.operator}
                            onValueChange={(v) => {
                              if (!v) return;
                              const updated = [...(editingRule.metadataConditions || [])];
                              updated[ci] = { ...cond, operator: v };
                              setEditingRule({ ...editingRule, metadataConditions: updated });
                            }}
                          >
                            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="equals">=</SelectItem>
                              <SelectItem value="not_equals">!=</SelectItem>
                              <SelectItem value="contains">contains</SelectItem>
                              <SelectItem value="not_contains">!contains</SelectItem>
                            </SelectContent>
                          </Select>
                          {cond.field && metaFields[cond.field] ? (
                            <Select
                              value={cond.value}
                              onValueChange={(v) => {
                                if (!v) return;
                                const updated = [...(editingRule.metadataConditions || [])];
                                updated[ci] = { ...cond, value: v };
                                setEditingRule({ ...editingRule, metadataConditions: updated });
                              }}
                            >
                              <SelectTrigger className="flex-1"><SelectValue placeholder="value" /></SelectTrigger>
                              <SelectContent>
                                {metaFields[cond.field].map((val) => (
                                  <SelectItem key={val} value={val}>{val}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={cond.value}
                              onChange={(e) => {
                                const updated = [...(editingRule.metadataConditions || [])];
                                updated[ci] = { ...cond, value: e.target.value };
                                setEditingRule({ ...editingRule, metadataConditions: updated });
                              }}
                              className="flex-1"
                              placeholder="value"
                            />
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updated = (editingRule.metadataConditions || []).filter((_, i) => i !== ci);
                              setEditingRule({ ...editingRule, metadataConditions: updated });
                            }}
                          >
                            &times;
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const firstField = Object.keys(metaFields)[0] || "";
                          setEditingRule({
                            ...editingRule,
                            metadataConditions: [...(editingRule.metadataConditions || []), { field: firstField, operator: "equals", value: "" }],
                          });
                        }}
                      >
                        + Adaugă condiție
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingRule.isCritical || false}
                      onCheckedChange={(v) =>
                        setEditingRule({ ...editingRule, isCritical: v })
                      }
                    />
                    <Label>Regula critica</Label>
                    <span className="text-xs text-muted-foreground">(esecul afecteaza conformitatea)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingRule.enabled}
                      onCheckedChange={(v) =>
                        setEditingRule({ ...editingRule, enabled: v })
                      }
                    />
                    <Label>Activata</Label>
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
                                {rule.direction && rule.direction !== "both" && (
                                  <Badge variant="outline" className="text-xs">
                                    {rule.direction === "inbound" ? "IN" : "OUT"}
                                  </Badge>
                                )}
                                {rule.isCritical && (
                                  <Badge variant="destructive" className="text-xs">CRITICAL</Badge>
                                )}
                                {rule.callTypes && rule.callTypes.length > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {rule.callTypes.map(k => callTypes.find(ct => ct.key === k)?.name || k).join(", ")}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {rule.description}
                              </p>
                            </div>

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
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════
            TAB 2: Call Type Agent
            ════════════════════════════════════════════════════════════ */}
        <TabsContent value="call-type-agent" className="space-y-6">

          {/* Classification LLM Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                <div>
                  <CardTitle>Configurare Agent Clasificare</CardTitle>
                  <CardDescription>
                    Modelul, promptul și temperatura folosite pentru clasificarea automată a tipului de apel.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-xl">
                <div className="space-y-1.5">
                  <Label htmlFor="cls-model">Model</Label>
                  <Input
                    id="cls-model"
                    value={clsSettings.model}
                    onChange={(e) => setClsSettings({ ...clsSettings, model: e.target.value })}
                    placeholder="ex: openai/gpt-5-nano"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Modelul OpenRouter folosit pentru clasificarea apelurilor.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cls-prompt">Prompt Sistem</Label>
                  <Textarea
                    id="cls-prompt"
                    rows={4}
                    value={clsSettings.prompt}
                    onChange={(e) => setClsSettings({ ...clsSettings, prompt: e.target.value })}
                    placeholder="Instrucțiuni pentru agentul de clasificare..."
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Instrucțiunea de sistem trimisă agentului de clasificare. Tipurile de apel sunt adăugate automat.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>
                    Temperatură: <span className="font-mono">{clsSettings.temperature}</span>
                  </Label>
                  <Slider
                    value={[clsSettings.temperature]}
                    min={0}
                    max={1}
                    step={0.05}
                    onValueChange={(val) => setClsSettings({ ...clsSettings, temperature: Array.isArray(val) ? val[0] : val })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Valori mai mici produc rezultate mai consistente și deterministe.
                  </p>
                </div>

                <Separator />

                <div className="flex items-center gap-3">
                  <Button onClick={handleClsSave} disabled={clsSaving}>
                    {clsSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Salvează Setările
                  </Button>
                  {clsStatus && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> {clsStatus}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Call Types CRUD */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  <div>
                    <CardTitle>Tipuri de Apel</CardTitle>
                    <CardDescription>
                      Categoriile în care agentul de clasificare poate încadra apelurile. Descrierea ajută LLM-ul să înțeleagă fiecare tip.
                    </CardDescription>
                  </div>
                </div>
                <Button onClick={openNewCallType}>
                  <Plus className="h-4 w-4 mr-2" /> Adaugă Tip
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {callTypes.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nu există tipuri de apel configurate. Adăugați primul tip pentru a activa clasificarea automată.
                  </p>
                )}
                {callTypes.map((ct) => (
                  <div
                    key={ct.key}
                    className={`flex items-start gap-4 p-4 rounded-lg border ${!ct.enabled ? "opacity-50" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{ct.name}</span>
                        <Badge variant="outline" className="text-xs font-mono">{ct.key}</Badge>
                        {!ct.enabled && <Badge variant="secondary" className="text-xs">Dezactivat</Badge>}
                      </div>
                      {ct.description && (
                        <p className="text-sm text-muted-foreground">{ct.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={ct.enabled}
                        onCheckedChange={() => toggleCallTypeEnabled(ct)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => openEditCallType(ct)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleCallTypeDelete(ct.key)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Call Type edit dialog */}
          <Dialog open={ctDialogOpen} onOpenChange={setCtDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingCallType?.isNew ? "Tip Apel Nou" : "Editare Tip Apel"}
                </DialogTitle>
                <DialogDescription>
                  Definiți categoria de apel pentru clasificarea automată.
                </DialogDescription>
              </DialogHeader>
              {editingCallType && (
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ct-key">Cheie (identificator unic)</Label>
                    <Input
                      id="ct-key"
                      value={editingCallType.key}
                      onChange={(e) =>
                        setEditingCallType({
                          ...editingCallType,
                          key: e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
                        })
                      }
                      placeholder="ex: customer_support"
                      className="font-mono text-sm"
                      disabled={!editingCallType.isNew}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ct-name">Nume</Label>
                    <Input
                      id="ct-name"
                      value={editingCallType.name}
                      onChange={(e) =>
                        setEditingCallType({ ...editingCallType, name: e.target.value })
                      }
                      placeholder="ex: Suport Clienți"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ct-desc">Descriere</Label>
                    <Textarea
                      id="ct-desc"
                      rows={3}
                      value={editingCallType.description}
                      onChange={(e) =>
                        setEditingCallType({ ...editingCallType, description: e.target.value })
                      }
                      placeholder="Descrieți acest tip de apel pentru a ajuta LLM-ul să clasifice corect..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Această descriere este trimisă LLM-ului pentru a înțelege categoria.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingCallType.enabled}
                      onCheckedChange={(v) =>
                        setEditingCallType({ ...editingCallType, enabled: v })
                      }
                    />
                    <Label>Activat</Label>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setCtDialogOpen(false)}>
                  Anulează
                </Button>
                <Button onClick={handleCallTypeSave} disabled={ctSaving || !editingCallType?.key || !editingCallType?.name}>
                  {ctSaving ? "Se salvează..." : "Salvează"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════
            TAB 3: Subdirectory Rules
            ════════════════════════════════════════════════════════════ */}
        <TabsContent value="subdirectory-rules" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                <div>
                  <CardTitle>Reguli Subdirectoare</CardTitle>
                  <CardDescription>
                    Configurați direcția și starea fiecărui subdirector descoperit în timpul ingestiei. Subdirectoarele noi sunt adăugate automat.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {subdirectories.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nu există subdirectoare descoperite. Activați &quot;Recursive directory traversal&quot; în setările de ingestie și rulați o ingestie.
                </p>
              ) : (
                <div className="space-y-3">
                  {subdirectories.map((sd) => (
                    <div
                      key={sd.key}
                      className={`flex items-center gap-4 p-4 rounded-lg border ${!sd.enabled ? "opacity-50" : ""}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{sd.display_name}</span>
                          <Badge variant="outline" className="text-xs font-mono">{sd.key}</Badge>
                        </div>
                        {sd.discovered_from && (
                          <p className="text-xs text-muted-foreground">Descoperit din: {sd.discovered_from}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Select
                          value={sd.direction}
                          onValueChange={(v) => v && handleSubdirUpdate(sd.key, "direction", v)}
                        >
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inbound">Inbound</SelectItem>
                            <SelectItem value="outbound">Outbound</SelectItem>
                            <SelectItem value="both">Ambele</SelectItem>
                            <SelectItem value="unknown">Necunoscut</SelectItem>
                          </SelectContent>
                        </Select>
                        <Switch
                          checked={sd.enabled}
                          onCheckedChange={(v) => handleSubdirUpdate(sd.key, "enabled", v)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
