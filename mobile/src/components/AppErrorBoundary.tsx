import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import { color } from "../theme";

/** Keep a render failure from unmounting the entire application in release. */
export default class AppErrorBoundary extends React.Component<{
  children: React.ReactNode;
  routeName?: string;
}, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Component names identify the failing renderer. Never send error.message,
    // props, route parameters, questions, answers, or screenshots.
    const components = (info.componentStack ?? "")
      .split("\n")
      .map((line) => /^\s+(?:at|in) ([A-Za-z][A-Za-z0-9_]{0,79})(?:\s|$)/.exec(line)?.[1])
      .filter((name): name is string => !!name)
      .slice(0, 20);
    void api.reportClientError({
      route: this.props.routeName ?? "App",
      error_type: /^(Error|TypeError|RangeError|ReferenceError|SyntaxError)$/.test(error.name)
        ? error.name : "Error",
      components,
    }).catch(() => {});
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={styles.page} accessibilityRole="alert">
        <Text style={styles.title}>This screen couldn't open.</Text>
        <Text style={styles.text}>Return home and try again.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Return home"
          style={styles.button}
          onPress={() => this.setState({ failed: false })}
        >
          <Text style={styles.buttonText}>Return home</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 16, backgroundColor: color.bg },
  title: { fontSize: 20, fontWeight: "700", color: color.ink, textAlign: "center" },
  text: { fontSize: 16, color: color.ink, textAlign: "center" },
  button: { minHeight: 48, paddingHorizontal: 24, justifyContent: "center", borderRadius: 24, backgroundColor: color.saffronBtn },
  buttonText: { fontSize: 16, fontWeight: "700", color: color.white },
});
