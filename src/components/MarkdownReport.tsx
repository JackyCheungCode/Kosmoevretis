import { Fragment } from "react";

type MarkdownReportProps = { content: string };

function inlineMarkdown(text: string) {
  const token = /(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|`[^`]+`|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
  return text.split(token).filter(Boolean).map((part, index) => {
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("~~") && part.endsWith("~~")) return <del key={index}>{part.slice(2, -2)}</del>;
    if (part.startsWith("`") && part.endsWith("`")) return <code className="gi-md-inline-code" key={index}>{part.slice(1, -1)}</code>;
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export default function MarkdownReport({ content }: MarkdownReportProps) {
  const lines = String(content || "").replace(/\r\n?/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (/^\s*```/.test(line)) {
      const language = line.trim().slice(3).trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++]);
      if (i < lines.length) i++;
      blocks.push(<pre className="gi-md-code" key={blocks.length}><div className="gi-md-code-head">{language || "代码"}</div><code>{code.join("\n")}</code></pre>);
      continue;
    }

    const heading = line.match(/^\s*(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const children = inlineMarkdown(heading[2]);
      if (level === 1) blocks.push(<h2 key={blocks.length}>{children}</h2>);
      else if (level === 2) blocks.push(<h3 key={blocks.length}>{children}</h3>);
      else if (level === 3) blocks.push(<h4 key={blocks.length}>{children}</h4>);
      else blocks.push(<h5 key={blocks.length}>{children}</h5>);
      i++; continue;
    }

    if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
      blocks.push(<hr key={blocks.length}/>); i++; continue;
    }

    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
      const cells = (row: string) => row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(cell => cell.trim());
      const headers = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) rows.push(cells(lines[i++]));
      blocks.push(<div className="gi-md-table-wrap" key={blocks.length}><table><thead><tr>{headers.map((cell, n) => <th key={n}>{inlineMarkdown(cell)}</th>)}</tr></thead><tbody>{rows.map((row, n) => <tr key={n}>{headers.map((_, c) => <td key={c}>{inlineMarkdown(row[c] || "")}</td>)}</tr>)}</tbody></table></div>);
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, ""));
      blocks.push(<blockquote key={blocks.length}>{quote.map((item, n) => <p key={n}>{inlineMarkdown(item)}</p>)}</blockquote>);
      continue;
    }

    const listMatch = line.match(/^\s*(?:([-*+])|(\d+)\.)\s+(.+)$/);
    if (listMatch) {
      const ordered = Boolean(listMatch[2]);
      const items: string[] = [];
      while (i < lines.length) {
        const match = lines[i].match(/^\s*(?:([-*+])|(\d+)\.)\s+(.+)$/);
        if (!match || Boolean(match[2]) !== ordered) break;
        items.push(match[3]); i++;
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(<List key={blocks.length}>{items.map((item, n) => <li key={n}>{inlineMarkdown(item)}</li>)}</List>);
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^\s*(#{1,4}\s|\`\`\`|>|([-*+])\s+|\d+\.\s+|---+\s*$)/.test(lines[i])) {
      if (i + 1 < lines.length && lines[i].includes("|") && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) break;
      paragraph.push(lines[i++].trim());
    }
    if (!paragraph.length) { paragraph.push(lines[i++].trim()); }
    blocks.push(<p key={blocks.length}>{paragraph.map((part, n) => <Fragment key={n}>{n > 0 ? " " : ""}{inlineMarkdown(part)}</Fragment>)}</p>);
  }
  return <article className="gi-markdown-report">{blocks}</article>;
}
