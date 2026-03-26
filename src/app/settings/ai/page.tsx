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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  defaultLlmSettings,
  defaultSonioxSettings,
  defaultCustomVocabulary,
} from "@/lib/mockData";
import {
  saveLlmSettings,
  saveSonioxSettings,
  saveCustomVocabulary,
  saveCallContext,
} from "@/lib/actions";
import {
  Brain,
  Mic,
  BookOpen,
  FileText,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  X,
  Plus,
} from "lucide-react";

export default function AISettingsPage() {
  const [llm, setLlm] = useState(defaultLlmSettings);
  const [llmSaving, setLlmSaving] = useState(false);
  const [showLlmKey, setShowLlmKey] = useState(false);

  const [soniox, setSoniox] = useState(defaultSonioxSettings);
  const [sonioxSaving, setSonioxSaving] = useState(false);
  const [showSonioxKey, setShowSonioxKey] = useState(false);

  const [vocab, setVocab] = useState<string[]>(defaultCustomVocabulary);
  const [vocabInput, setVocabInput] = useState("");
  const [vocabSaving, setVocabSaving] = useState(false);

  const [callContext, setCallContext] = useState("");
  const [contextSaving, setContextSaving] = useState(false);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleLlmSave = async () => {
    setLlmSaving(true);
    const result = await saveLlmSettings(llm);
    showStatus(result.message);
    setLlmSaving(false);
  };

  const handleSonioxSave = async () => {
    setSonioxSaving(true);
    const result = await saveSonioxSettings(soniox);
    showStatus(result.message);
    setSonioxSaving(false);
  };

  const handleVocabSave = async () => {
    setVocabSaving(true);
    const result = await saveCustomVocabulary(vocab);
    showStatus(result.message);
    setVocabSaving(false);
  };

  const handleContextSave = async () => {
    setContextSaving(true);
    const result = await saveCallContext(callContext);
    showStatus(result.message);
    setContextSaving(false);
  };

  const addVocabWord = () => {
    const word = vocabInput.trim();
    if (word && !vocab.includes(word)) {
      setVocab([...vocab, word]);
      setVocabInput("");
    }
  };

  const removeVocabWord = (word: string) => {
    setVocab(vocab.filter((w) => w !== word));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          AI & Transcription Settings
        </h1>
        <p className="text-muted-foreground">
          Configure LLM analysis and speech-to-text transcription engines.
        </p>
      </div>

      {statusMessage && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
          <CheckCircle2 className="h-4 w-4" />
          {statusMessage}
        </div>
      )}

      {/* LLM Config */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            <div>
              <CardTitle>LLM Configuration</CardTitle>
              <CardDescription>
                OpenRouter API settings for call analysis.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-xl">
            <div className="space-y-1.5">
              <Label htmlFor="llm-key">OpenRouter API Key</Label>
              <div className="relative">
                <Input
                  id="llm-key"
                  type={showLlmKey ? "text" : "password"}
                  value={llm.openRouterApiKey}
                  onChange={(e) =>
                    setLlm({ ...llm, openRouterApiKey: e.target.value })
                  }
                  placeholder="sk-or-..."
                />
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  className="absolute right-0 top-0"
                  onClick={() => setShowLlmKey(!showLlmKey)}
                >
                  {showLlmKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Default Model</Label>
              <Select
                value={llm.defaultModel}
                onValueChange={(v) => v && setLlm({ ...llm, defaultModel: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {llm.availableModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>
                Temperature:{" "}
                <span className="font-mono">{llm.temperature}</span>
              </Label>
              <Slider
                value={[llm.temperature]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={(val) => setLlm({ ...llm, temperature: Array.isArray(val) ? val[0] : val })}
              />
              <p className="text-xs text-muted-foreground">
                Lower values produce more consistent, deterministic results.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="llm-tokens">Max Tokens</Label>
              <Input
                id="llm-tokens"
                type="number"
                value={llm.maxTokens}
                onChange={(e) =>
                  setLlm({ ...llm, maxTokens: Number(e.target.value) })
                }
              />
            </div>

            <Separator />

            <Button onClick={handleLlmSave} disabled={llmSaving}>
              {llmSaving && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save LLM Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Soniox Config */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            <div>
              <CardTitle>Soniox Transcription</CardTitle>
              <CardDescription>
                Speech-to-text engine configuration.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-xl">
            <div className="space-y-1.5">
              <Label htmlFor="soniox-key">Soniox API Key</Label>
              <div className="relative">
                <Input
                  id="soniox-key"
                  type={showSonioxKey ? "text" : "password"}
                  value={soniox.apiKey}
                  onChange={(e) =>
                    setSoniox({ ...soniox, apiKey: e.target.value })
                  }
                  placeholder="Enter Soniox API key"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  className="absolute right-0 top-0"
                  onClick={() => setShowSonioxKey(!showSonioxKey)}
                >
                  {showSonioxKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="soniox-lang">Language</Label>
                <Input
                  id="soniox-lang"
                  value={soniox.language}
                  onChange={(e) =>
                    setSoniox({ ...soniox, language: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="soniox-model">Model</Label>
                <Input
                  id="soniox-model"
                  value={soniox.model}
                  onChange={(e) =>
                    setSoniox({ ...soniox, model: e.target.value })
                  }
                />
              </div>
            </div>

            <Separator />

            <Button onClick={handleSonioxSave} disabled={sonioxSaving}>
              {sonioxSaving && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Soniox Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Custom Vocabulary */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            <div>
              <CardTitle>Custom Vocabulary</CardTitle>
              <CardDescription>
                Add industry-specific Romanian terminology, product names, or
                financial jargon for improved transcription accuracy.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-xl">
            <div className="flex gap-2">
              <Input
                value={vocabInput}
                onChange={(e) => setVocabInput(e.target.value)}
                placeholder="Add a term..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addVocabWord();
                  }
                }}
              />
              <Button variant="outline" onClick={addVocabWord}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {vocab.map((word) => (
                <Badge key={word} variant="secondary" className="gap-1 pr-1">
                  {word}
                  <button
                    onClick={() => removeVocabWord(word)}
                    className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              {vocab.length} term(s) configured. Press Enter or click Add to
              include a new term.
            </p>

            <Separator />

            <Button onClick={handleVocabSave} disabled={vocabSaving}>
              {vocabSaving && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Vocabulary
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Call Context */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <div>
              <CardTitle>Context</CardTitle>
              <CardDescription>
                Provide free-text context about the nature of these calls — e.g., product lines, common issues, business rules, or agent workflows. This context is injected into every analysis prompt.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-xl">
            <Textarea
              rows={8}
              value={callContext}
              onChange={(e) => setCallContext(e.target.value)}
              placeholder={`Example:\nThis is a Romanian telecom customer support center. Agents handle billing disputes, plan changes, roaming activations, and technical support. All calls are conducted in Romanian. Agents must follow GDPR data processing consent procedures before accessing any account data.`}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              This text will be included in the LLM analysis prompt to improve accuracy and relevance of QA assessments.
            </p>

            <Separator />

            <Button onClick={handleContextSave} disabled={contextSaving}>
              {contextSaving && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Context
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
