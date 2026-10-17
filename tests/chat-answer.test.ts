import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AnswerText } from "../shared/features/chat/AnswerText";

test("Teacher explanations render readable headings, lists, emphasis and code without interpreting HTML", () => {
  const html = renderToStaticMarkup(
    createElement(AnswerText, {
      text: "## How it works\n\nA **GPU** does `parallel work`.\n\n1. Split the job\n2. Combine results\n\n- Pixels\n- Images\n\n```html\n<script>bad()</script>\n```",
    }),
  );
  assert.match(html, /<h3>How it works<\/h3>/);
  assert.match(html, /<strong>GPU<\/strong>/);
  assert.match(
    html,
    /<ol start="1"><li>Split the job<\/li><li>Combine results<\/li><\/ol>/,
  );
  assert.match(html, /<ul><li>Pixels<\/li><li>Images<\/li><\/ul>/);
  assert.match(html, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test("Teacher text accepts ordinary web links and keeps scripts and HTML as inert text", () => {
  const html = renderToStaticMarkup(
    createElement(AnswerText, {
      text: "[Reference](https://example.com/source)\n\n[Bad](javascript:alert(1)) <img src=x onerror=alert(1)>",
    }),
  );
  assert.match(html, /href="https:\/\/example.com\/source"/);
  assert.doesNotMatch(html, /href="javascript:|<img/);
  assert.match(html, /&lt;img/);
});
