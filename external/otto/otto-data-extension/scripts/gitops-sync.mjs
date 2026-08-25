#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const mempalaceDir = path.join(repoRoot, "mempalace");

fs.mkdirSync(mempalaceDir, { recursive: true });

const rooms = {
  schemaVersion: "1.0.0",
  rooms: [
    {
      name: "data-blob-index",
      path: "mempalace/data-blob-index.json",
      purpose: "Latest data blob transfer snapshot for the data extension."
    },
    {
      name: "data-generation-history",
      path: "mempalace/data-generation-history.json",
      purpose: "Historical data transfer snapshots captured during rescans."
    },
    {
      name: "data-rescan-events",
      path: "mempalace/data-rescan-events.json",
      purpose: "Data rescan trigger log."
    }
  ]
};

const registryEntry = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  extensions: [
    {
      id: "otto.data.extension",
      name: "Otto Data Extension",
      repository: "otto-extensions/otto-data-extension",
      manifest: "manifests/extension.json",
      agentInstruction: "agents/OttoDataExtensionAgent.md",
      mempalaceRooms: [
        "data-blob-index",
        "data-generation-history",
        "data-rescan-events"
      ]
    }
  ]
};

fs.writeFileSync(path.join(mempalaceDir, "rooms.json"), `${JSON.stringify(rooms, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(repoRoot, "registry", "extension-registry.json"), `${JSON.stringify(registryEntry, null, 2)}\n`, "utf8");

const report = {
  generatedAt: new Date().toISOString(),
  repository: "otto-extensions/otto-data-extension",
  roomsWritten: [
    "mempalace/rooms.json",
    "mempalace/data-blob-index.json",
    "mempalace/data-generation-history.json",
    "mempalace/data-rescan-events.json"
  ],
  registryUpdated: true
};

console.log(JSON.stringify(report, null, 2));
