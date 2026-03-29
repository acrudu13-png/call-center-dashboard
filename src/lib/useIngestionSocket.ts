"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { IngestionRun, LogEntry, Job } from "@/lib/api";
import { WS_URL } from "@/lib/config";
const RECONNECT_DELAY = 2000;

export interface IngestionSocketState {
  /** Latest ingestion run progress (updated in real time) */
  run: IngestionRun | null;
  /** Most recent log entries (newest first, capped at 200) */
  logs: LogEntry[];
  /** Job updates keyed by jobId */
  jobs: Map<string, Job>;
  /** WebSocket connection status */
  connected: boolean;
}

type Listener = (state: IngestionSocketState) => void;

/**
 * Singleton WebSocket connection shared across all components.
 * Pushes ingestion_progress, log, and job_update events from the backend.
 */
class IngestionSocket {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private state: IngestionSocketState = {
    run: null,
    logs: [],
    jobs: new Map(),
    connected: false,
  };
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private mounted = 0;

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    this.mounted++;
    if (this.mounted === 1) this.connect();
    // Send current state immediately
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
      this.mounted--;
      if (this.mounted === 0) this.disconnect();
    };
  }

  private notify() {
    for (const l of this.listeners) l(this.state);
  }

  private connect() {
    if (this.ws) return;
    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        this.state = { ...this.state, connected: true };
        this.notify();
      };

      this.ws.onclose = () => {
        this.ws = null;
        this.state = { ...this.state, connected: false };
        this.notify();
        // Auto-reconnect
        if (this.mounted > 0) {
          this.reconnectTimer = setTimeout(() => this.connect(), RECONNECT_DELAY);
        }
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch {
          // ignore malformed messages
        }
      };
    } catch {
      // WebSocket constructor can throw
      this.reconnectTimer = setTimeout(() => this.connect(), RECONNECT_DELAY);
    }
  }

  private disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null; // prevent reconnect
      this.ws.close();
      this.ws = null;
    }
    this.state = { ...this.state, connected: false };
  }

  private handleMessage(data: Record<string, unknown>) {
    const type = data.type as string;

    if (type === "ingestion_progress") {
      const run: IngestionRun = {
        runId: data.runId as string,
        source: data.source as string,
        status: data.status as IngestionRun["status"],  // includes "stopped"
        remotePath: data.remotePath as string | undefined,
        totalFiles: data.totalFiles as number,
        downloadedFiles: data.downloadedFiles as number,
        processedFiles: data.processedFiles as number,
        failedFiles: data.failedFiles as number,
        currentFile: data.currentFile as string | undefined,
        errorMessage: data.errorMessage as string | undefined,
        startedAt: data.startedAt as string | undefined,
        completedAt: data.completedAt as string | undefined,
      };
      this.state = { ...this.state, run };
      this.notify();
    }

    if (type === "log") {
      const entry: LogEntry = {
        id: Date.now(),
        timestamp: data.timestamp as string,
        level: data.level as string,
        source: data.source as string,
        message: data.message as string,
        jobId: data.jobId as string | undefined,
      };
      this.state = {
        ...this.state,
        logs: [entry, ...this.state.logs].slice(0, 200),
      };
      this.notify();
    }

    if (type === "job_update") {
      const job: Job = {
        jobId: data.jobId as string,
        fileName: data.fileName as string,
        source: data.source as string,
        status: data.status as string,
        progress: data.progress as number,
        callId: data.callId as string | undefined,
        errorMessage: data.errorMessage as string | undefined,
        metadata: {},
        startedAt: data.startedAt as string | undefined,
        completedAt: data.completedAt as string | undefined,
        createdAt: data.startedAt as string || new Date().toISOString(),
      };
      const newJobs = new Map(this.state.jobs);
      newJobs.set(job.jobId, job);
      this.state = { ...this.state, jobs: newJobs };
      this.notify();
    }
  }
}

// Singleton
const socket = new IngestionSocket();

/**
 * React hook — subscribe to live ingestion events.
 * Replaces polling on both Dashboard and Logs pages.
 */
export function useIngestionSocket(): IngestionSocketState {
  const [state, setState] = useState<IngestionSocketState>({
    run: null,
    logs: [],
    jobs: new Map(),
    connected: false,
  });

  useEffect(() => {
    return socket.subscribe(setState);
  }, []);

  return state;
}
