// Render the navigation frame and reader with native dependencies stubbed.
// This catches missing protection in game states and controls covering pages.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const element = (type, props, ...children) => ({ type, props: props ?? {}, children: children.flat().filter(Boolean) });
const React = { createElement: element, useEffect() {}, useCallback: f => f, useMemo: f => f(), useState: v => [v, () => {}] };
const native = { StyleSheet: { create: v => v }, View: "View", ScrollView: "ScrollView", Text: "Text", Pressable: "Pressable", Modal: "Modal", useWindowDimensions: () => ({ width: 390, height: 844 }) };
const theme = { color: {}, font: { sizes: {} }, radius: {}, space: {}, shadow: {}, script: () => ({}), isDarkScheme: () => false };
function load(file, overrides = {}, extra = "") {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8") + extra, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const req = spec => overrides[spec] ?? (spec === "react" ? React : spec === "react-native" ? native : spec.endsWith("/theme") ? theme : { default: spec, __esModule: true });
  new Function("require", "module", "exports", code)(req, module, module.exports);
  return module.exports;
}

const app = load("App.tsx", {
  "@react-navigation/native": { DarkTheme: { colors: {} }, DefaultTheme: { colors: {} } },
  "@react-navigation/native-stack": { createNativeStackNavigator: () => ({ Navigator: "Stack", Screen: "Screen" }) },
  "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
  "./src/store/auth": { useAuth: () => ({ loading: false, onboarded: true }) },
}, "\nexports.rootNavigator = RootNavigator;");
const navigator = app.rootNavigator();
const layout = navigator.props.screenLayout;
for (const name of ["Smriti", "ShabdaRush", "VarnaJaal", "PracticeRound"]) {
  for (const state of ["setup", "loading", "playing", "results"]) {
    const child = element(state);
    const framed = layout({ route: { name }, options: { headerShown: false }, children: child });
    assert.equal(framed.type, "SafeAreaView");
    assert.deepEqual(framed.props.edges, ["top", "bottom", "left", "right"]);
    assert.equal(framed.children[0], child);
  }
}
for (const screen of navigator.children) {
  const name = screen.props.name;
  const framed = layout({ route: { name }, options: screen.props.options ?? {}, children: element("content") });
  if (framed.type === "SafeAreaView") {
    assert.ok(framed.props.edges.includes("bottom"), `${name} needs bottom protection`);
    if (screen.props.options?.headerShown !== false) assert.ok(!framed.props.edges.includes("top"), `${name} must not duplicate its native header inset`);
  } else if (name !== "MainTabs") {
    const component = screen.props.component;
    const file = component?.replace(/^\.\//, "") + ".tsx";
    assert.ok(fs.existsSync(path.join(root, file)), `Resolve ${name}'s component`);
    const source = fs.readFileSync(path.join(root, file), "utf8");
    if (source.includes('<CardLessonScreen')) {
      assert.match(fs.readFileSync(path.join(root, 'src/screens/LearnV2Lesson.tsx'), 'utf8'), /SafeAreaView/, `${name}'s shared card player owns safe areas`);
    } else if (source.includes('<ScreenHeader')) {
      // The Group* family delegates its top inset to the shared bar; keep that
      // delegation honest instead of demanding a second owner in each screen.
      assert.match(fs.readFileSync(path.join(root, 'src/community/parts.tsx'), 'utf8'), /useSafeAreaInsets/, `${name}'s shared header owns the status-bar inset`);
    } else assert.match(source, /SafeAreaView|useSafeAreaInsets/, `${name} has no safe-area owner`);
  }
}
const game = load("src/games/GameShell.tsx").default({ title: "Smriti", progress: 0, progressLabel: "0 of 8 pairs", score: 0, children: element("cards") });
assert.equal(game.children.at(-1).type, "ScrollView", "A short screen must scroll the game body while keeping Close visible");
assert.equal(game.children.at(-1).props.contentContainerStyle.flexGrow, 1);

const readerTheme = load("src/screens/readerTheme.ts");
// The reader's appearance hook would run useState/useEffect of its own; the check
// pins the documented defaults instead, keeping the first-useState slot for `controls`.
const readingAppearance = load("src/services/readingAppearance.ts", {
  "@react-native-async-storage/async-storage": { __esModule: true, default: { getItem: async () => null, setItem: async () => {} } },
});
const verse = { id: "v1", source_ref: "Gītā 1.1", devanagari: "धर्मक्षेत्रे", word_breakdown: [] };
const flattenStyle = style => Object.assign({}, ...(Array.isArray(style) ? style : [style]).filter(Boolean));
for (const insets of [{ top: 0, bottom: 0, left: 0, right: 0 }, { top: 48, bottom: 24, left: 0, right: 0 }, { top: 59, bottom: 34, left: 12, right: 12 }]) {
  for (const mode of ["read", "chant"]) for (const controls of [false, true]) {
    let stateIndex = 0;
    const Book = load("src/screens/Book.tsx", {
      react: { ...React, useState: initial => [stateIndex++ === 0 ? controls : initial, () => {}] },
      "@react-navigation/native": { useIsFocused: () => true },
      "react-native-safe-area-context": { useSafeAreaInsets: () => insets },
      "react-native-gesture-handler": { Gesture: { Tap: () => ({ onEnd() { return this; } }) } },
      "../hooks/useBookPages": { useBookPages: () => ({ pages: [verse], title: "Gītā", chapters: [], pagedChapter: null }) },
      "../hooks/useBookActivity": { useBookActivity: () => ({}) },
      "../hooks/useChant": { useChant: () => ({ at: 0, verse, hasChant: true }) },
      "../hooks/useReducedMotion": { useReducedMotion: () => true },
      "../hooks/useTypeScale": { useTypeScale: () => ({ sized: n => n }) },
      "../ask/AskProvider": { useAsk: () => ({}) },
      // Copy rewriting is not what this check is about; plain() only needs to return text.
      "../utils/text": { plain: t => t ?? "" },
      "./readerTheme": readerTheme,
      "../services/readingAppearance": {
        useReadingAppearance: () => ({ appearance: readingAppearance.DEFAULT_READING_APPEARANCE, updateAppearance: () => {} }),
      },
    }, "\nexports.BookReader = BookReader;").BookReader;
    const page = Book({ navigation: {}, route: { params: { bookKey: "gita", mode, index: 0 } } });
    const style = flattenStyle(page.props.style);
    for (const edge of ["top", "bottom", "left", "right"]) assert.equal(style[`padding${edge[0].toUpperCase() + edge.slice(1)}`], insets[edge]);
    const contentAt = page.children.findIndex(c => /ChantList|PageCurlBook/.test(c.type));
    assert.ok(contentAt >= 0);
    if (controls) {
      assert.ok(page.children.some(c => c.type === "View" && flattenStyle(c.props.style).top === 0), "Header must be present when controls are enabled");
    }
    if (mode === "chant") {
      const playerWrap = page.children.find(c => c.type === "View" && flattenStyle(c.props.style).borderTopColor !== undefined);
      assert.ok(playerWrap, "Chant player must be present");
      assert.notEqual(flattenStyle(playerWrap.props.style).position, "absolute", "Footer/player must reserve space below the page");
    }
  }
}
console.log("Screen layout: route coverage, game states, scrolling, and 12 reader inset/control combinations passed.");
