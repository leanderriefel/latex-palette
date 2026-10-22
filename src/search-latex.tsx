import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Grid,
  Icon,
  Keyboard,
  List,
  Toast,
  environment,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { CATEGORIES, byId, catalog, formatLatex, packageSnippet, type LatexEntry, type MathMode } from "./lib/catalog";
import { useLibrary } from "./lib/library";
import { searchCatalog } from "./lib/search";

interface AppPreferences {
  viewMode: "grid" | "list";
  mathMode: MathMode;
  rememberUsage: boolean;
}

const shortcuts = {
  favorite: { macOS: { modifiers: ["cmd", "shift"], key: "f" }, Windows: { modifiers: ["ctrl", "shift"], key: "f" } },
  details: { macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } },
  view: { macOS: { modifiers: ["cmd", "shift"], key: "l" }, Windows: { modifiers: ["ctrl", "shift"], key: "l" } },
} satisfies Record<string, Keyboard.Shortcut>;

function imageSource(entry: LatexEntry) {
  return { source: { light: `previews/${entry.id}.png`, dark: `previews/${entry.id}@dark.png` } };
}

function codeFence(value: string) {
  return `\`\`\`latex\n${value}\n\`\`\``;
}

function detailMarkdown(entry: LatexEntry) {
  const suffix = environment.appearance === "dark" ? "@dark" : "";
  const preview = pathToFileURL(join(environment.assetsPath, "previews", `${entry.id}${suffix}.png`)).href;
  return [
    `![${entry.title}](${preview})`,
    `# ${entry.title}`,
    entry.description,
    "## LaTeX",
    codeFence(entry.latex),
    entry.packages.length
      ? `## Required packages\n\nAdd to your document's preamble:\n\n${codeFence(packageSnippet(entry))}`
      : "Uses base LaTeX.",
    entry.packages.includes("unicode-math") ? "Requires LuaLaTeX or XeLaTeX." : "",
    entry.mode === "math"
      ? "Insert inside a math environment, or choose an action with math delimiters."
      : "Paste this template and replace its example content.",
    `## Also searchable as\n\n${entry.keywords.join(" · ")}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

interface EntryActionsProps {
  entry: LatexEntry;
  mathMode: MathMode;
  favorite: boolean;
  onFavorite: () => Promise<void>;
  onUse: () => Promise<void>;
  onToggleView: () => void;
  viewMode: "grid" | "list";
  inDetail?: boolean;
}

function EntryActions(props: EntryActionsProps) {
  const { entry, mathMode, favorite, onFavorite, onUse, onToggleView, viewMode, inDetail } = props;
  async function paste(mode: MathMode) {
    try {
      // Save before paste: Raycast dismisses the extension after pasting into the previous app.
      await onUse();
      await Clipboard.paste(formatLatex(entry, mode));
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not paste LaTeX",
        message: error instanceof Error ? error.message : "Try Copy LaTeX from Actions.",
      });
    }
  }
  return (
    <ActionPanel title={entry.title}>
      <ActionPanel.Section>
        <Action title="Paste LaTeX" icon={Icon.Clipboard} onAction={() => paste(mathMode)} />
        <Action.CopyToClipboard
          title="Copy LaTeX"
          content={formatLatex(entry, mathMode)}
          shortcut={Keyboard.Shortcut.Common.Copy}
          onCopy={() => void onUse()}
        />
        {!inDetail && (
          <Action.Push
            title="Show Details"
            icon={Icon.Info}
            shortcut={shortcuts.details}
            target={<Detail markdown={detailMarkdown(entry)} actions={<EntryActions {...props} inDetail />} />}
          />
        )}
        <Action
          title={favorite ? "Remove from Favorites" : "Add to Favorites"}
          icon={favorite ? Icon.StarDisabled : Icon.Star}
          shortcut={shortcuts.favorite}
          onAction={onFavorite}
        />
      </ActionPanel.Section>
      {entry.mode === "math" && (
        <ActionPanel.Section title="Math Delimiters">
          {mathMode !== "raw" && (
            <Action title="Paste Without Delimiters" icon={Icon.Code} onAction={() => paste("raw")} />
          )}
          {mathMode !== "inline" && (
            <Action title="Paste as Inline Math" icon={Icon.Code} onAction={() => paste("inline")} />
          )}
          {mathMode !== "display" && (
            <Action title="Paste as Display Math" icon={Icon.CodeBlock} onAction={() => paste("display")} />
          )}
        </ActionPanel.Section>
      )}
      {entry.packages.length > 0 && (
        <ActionPanel.Section title="Required Packages">
          <Action.CopyToClipboard title="Copy Package Imports" content={packageSnippet(entry)} />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        {!inDetail && (
          <Action
            title={viewMode === "grid" ? "Switch to List View" : "Switch to Grid View"}
            icon={viewMode === "grid" ? Icon.List : Icon.AppWindowGrid2x2}
            shortcut={shortcuts.view}
            onAction={onToggleView}
          />
        )}
        <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

interface Section {
  title: string;
  subtitle?: string;
  entries: LatexEntry[];
}

export default function SearchLatex() {
  const preferences = getPreferenceValues<AppPreferences>();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState(preferences.viewMode ?? "grid");
  const library = useLibrary(preferences.rememberUsage !== false);

  const sections = useMemo((): Section[] => {
    const allowed = (entry: LatexEntry) =>
      filter === "all" ||
      (filter === "favorites"
        ? library.favorites.includes(entry.id)
        : filter === "recent"
          ? library.recent.includes(entry.id)
          : entry.category === filter);
    if (query.trim()) {
      const results = searchCatalog(query).filter(({ entry }) => allowed(entry));
      return [
        { title: "Best Matches", entries: results.filter((result) => !result.related).map(({ entry }) => entry) },
        {
          title: "Related",
          subtitle: "Nearby concepts and alternatives",
          entries: results.filter((result) => result.related).map(({ entry }) => entry),
        },
      ].filter((section) => section.entries.length);
    }
    if (filter === "favorites" || filter === "recent") {
      const ids = filter === "favorites" ? library.favorites : library.recent;
      return [
        {
          title: filter === "favorites" ? "Favorites" : "Recent Picks",
          entries: ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])),
        },
      ];
    }
    const seen = new Set<string>();
    const take = (entries: LatexEntry[]) =>
      entries.filter((entry) => {
        if (!allowed(entry) || seen.has(entry.id)) return false;
        seen.add(entry.id);
        return true;
      });
    const selected: Section[] = [];
    if (filter === "all") {
      selected.push({
        title: "Favorites",
        entries: take(library.favorites.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []))),
      });
      selected.push({
        title: "Recently Used",
        entries: take(library.recent.slice(0, 10).flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []))),
      });
      selected.push({
        title: "Popular",
        subtitle: "A few everyday essentials",
        entries: take(catalog.filter((entry) => entry.popular)),
      });
    }
    for (const category of CATEGORIES)
      selected.push({ title: category, entries: take(catalog.filter((entry) => entry.category === category)) });
    return selected.filter((section) => section.entries.length);
  }, [query, filter, library.favorites, library.recent]);

  const count = sections.reduce((total, section) => total + section.entries.length, 0);
  const commonProps = {
    navigationTitle: `LaTeX Palette · ${count} ${query ? "results" : "entries"}`,
    searchBarPlaceholder: 'Try "less than or equal", "upside down A", "matrix", or \\alpha…',
    searchText: query,
    onSearchTextChange: setQuery,
    filtering: false,
    isLoading: library.isLoading,
    throttle: false,
  };
  const filterOptions = [
    { value: "all", title: "All LaTeX" },
    { value: "favorites", title: "Favorites" },
    { value: "recent", title: "Recent Picks" },
    ...CATEGORIES.map((category) => ({ value: category, title: category })),
  ];
  const emptyTitle =
    filter === "favorites" && !query
      ? "Your favorites go here"
      : filter === "recent" && !query
        ? "Your recent picks go here"
        : "No matching LaTeX yet";
  const emptyDescription =
    filter === "favorites" && !query
      ? "Choose an entry and use Add to Favorites in Actions."
      : filter === "recent" && !query
        ? "Paste or copy an entry to keep it handy here."
        : 'Try a simpler description, like "arrow", "fraction", or "chemical formula". Check the category filter too.';

  function actions(entry: LatexEntry) {
    return (
      <EntryActions
        entry={entry}
        mathMode={preferences.mathMode ?? "raw"}
        favorite={library.favorites.includes(entry.id)}
        onFavorite={() => library.toggleFavorite(entry.id)}
        onUse={() => library.recordUse(entry.id)}
        onToggleView={() => setViewMode((value) => (value === "grid" ? "list" : "grid"))}
        viewMode={viewMode}
      />
    );
  }

  if (viewMode === "list") {
    return (
      <List
        {...commonProps}
        isShowingDetail
        searchBarAccessory={
          <List.Dropdown tooltip="Filter LaTeX" value={filter} onChange={setFilter}>
            {filterOptions.map((option) => (
              <List.Dropdown.Item key={option.value} {...option} />
            ))}
          </List.Dropdown>
        }
      >
        <List.EmptyView title={emptyTitle} description={emptyDescription} icon={Icon.MagnifyingGlass} />
        {sections.map((section) => (
          <List.Section
            key={section.title}
            title={section.title}
            subtitle={section.subtitle ?? `${section.entries.length}`}
          >
            {section.entries.map((entry) => (
              <List.Item
                key={entry.id}
                id={entry.id}
                title={entry.title}
                icon={imageSource(entry)}
                accessories={library.favorites.includes(entry.id) ? [{ icon: Icon.Star, tooltip: "Favorite" }] : []}
                detail={<List.Item.Detail markdown={detailMarkdown(entry)} />}
                actions={actions(entry)}
              />
            ))}
          </List.Section>
        ))}
      </List>
    );
  }

  return (
    <Grid
      {...commonProps}
      columns={5}
      aspectRatio="4/3"
      inset={Grid.Inset.Small}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter LaTeX" value={filter} onChange={setFilter}>
          {filterOptions.map((option) => (
            <Grid.Dropdown.Item key={option.value} {...option} />
          ))}
        </Grid.Dropdown>
      }
    >
      <Grid.EmptyView title={emptyTitle} description={emptyDescription} icon={Icon.MagnifyingGlass} />
      {sections.map((section) => (
        <Grid.Section
          key={section.title}
          title={section.title}
          subtitle={section.subtitle ?? `${section.entries.length}`}
        >
          {section.entries.map((entry) => (
            <Grid.Item
              key={entry.id}
              id={entry.id}
              content={imageSource(entry)}
              title={`${library.favorites.includes(entry.id) ? "★ " : ""}${entry.title}`}
              subtitle={entry.latex.replace(/\s+/g, " ")}
              actions={actions(entry)}
            />
          ))}
        </Grid.Section>
      ))}
    </Grid>
  );
}
