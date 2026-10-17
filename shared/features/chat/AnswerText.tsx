import { Fragment, type ReactNode } from "react";

// Render a small, safe Markdown subset. Model text is never interpreted as HTML.
function inline(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g)
    .map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("`") && part.endsWith("`"))
        return <code key={index}>{part.slice(1, -1)}</code>;
      const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (link)
        return (
          <a key={index} href={link[2]} target="_blank" rel="noreferrer">
            {link[1]}
          </a>
        );
      return <Fragment key={index}>{part}</Fragment>;
    });
}
const heading = /^(#{1,4})\s+(.+)$/;
const listItem = /^\s*(?:([-*+])\s+|(\d+)[.)]\s+)(.+)$/;

export function AnswerText({ text }: { text: string }) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index++;
      continue;
    }
    if (line.startsWith("```")) {
      const code: string[] = [];
      index++;
      while (index < lines.length && !lines[index].startsWith("```"))
        code.push(lines[index++]);
      index++;
      blocks.push(
        <pre key={blocks.length}>
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }
    const title = line.match(heading);
    if (title) {
      blocks.push(
        title[1].length <= 2 ? (
          <h3 key={blocks.length}>{inline(title[2])}</h3>
        ) : (
          <h4 key={blocks.length}>{inline(title[2])}</h4>
        ),
      );
      index++;
      continue;
    }
    const firstItem = line.match(listItem);
    if (firstItem) {
      const ordered = Boolean(firstItem[2]);
      const items: ReactNode[] = [];
      while (index < lines.length) {
        const item = lines[index].match(listItem);
        if (!item || Boolean(item[2]) !== ordered) break;
        items.push(<li key={items.length}>{inline(item[3])}</li>);
        index++;
      }
      blocks.push(
        ordered ? (
          <ol key={blocks.length} start={Number(firstItem[2])}>
            {items}
          </ol>
        ) : (
          <ul key={blocks.length}>{items}</ul>
        ),
      );
      continue;
    }
    const paragraph = [line];
    index++;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !heading.test(lines[index]) &&
      !listItem.test(lines[index]) &&
      !lines[index].startsWith("```")
    )
      paragraph.push(lines[index++]);
    blocks.push(<p key={blocks.length}>{inline(paragraph.join("\n"))}</p>);
  }
  return <div className="answer-text">{blocks}</div>;
}
