import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { FONTS, RADIUS } from "../config/theme";

/**
 * Defensive cleaner to strip any accidental raw JSON wrappers
 * (e.g. {"summary": "..."}) before rendering.
 */
export function cleanRawMarkdown(text) {
  if (!text) return "";
  let clean = String(text);

  // If text looks like a JSON object containing "summary"
  const trimmed = clean.trim();
  if (trimmed.startsWith("{") && trimmed.includes('"summary"')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.summary) return parsed.summary;
    } catch {
      // Streamed partial JSON: extract whatever has been generated inside the summary string
      const match = trimmed.match(/"summary"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)/);
      if (match && match[1]) {
        return match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
      }
    }
  }

  // Strip code fences if wrapping pure JSON
  if (trimmed.startsWith("```json") && trimmed.includes('"summary"')) {
    const unquoted = trimmed.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    try {
      const parsed = JSON.parse(unquoted);
      if (parsed.summary) return parsed.summary;
    } catch {}
  }

  return clean;
}

/**
 * Parses inline formatting: **bold**, *italic*, `code`, and [1] citations.
 */
function renderInlineFormatted(text, themeColors, onCitationPress, isStreamingLast = false) {
  if (!text) return null;

  // Split tokens for bold, italic, code, and citations [N]
  // Pattern matches:
  // 1. Citations: \[\d+(?:,\s*\d+)*\]
  // 2. Bold: \*\*(.+?)\*\*
  // 3. Italic: \*([^*]+)\*
  // 4. Code: `([^`]+)`
  const regex = /(\[\d+(?:,\s*\d+)*\]|\*\*.+?\*\*|\*[^*]+?\*|`[^`]+?`)/g;
  const parts = text.split(regex);

  return (
    <Text style={[FONTS.uiBody, { fontSize: 15, color: themeColors.ink, lineHeight: 24 }]}>
      {parts.map((part, index) => {
        if (!part) return null;

        // Check for citation [1] or [1, 2]
        const citationMatch = part.match(/^\[(\d+(?:,\s*\d+)*)\]$/);
        if (citationMatch) {
          const numbers = citationMatch[1].split(",").map((n) => parseInt(n.trim(), 10));
          return (
            <Text key={index}>
              {" "}
              {numbers.map((num, nIdx) => (
                <Text
                  key={nIdx}
                  onPress={() => onCitationPress && onCitationPress(num)}
                  style={[
                    FONTS.monoBold,
                    {
                      fontSize: 11,
                      color: themeColors.primary,
                      backgroundColor: `${themeColors.primary}18`,
                      lineHeight: 20,
                    },
                  ]}
                >
                  [{num}]
                  {nIdx < numbers.length - 1 ? " " : ""}
                </Text>
              ))}
              {" "}
            </Text>
          );
        }

        // Bold
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return (
            <Text key={index} style={[FONTS.uiBodyBold, { color: themeColors.ink, fontWeight: "700" }]}>
              {part.slice(2, -2)}
            </Text>
          );
        }

        // Italic
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
          return (
            <Text key={index} style={{ fontStyle: "italic", color: themeColors.inkSoft }}>
              {part.slice(1, -1)}
            </Text>
          );
        }

        // Inline code
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          return (
            <Text
              key={index}
              style={[
                FONTS.mono,
                {
                  fontSize: 13,
                  color: themeColors.primary,
                  backgroundColor: `${themeColors.line}40`,
                },
              ]}
            >
              {" "}{part.slice(1, -1)}{" "}
            </Text>
          );
        }

        return <Text key={index}>{part}</Text>;
      })}
      {isStreamingLast && (
        <Text style={{ color: themeColors.primary, fontWeight: "700" }}> ▍</Text>
      )}
    </Text>
  );
}

/**
 * Parses markdown table lines into headers and rows
 */
function parseTable(lines) {
  const cleanLines = lines.map((l) => l.trim()).filter((l) => l.startsWith("|") && l.endsWith("|"));
  if (cleanLines.length < 2) return null;

  const parseRow = (line) =>
    line
      .slice(1, -1)
      .split("|")
      .map((c) => c.trim());

  const headers = parseRow(cleanLines[0]);
  // Check if second line is separator like |---|---|
  const isSeparator = /^\|?(\s*:?-+:?\s*\|?)+$/.test(cleanLines[1]);
  const rowStart = isSeparator ? 2 : 1;
  const rows = cleanLines.slice(rowStart).map(parseRow);

  return { headers, rows };
}

/**
 * Reusable Markdown and Table Renderer component
 */
const MarkdownRenderer = ({
  content = "",
  sources = [],
  onCitationPress,
  isStreaming = false,
}) => {
  const { themeColors } = useTheme();

  const cleanedText = cleanRawMarkdown(content);
  if (!cleanedText.trim() && !isStreaming) {
    return null;
  }

  // Split lines and group blocks
  const rawLines = cleanedText.split("\n");
  const blocks = [];
  let tableBuffer = [];
  let inCodeBlock = false;
  let codeBuffer = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // Code block toggle
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        blocks.push({ type: "code", content: codeBuffer.join("\n") });
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Markdown table rows
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      tableBuffer.push(trimmed);
      continue;
    } else if (tableBuffer.length > 0) {
      const table = parseTable(tableBuffer);
      if (table) {
        blocks.push({ type: "table", ...table });
      } else {
        blocks.push({ type: "paragraph", content: tableBuffer.join("\n") });
      }
      tableBuffer = [];
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      blocks.push({ type: "h3", content: trimmed.replace(/^###\s+/, "") });
    } else if (trimmed.startsWith("## ")) {
      blocks.push({ type: "h2", content: trimmed.replace(/^##\s+/, "") });
    } else if (trimmed.startsWith("# ")) {
      blocks.push({ type: "h1", content: trimmed.replace(/^#\s+/, "") });
    } else if (trimmed.startsWith("> ")) {
      blocks.push({ type: "quote", content: trimmed.replace(/^>\s+/, "") });
    } else if (/^[-*]\s+/.test(trimmed)) {
      blocks.push({ type: "bullet", content: trimmed.replace(/^[-*]\s+/, "") });
    } else if (/^\d+\.\s+/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s+(.*)/);
      blocks.push({ type: "numbered", num: match ? match[1] : "•", content: match ? match[2] : trimmed });
    } else if (trimmed === "") {
      blocks.push({ type: "spacer" });
    } else {
      blocks.push({ type: "paragraph", content: line });
    }
  }

  // Flush remaining buffers
  if (inCodeBlock && codeBuffer.length > 0) {
    blocks.push({ type: "code", content: codeBuffer.join("\n") });
  }
  if (tableBuffer.length > 0) {
    const table = parseTable(tableBuffer);
    if (table) {
      blocks.push({ type: "table", ...table });
    } else {
      blocks.push({ type: "paragraph", content: tableBuffer.join("\n") });
    }
  }

  return (
    <View style={styles.container}>
      {blocks.map((block, index) => {
        const isLastBlock = index === blocks.length - 1;

        switch (block.type) {
          case "h1":
            return (
              <Text
                key={index}
                style={[
                  FONTS.uiBodyBold,
                  { fontSize: 18, color: themeColors.ink, marginTop: 12, marginBottom: 4 },
                ]}
              >
                {block.content}
              </Text>
            );

          case "h2":
            return (
              <Text
                key={index}
                style={[
                  FONTS.uiBodyBold,
                  { fontSize: 16, color: themeColors.ink, marginTop: 10, marginBottom: 4 },
                ]}
              >
                {block.content}
              </Text>
            );

          case "h3":
            return (
              <Text
                key={index}
                style={[
                  FONTS.monoBold,
                  { fontSize: 13, color: themeColors.primary, marginTop: 8, marginBottom: 4, letterSpacing: 0.5 },
                ]}
              >
                {block.content}
              </Text>
            );

          case "quote":
            return (
              <View
                key={index}
                style={[
                  styles.quoteBox,
                  { borderLeftColor: themeColors.primary, backgroundColor: `${themeColors.primary}0D` },
                ]}
              >
                <Text style={[FONTS.uiBody, { fontSize: 14, color: themeColors.inkSoft, fontStyle: "italic" }]}>
                  {block.content}
                </Text>
              </View>
            );

          case "bullet":
            return (
              <View key={index} style={styles.listRow}>
                <View style={[styles.bulletDot, { backgroundColor: themeColors.primary }]} />
                <View style={{ flex: 1 }}>
                  {renderInlineFormatted(block.content, themeColors, onCitationPress, isLastBlock && isStreaming)}
                </View>
              </View>
            );

          case "numbered":
            return (
              <View key={index} style={styles.listRow}>
                <Text style={[FONTS.monoBold, { fontSize: 12, color: themeColors.primary, width: 20 }]}>
                  {block.num}.
                </Text>
                <View style={{ flex: 1 }}>
                  {renderInlineFormatted(block.content, themeColors, onCitationPress, isLastBlock && isStreaming)}
                </View>
              </View>
            );

          case "code":
            return (
              <View
                key={index}
                style={[
                  styles.codeBox,
                  { backgroundColor: themeColors.paper, borderColor: themeColors.line },
                ]}
              >
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Text style={[FONTS.mono, { fontSize: 12, color: themeColors.ink, lineHeight: 18 }]}>
                    {block.content}
                  </Text>
                </ScrollView>
              </View>
            );

          case "table":
            return (
              <View key={index} style={[styles.tableContainer, { borderColor: themeColors.line }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                  <View>
                    {/* Header Row */}
                    <View style={[styles.tableRow, { backgroundColor: `${themeColors.primary}12`, borderBottomColor: themeColors.line }]}>
                      {block.headers.map((h, hIdx) => (
                        <View key={hIdx} style={[styles.tableCell, { borderRightColor: themeColors.line }]}>
                          <Text style={[FONTS.uiBodyBold, { fontSize: 12, color: themeColors.ink }]}>
                            {h}
                          </Text>
                        </View>
                      ))}
                    </View>
                    {/* Data Rows */}
                    {block.rows.map((row, rIdx) => (
                      <View
                        key={rIdx}
                        style={[
                          styles.tableRow,
                          {
                            backgroundColor: rIdx % 2 === 1 ? `${themeColors.paper}` : themeColors.card,
                            borderBottomColor: themeColors.line,
                          },
                        ]}
                      >
                        {row.map((cell, cIdx) => (
                          <View key={cIdx} style={[styles.tableCell, { borderRightColor: themeColors.line }]}>
                            <Text style={[FONTS.uiBody, { fontSize: 12, color: themeColors.ink }]}>
                              {cell}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            );

          case "spacer":
            return <View key={index} style={{ height: 6 }} />;

          case "paragraph":
          default:
            return (
              <View key={index} style={{ marginVertical: 3 }}>
                {renderInlineFormatted(block.content, themeColors, onCitationPress, isLastBlock && isStreaming)}
              </View>
            );
        }
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 3,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: 8,
  },
  quoteBox: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 6,
    marginVertical: 6,
    borderRadius: RADIUS.sm,
  },
  codeBox: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: 10,
    marginVertical: 8,
  },
  tableContainer: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    marginVertical: 10,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tableCell: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 100,
    borderRightWidth: 1,
    justifyContent: "center",
  },
});

export default MarkdownRenderer;
