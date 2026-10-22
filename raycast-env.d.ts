/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Default View - Browse rendered symbols in a grid or use a compact list with details. */
  "viewMode": "grid" | "list",
  /** Math Delimiters - Wrap math snippets when pasting. Text, complete environments, and package snippets keep their own formatting. */
  "mathMode": "raw" | "inline" | "display",
  /** Recent Picks - Keep up to 30 recent picks in Raycast's local storage. */
  "rememberUsage": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search-latex` command */
  export type SearchLatex = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search-latex` command */
  export type SearchLatex = {}
}

