import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import MarkdownRenderer, { cleanRawMarkdown } from "../MarkdownRenderer";
import { ThemeProvider } from "../../context/ThemeContext";

describe("MarkdownRenderer & cleanRawMarkdown", () => {
  describe("cleanRawMarkdown", () => {
    it("extracts summary from raw JSON string", () => {
      const rawJSON = '{"summary": "Python is versatile.", "key_takeaways": ["Easy"]}';
      expect(cleanRawMarkdown(rawJSON)).toBe("Python is versatile.");
    });

    it("extracts summary from partial streaming JSON string", () => {
      const partialJSON = '{"summary": "Python is a popular language';
      expect(cleanRawMarkdown(partialJSON)).toBe("Python is a popular language");
    });

    it("leaves normal markdown untouched", () => {
      const normal = "# Title\n\nThis is **bold** and *italic* text.";
      expect(cleanRawMarkdown(normal)).toBe(normal);
    });
  });

  describe("Rendering markdown components", () => {
    it("renders headings and bold text", () => {
      const content = "### Overview\n\nCompareZ provides **accurate** product comparisons.";
      const { getByText } = render(
        <ThemeProvider>
          <MarkdownRenderer content={content} />
        </ThemeProvider>
      );

      expect(getByText("Overview")).toBeTruthy();
      expect(getByText("accurate")).toBeTruthy();
    });

    it("renders tables with headers and cell data", () => {
      const tableMarkdown = `
| Feature | RAM | ROM |
| --- | --- | --- |
| Type | Volatile | Non-volatile |
| Speed | Fast | Slower |
      `.trim();

      const { getByText } = render(
        <ThemeProvider>
          <MarkdownRenderer content={tableMarkdown} />
        </ThemeProvider>
      );

      expect(getByText("Feature")).toBeTruthy();
      expect(getByText("RAM")).toBeTruthy();
      expect(getByText("ROM")).toBeTruthy();
      expect(getByText("Volatile")).toBeTruthy();
      expect(getByText("Non-volatile")).toBeTruthy();
    });

    it("renders clickable citation pills and triggers callback", () => {
      const onCitationPress = jest.fn();
      const content = "Amul Full Cream milk costs ₹34 [1] while Nandini costs ₹28 [2].";
      const { getByText } = render(
        <ThemeProvider>
          <MarkdownRenderer
            content={content}
            sources={[{ number: 1, title: "Amul" }, { number: 2, title: "Nandini" }]}
            onCitationPress={onCitationPress}
          />
        </ThemeProvider>
      );

      const cite1 = getByText("[1]");
      expect(cite1).toBeTruthy();
      fireEvent.press(cite1);
      expect(onCitationPress).toHaveBeenCalledWith(1);
    });
  });
});
