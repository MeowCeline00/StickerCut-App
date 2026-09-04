import { StyleSheet } from "react-native";

import { Colors } from "@/constants/colors";

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,

    backgroundColor: Colors.background,
  },

  container: {
    flex: 1,

    paddingHorizontal: 20,
  },

  header: {
    flexDirection: "row",

    alignItems: "center",

    paddingTop: 12,
  },

  backButton: {
    width: 42,
    height: 42,

    borderRadius: 10,

    borderWidth: 1,

    borderColor: Colors.border,

    justifyContent: "center",

    alignItems: "center",

    marginRight: 14,
  },

  backText: {
    color: Colors.textSecondary,

    fontSize: 34,

    marginTop: -4,
  },

  headerCode: {
    color: Colors.accent,

    fontSize: 10,

    fontWeight: "700",

    letterSpacing: 2,
  },

  title: {
    color: Colors.text,

    fontSize: 24,

    fontWeight: "700",

    marginTop: 3,
  },

  content: {
    flex: 1,

    alignItems: "center",

    justifyContent: "center",
  },

  label: {
    color: Colors.accent,

    fontSize: 10,

    fontWeight: "700",

    letterSpacing: 2,
  },

  description: {
    color: Colors.textSecondary,

    marginTop: 8,

    textAlign: "center",

    lineHeight: 20,

    maxWidth: 300,
  },

  previewSheet: {
    width: 235,

    height: 335,

    marginTop: 28,

    backgroundColor: Colors.white,

    borderWidth: 1,

    borderColor: Colors.borderBright,

    alignItems: "center",

    justifyContent: "center",
  },

  previewText: {
    color: "#83909A",

    fontSize: 10,

    fontWeight: "700",

    letterSpacing: 1.5,
  },

  warning: {
    color: Colors.textMuted,

    fontSize: 10,

    textAlign: "center",

    lineHeight: 16,

    maxWidth: 300,

    marginTop: 24,
  },
});
