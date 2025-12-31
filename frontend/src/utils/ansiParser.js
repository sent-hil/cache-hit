import Convert from "ansi-to-html";

const convert = new Convert({
  fg: "#e6edf3",
  bg: "#0d1117",
  newline: true,
  escapeXML: true,
  stream: false,
  colors: {
    0: "#0d1117", // black
    1: "#ff7b72", // red
    2: "#3fb950", // green
    3: "#d29922", // yellow
    4: "#58a6ff", // blue
    5: "#bc8cff", // magenta
    6: "#39c5cf", // cyan
    7: "#e6edf3", // white
  },
});

export const parseAnsi = (text) => {
  if (!text) return "";

  const html = convert.toHtml(text);

  // If no HTML tags were added (plain text), wrap it with proper styling
  if (!html.includes("<")) {
    return `<span style="color: #e6edf3;">${html}</span>`;
  }

  return html;
};
